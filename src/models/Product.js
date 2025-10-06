// ============================================================
// MODELO DE PRODUCTOS - CAMPO DIRECTO
// ============================================================

const { 
    executeQuery, 
    findOne, 
    insert, 
    update, 
    deleteRecord,
    exists,
    count 
} = require('../config/database');

class Product {
    /**
     * Crear un nuevo producto
     */
    static async create(productData) {
        const {
            usuario_id,
            finca_id,
            categoria_id,
            nombre,
            descripcion,
            precio_por_kg,
            stock_disponible,
            unidad_medida = 'kg',
            estado = 'disponible',
            tags = '',
            calidad = 'primera',
            fecha_cosecha,
            fecha_vencimiento,
            peso_minimo_venta = 0.5,
            peso_maximo_venta = 100.0,
            disponible_entrega_inmediata = true,
            tiempo_preparacion_dias = 1,
            imagen_principal,
            galeria_imagenes
        } = productData;

        try {
            // Verificar que la finca pertenece al usuario
            const fincaExists = await exists(
                'fincas', 
                'id = ? AND usuario_id = ?', 
                [finca_id, usuario_id]
            );

            if (!fincaExists) {
                throw new Error('La finca no existe o no pertenece al usuario');
            }

            // Verificar que la categoría existe
            const categoriaExists = await exists(
                'categorias_productos', 
                'id = ? AND estado = "activo"', 
                [categoria_id]
            );

            if (!categoriaExists) {
                throw new Error('La categoría no existe o está inactiva');
            }

            const productId = await insert('productos', {
                usuario_id,
                finca_id,
                categoria_id,
                nombre,
                descripcion,
                precio_por_kg,
                stock_disponible,
                unidad_medida,
                estado,
                tags,
                calidad,
                fecha_cosecha,
                fecha_vencimiento,
                peso_minimo_venta,
                peso_maximo_venta,
                disponible_entrega_inmediata,
                tiempo_preparacion_dias,
                imagen_principal,
                galeria_imagenes: galeria_imagenes ? JSON.stringify(galeria_imagenes) : null
            });

            // Registrar actividad
            await insert('actividades_recientes', {
                usuario_id,
                tipo: 'product',
                descripcion: `Nuevo producto agregado - ${nombre}`,
                entidad_tipo: 'producto',
                entidad_id: productId.toString()
            });

            return await Product.findById(productId);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Buscar producto por ID
     */
    static async findById(id) {
        return await findOne(`
            SELECT 
                p.*,
                c.nombre as categoria,
                c.descripcion as categoria_descripcion,
                c.icono as categoria_icono,
                CONCAT(u.nombre, ' ', u.apellido) as campesino,
                u.calificacion_promedio as calificacion_campesino,
                u.total_calificaciones,
                u.telefono as telefono_campesino,
                u.email as email_campesino,
                f.nombre_finca,
                f.ubicacion_departamento,
                f.ubicacion_municipio,
                f.direccion as direccion_finca,
                f.tipo_cultivo,
                f.area_hectareas,
                f.latitud,
                f.longitud
            FROM productos p
            JOIN categorias_productos c ON p.categoria_id = c.id
            JOIN usuarios u ON p.usuario_id = u.id
            LEFT JOIN fincas f ON p.finca_id = f.id
            WHERE p.id = ?
        `, [id]);
    }

    /**
     * Obtener productos con filtros y paginación
     */
    static async getProducts(filters = {}, page = 1, limit = 12) {
        const offset = (page - 1) * limit;
        let whereConditions = ['p.estado IN ("disponible", "temporada")'];
        let params = [];

        // Aplicar filtros
        if (filters.categoria_id) {
            whereConditions.push('p.categoria_id = ?');
            params.push(filters.categoria_id);
        }

        if (filters.usuario_id) {
            whereConditions.push('p.usuario_id = ?');
            params.push(filters.usuario_id);
        }

        if (filters.precio_min) {
            whereConditions.push('p.precio_por_kg >= ?');
            params.push(parseFloat(filters.precio_min));
        }

        if (filters.precio_max) {
            whereConditions.push('p.precio_por_kg <= ?');
            params.push(parseFloat(filters.precio_max));
        }

        if (filters.departamento) {
            whereConditions.push('f.ubicacion_departamento = ?');
            params.push(filters.departamento);
        }

        if (filters.municipio) {
            whereConditions.push('f.ubicacion_municipio = ?');
            params.push(filters.municipio);
        }

        if (filters.calidad) {
            whereConditions.push('p.calidad = ?');
            params.push(filters.calidad);
        }

        if (filters.search) {
            whereConditions.push('(p.nombre LIKE ? OR p.descripcion LIKE ? OR p.tags LIKE ?)');
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        if (filters.stock_minimo) {
            whereConditions.push('p.stock_disponible >= ?');
            params.push(parseInt(filters.stock_minimo));
        }

        const whereClause = whereConditions.join(' AND ');

        // Consulta principal
        const query = `
            SELECT 
                p.id,
                p.nombre,
                p.descripcion,
                p.precio_por_kg,
                p.stock_disponible,
                p.unidad_medida,
                p.estado,
                p.imagen_principal,
                p.tags,
                p.calidad,
                p.fecha_cosecha,
                p.peso_minimo_venta,
                p.peso_maximo_venta,
                p.disponible_entrega_inmediata,
                p.tiempo_preparacion_dias,
                p.fecha_actualizacion,
                c.nombre as categoria,
                c.icono as categoria_icono,
                CONCAT(u.nombre, ' ', u.apellido) as campesino,
                u.calificacion_promedio as calificacion_campesino,
                f.nombre_finca,
                f.ubicacion_departamento,
                f.ubicacion_municipio,
                f.tipo_cultivo
            FROM productos p
            JOIN categorias_productos c ON p.categoria_id = c.id
            JOIN usuarios u ON p.usuario_id = u.id
            LEFT JOIN fincas f ON p.finca_id = f.id
            WHERE ${whereClause}
            ORDER BY p.fecha_actualizacion DESC
            LIMIT ? OFFSET ?
        `;

        const products = await executeQuery(query, [...params, limit, offset]);

        // Procesar galería de imágenes
        products.forEach(product => {
            if (product.galeria_imagenes) {
                try {
                    product.galeria_imagenes = JSON.parse(product.galeria_imagenes);
                } catch (e) {
                    product.galeria_imagenes = [];
                }
            } else {
                product.galeria_imagenes = [];
            }
        });

        // Obtener total para paginación
        const totalQuery = `
            SELECT COUNT(*) as total
            FROM productos p
            JOIN categorias_productos c ON p.categoria_id = c.id
            JOIN usuarios u ON p.usuario_id = u.id
            LEFT JOIN fincas f ON p.finca_id = f.id
            WHERE ${whereClause}
        `;
        const totalResult = await executeQuery(totalQuery, params);
        const total = totalResult[0].total;

        return {
            products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(total),
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Actualizar producto
     */
    static async updateProduct(id, userId, updateData) {
        // Verificar que el producto pertenece al usuario
        const product = await findOne(
            'SELECT usuario_id FROM productos WHERE id = ?', 
            [id]
        );

        if (!product) {
            throw new Error('Producto no encontrado');
        }

        if (product.usuario_id !== userId) {
            throw new Error('No tienes permisos para modificar este producto');
        }

        const allowedFields = [
            'nombre', 'descripcion', 'precio_por_kg', 'stock_disponible', 
            'estado', 'tags', 'calidad', 'fecha_cosecha', 'fecha_vencimiento',
            'peso_minimo_venta', 'peso_maximo_venta', 'disponible_entrega_inmediata',
            'tiempo_preparacion_dias', 'imagen_principal'
        ];

        const updateObj = {};
        
        // Filtrar solo campos permitidos
        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                updateObj[field] = updateData[field];
            }
        }

        // Manejar galería de imágenes
        if (updateData.galeria_imagenes !== undefined) {
            updateObj.galeria_imagenes = Array.isArray(updateData.galeria_imagenes) 
                ? JSON.stringify(updateData.galeria_imagenes) 
                : null;
        }

        if (Object.keys(updateObj).length === 0) {
            throw new Error('No hay campos válidos para actualizar');
        }

        updateObj.fecha_actualizacion = new Date();

        const affectedRows = await update('productos', updateObj, 'id = ?', [id]);
        
        if (affectedRows === 0) {
            throw new Error('Error al actualizar producto');
        }

        // Registrar actividad
        await insert('actividades_recientes', {
            usuario_id: userId,
            tipo: 'product',
            descripcion: `Producto actualizado - ${updateData.nombre || 'Sin nombre'}`,
            entidad_tipo: 'producto',
            entidad_id: id.toString()
        });

        return await Product.findById(id);
    }

    /**
     * Actualizar stock de producto
     */
    static async updateStock(id, newStock, userId) {
        const affectedRows = await update('productos', {
            stock_disponible: newStock,
            estado: newStock <= 0 ? 'agotado' : 'disponible',
            fecha_actualizacion: new Date()
        }, 'id = ? AND usuario_id = ?', [id, userId]);

        if (affectedRows === 0) {
            throw new Error('Producto no encontrado o sin permisos');
        }

        // Registrar actividad
        await insert('actividades_recientes', {
            usuario_id: userId,
            tipo: newStock <= 0 ? 'warning' : 'success',
            descripcion: `Stock actualizado: ${newStock} unidades`,
            entidad_tipo: 'producto',
            entidad_id: id.toString()
        });

        return true;
    }

    /**
     * Eliminar producto (soft delete)
     */
    static async deleteProduct(id, userId) {
        // Verificar permisos
        const product = await findOne(
            'SELECT usuario_id, nombre FROM productos WHERE id = ?', 
            [id]
        );

        if (!product) {
            throw new Error('Producto no encontrado');
        }

        if (product.usuario_id !== userId) {
            throw new Error('No tienes permisos para eliminar este producto');
        }

        const affectedRows = await update('productos', {
            estado: 'inactivo',
            fecha_actualizacion: new Date()
        }, 'id = ?', [id]);

        if (affectedRows === 0) {
            throw new Error('Error al eliminar producto');
        }

        // Registrar actividad
        await insert('actividades_recientes', {
            usuario_id: userId,
            tipo: 'warning',
            descripcion: `Producto eliminado - ${product.nombre}`,
            entidad_tipo: 'producto',
            entidad_id: id.toString()
        });

        return true;
    }

    /**
     * Obtener productos de un campesino
     */
    static async getProductsByFarmer(userId, filters = {}) {
        const updatedFilters = { ...filters, usuario_id: userId };
        return await Product.getProducts(updatedFilters, filters.page, filters.limit);
    }

    /**
     * Buscar productos por texto
     */
    static async searchProducts(searchTerm, filters = {}) {
        const updatedFilters = { ...filters, search: searchTerm };
        return await Product.getProducts(updatedFilters, filters.page, filters.limit);
    }

    /**
     * Obtener productos relacionados
     */
    static async getRelatedProducts(productId, limit = 4) {
        const product = await findOne(
            'SELECT categoria_id, usuario_id FROM productos WHERE id = ?',
            [productId]
        );

        if (!product) {
            return [];
        }

        return await executeQuery(`
            SELECT 
                p.id,
                p.nombre,
                p.precio_por_kg,
                p.imagen_principal,
                p.calidad,
                CONCAT(u.nombre, ' ', u.apellido) as campesino,
                f.ubicacion_departamento
            FROM productos p
            JOIN usuarios u ON p.usuario_id = u.id
            LEFT JOIN fincas f ON p.finca_id = f.id
            WHERE p.categoria_id = ? 
            AND p.id != ? 
            AND p.estado = 'disponible'
            AND p.usuario_id != ?
            ORDER BY p.fecha_actualizacion DESC
            LIMIT ?
        `, [product.categoria_id, productId, product.usuario_id, limit]);
    }

    /**
     * Obtener estadísticas de productos
     */
    static async getProductStats(userId) {
        return await executeQuery(`
            SELECT 
                COUNT(*) as total_productos,
                COUNT(CASE WHEN estado = 'disponible' THEN 1 END) as productos_activos,
                COUNT(CASE WHEN estado = 'agotado' THEN 1 END) as productos_agotados,
                COUNT(CASE WHEN estado = 'temporada' THEN 1 END) as productos_temporada,
                AVG(precio_por_kg) as precio_promedio,
                SUM(stock_disponible) as stock_total,
                MAX(fecha_actualizacion) as ultima_actualizacion
            FROM productos
            WHERE usuario_id = ? AND estado != 'inactivo'
        `, [userId]);
    }

    /**
     * Verificar disponibilidad para pedido
     */
    static async checkAvailability(productId, quantity) {
        const product = await findOne(`
            SELECT 
                stock_disponible,
                estado,
                peso_minimo_venta,
                peso_maximo_venta,
                disponible_entrega_inmediata
            FROM productos 
            WHERE id = ? AND estado IN ('disponible', 'temporada')
        `, [productId]);

        if (!product) {
            return { available: false, reason: 'Producto no disponible' };
        }

        if (product.stock_disponible < quantity) {
            return { 
                available: false, 
                reason: `Stock insuficiente. Disponible: ${product.stock_disponible}` 
            };
        }

        if (quantity < product.peso_minimo_venta) {
            return { 
                available: false, 
                reason: `Cantidad mínima: ${product.peso_minimo_venta}kg` 
            };
        }

        if (quantity > product.peso_maximo_venta) {
            return { 
                available: false, 
                reason: `Cantidad máxima: ${product.peso_maximo_venta}kg` 
            };
        }

        return { available: true, product };
    }
}

module.exports = Product;