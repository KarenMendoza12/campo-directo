// ============================================================
// MODELO DE PEDIDOS - CAMPO DIRECTO
// ============================================================

const { 
    executeQuery, 
    executeTransaction,
    findOne, 
    insert, 
    update, 
    deleteRecord,
    exists,
    count 
} = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Order {
    /**
     * Crear un nuevo pedido
     */
    static async create(orderData) {
        const {
            comprador_id,
            campesino_id,
            items, // Array de {producto_id, cantidad, precio_unitario, notas_producto}
            direccion_entrega,
            telefono_contacto,
            fecha_entrega_programada,
            hora_entrega_programada,
            metodo_pago = 'efectivo',
            notas_comprador
        } = orderData;

        try {
            // Generar ID único para el pedido
            const orderId = `ORD-${Date.now().toString().slice(-8).toUpperCase()}`;
            
            // Verificar disponibilidad de todos los productos
            const availabilityChecks = [];
            let total = 0;

            for (const item of items) {
                // Verificar que el producto existe y tiene stock
                const product = await findOne(`
                    SELECT 
                        id, nombre, precio_por_kg, stock_disponible, usuario_id,
                        peso_minimo_venta, peso_maximo_venta, estado
                    FROM productos 
                    WHERE id = ? AND estado IN ('disponible', 'temporada')
                `, [item.producto_id]);

                if (!product) {
                    throw new Error(`Producto con ID ${item.producto_id} no disponible`);
                }

                if (product.usuario_id !== campesino_id) {
                    throw new Error(`El producto ${product.nombre} no pertenece al campesino seleccionado`);
                }

                if (product.stock_disponible < item.cantidad) {
                    throw new Error(`Stock insuficiente para ${product.nombre}. Disponible: ${product.stock_disponible}`);
                }

                if (item.cantidad < product.peso_minimo_venta) {
                    throw new Error(`Cantidad mínima para ${product.nombre}: ${product.peso_minimo_venta}kg`);
                }

                if (item.cantidad > product.peso_maximo_venta) {
                    throw new Error(`Cantidad máxima para ${product.nombre}: ${product.peso_maximo_venta}kg`);
                }

                // Usar el precio actual del producto si no se especifica
                const precio_unitario = item.precio_unitario || product.precio_por_kg;
                const subtotal = precio_unitario * item.cantidad;
                total += subtotal;

                availabilityChecks.push({
                    ...item,
                    precio_unitario,
                    subtotal,
                    product
                });
            }

            // Crear las consultas para la transacción
            const transactionQueries = [];

            // 1. Insertar el pedido principal
            transactionQueries.push({
                query: `
                    INSERT INTO pedidos (
                        id, comprador_id, campesino_id, total, estado,
                        direccion_entrega, telefono_contacto, fecha_entrega_programada, 
                        hora_entrega_programada, metodo_pago, notas_comprador
                    ) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)
                `,
                params: [
                    orderId, comprador_id, campesino_id, total,
                    direccion_entrega, telefono_contacto, fecha_entrega_programada,
                    hora_entrega_programada, metodo_pago, notas_comprador
                ]
            });

            // 2. Insertar detalles del pedido
            for (const item of availabilityChecks) {
                transactionQueries.push({
                    query: `
                        INSERT INTO detalle_pedidos (
                            pedido_id, producto_id, cantidad, precio_unitario, subtotal, notas_producto
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    `,
                    params: [
                        orderId, item.producto_id, item.cantidad, 
                        item.precio_unitario, item.subtotal, item.notas_producto || null
                    ]
                });
            }

            // 3. Registrar actividad para el comprador
            transactionQueries.push({
                query: `
                    INSERT INTO actividades_recientes (
                        usuario_id, tipo, descripcion, entidad_tipo, entidad_id
                    ) VALUES (?, 'order', ?, 'pedido', ?)
                `,
                params: [
                    comprador_id, 
                    `Nuevo pedido realizado - $${total.toLocaleString()}`, 
                    orderId
                ]
            });

            // 4. Registrar actividad para el campesino
            transactionQueries.push({
                query: `
                    INSERT INTO actividades_recientes (
                        usuario_id, tipo, descripcion, entidad_tipo, entidad_id
                    ) VALUES (?, 'info', ?, 'pedido', ?)
                `,
                params: [
                    campesino_id, 
                    `Nuevo pedido recibido - ${items.length} productos`, 
                    orderId
                ]
            });

            // Ejecutar todas las consultas en una transacción
            await executeTransaction(transactionQueries);

            return await Order.findById(orderId);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Buscar pedido por ID
     */
    static async findById(id) {
        const order = await findOne(`
            SELECT 
                p.*,
                CONCAT(comprador.nombre, ' ', comprador.apellido) as nombre_comprador,
                comprador.telefono as telefono_comprador_alt,
                comprador.email as email_comprador,
                CONCAT(campesino.nombre, ' ', campesino.apellido) as nombre_campesino,
                campesino.telefono as telefono_campesino,
                campesino.email as email_campesino,
                f.nombre_finca,
                f.ubicacion_departamento,
                f.ubicacion_municipio
            FROM pedidos p
            JOIN usuarios comprador ON p.comprador_id = comprador.id
            JOIN usuarios campesino ON p.campesino_id = campesino.id
            LEFT JOIN fincas f ON campesino.id = f.usuario_id
            WHERE p.id = ?
        `, [id]);

        if (!order) {
            return null;
        }

        // Obtener detalles del pedido
        const details = await executeQuery(`
            SELECT 
                dp.*,
                pr.nombre as producto_nombre,
                pr.imagen_principal,
                pr.unidad_medida,
                c.nombre as categoria
            FROM detalle_pedidos dp
            JOIN productos pr ON dp.producto_id = pr.id
            JOIN categorias_productos c ON pr.categoria_id = c.id
            WHERE dp.pedido_id = ?
            ORDER BY dp.id
        `, [id]);

        return {
            ...order,
            items: details
        };
    }

    /**
     * Obtener pedidos con filtros
     */
    static async getOrders(filters = {}, page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        let whereConditions = [];
        let params = [];

        // Filtros base
        if (filters.usuario_id && filters.tipo_usuario) {
            if (filters.tipo_usuario === 'campesino') {
                whereConditions.push('p.campesino_id = ?');
                params.push(filters.usuario_id);
            } else {
                whereConditions.push('p.comprador_id = ?');
                params.push(filters.usuario_id);
            }
        }

        if (filters.estado) {
            if (Array.isArray(filters.estado)) {
                const placeholders = filters.estado.map(() => '?').join(',');
                whereConditions.push(`p.estado IN (${placeholders})`);
                params.push(...filters.estado);
            } else {
                whereConditions.push('p.estado = ?');
                params.push(filters.estado);
            }
        }

        if (filters.fecha_desde) {
            whereConditions.push('DATE(p.fecha_pedido) >= ?');
            params.push(filters.fecha_desde);
        }

        if (filters.fecha_hasta) {
            whereConditions.push('DATE(p.fecha_pedido) <= ?');
            params.push(filters.fecha_hasta);
        }

        if (filters.total_min) {
            whereConditions.push('p.total >= ?');
            params.push(parseFloat(filters.total_min));
        }

        if (filters.total_max) {
            whereConditions.push('p.total <= ?');
            params.push(parseFloat(filters.total_max));
        }

        const whereClause = whereConditions.length > 0 
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        // Consulta principal
        const query = `
            SELECT 
                p.id,
                p.total,
                p.estado,
                p.fecha_pedido,
                p.fecha_entrega_programada,
                p.metodo_pago,
                CONCAT(comprador.nombre, ' ', comprador.apellido) as nombre_comprador,
                comprador.telefono as telefono_comprador,
                CONCAT(campesino.nombre, ' ', campesino.apellido) as nombre_campesino,
                campesino.telefono as telefono_campesino,
                f.nombre_finca,
                (SELECT COUNT(*) FROM detalle_pedidos dp WHERE dp.pedido_id = p.id) as total_productos,
                (SELECT SUM(dp.cantidad) FROM detalle_pedidos dp WHERE dp.pedido_id = p.id) as cantidad_total
            FROM pedidos p
            JOIN usuarios comprador ON p.comprador_id = comprador.id
            JOIN usuarios campesino ON p.campesino_id = campesino.id
            LEFT JOIN fincas f ON campesino.id = f.usuario_id
            ${whereClause}
            ORDER BY p.fecha_pedido DESC
            LIMIT ? OFFSET ?
        `;

        const orders = await executeQuery(query, [...params, limit, offset]);

        // Obtener total para paginación
        const totalQuery = `
            SELECT COUNT(*) as total
            FROM pedidos p
            JOIN usuarios comprador ON p.comprador_id = comprador.id
            JOIN usuarios campesino ON p.campesino_id = campesino.id
            ${whereClause}
        `;
        const totalResult = await executeQuery(totalQuery, params);
        const total = totalResult[0].total;

        return {
            orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(total),
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Actualizar estado del pedido
     */
    static async updateStatus(orderId, newStatus, userId, userType, notas = null) {
        // Verificar que el pedido existe y el usuario tiene permisos
        const order = await findOne(`
            SELECT campesino_id, comprador_id, estado, total
            FROM pedidos 
            WHERE id = ?
        `, [orderId]);

        if (!order) {
            throw new Error('Pedido no encontrado');
        }

        // Verificar permisos
        const hasPermission = (
            (userType === 'campesino' && order.campesino_id === userId) ||
            (userType === 'comprador' && order.comprador_id === userId)
        );

        if (!hasPermission) {
            throw new Error('No tienes permisos para modificar este pedido');
        }

        // Validar transiciones de estado
        const validTransitions = {
            'pending': ['confirmed', 'cancelled'],
            'confirmed': ['preparing', 'cancelled'],
            'preparing': ['ready', 'cancelled'],
            'ready': ['completed'],
            'completed': [], // No se puede cambiar desde completed
            'cancelled': [] // No se puede cambiar desde cancelled
        };

        if (!validTransitions[order.estado].includes(newStatus)) {
            throw new Error(`No se puede cambiar de ${order.estado} a ${newStatus}`);
        }

        // Solo campesinos pueden cambiar a confirmed, preparing, ready
        const farmerOnlyStates = ['confirmed', 'preparing', 'ready'];
        if (farmerOnlyStates.includes(newStatus) && userType !== 'campesino') {
            throw new Error('Solo el campesino puede cambiar a este estado');
        }

        // Preparar datos de actualización
        const updateData = { estado: newStatus };
        
        if (newStatus === 'confirmed') {
            updateData.fecha_confirmacion = new Date();
        } else if (newStatus === 'preparing') {
            updateData.fecha_preparacion = new Date();
        } else if (newStatus === 'ready') {
            updateData.fecha_entrega = new Date();
        } else if (newStatus === 'completed') {
            updateData.fecha_completado = new Date();
        }

        if (notas) {
            if (userType === 'campesino') {
                updateData.notas_campesino = notas;
            } else {
                updateData.notas_comprador = notas;
            }
        }

        // Actualizar el pedido
        const affectedRows = await update('pedidos', updateData, 'id = ?', [orderId]);

        if (affectedRows === 0) {
            throw new Error('Error al actualizar el pedido');
        }

        // Si el pedido se completa, actualizar stock de productos
        if (newStatus === 'completed') {
            await Order.updateProductStock(orderId);
        }

        // Registrar actividad
        const activityData = {
            usuario_id: userId,
            tipo: newStatus === 'completed' ? 'completed' : 'info',
            descripcion: `Pedido ${orderId} marcado como ${newStatus}`,
            entidad_tipo: 'pedido',
            entidad_id: orderId
        };

        await insert('actividades_recientes', activityData);

        // Registrar actividad para la otra parte
        const otherUserId = userType === 'campesino' ? order.comprador_id : order.campesino_id;
        await insert('actividades_recientes', {
            ...activityData,
            usuario_id: otherUserId,
            descripcion: `Pedido ${orderId} actualizado a ${newStatus}`
        });

        return await Order.findById(orderId);
    }

    /**
     * Actualizar stock de productos cuando se completa un pedido
     */
    static async updateProductStock(orderId) {
        const items = await executeQuery(`
            SELECT producto_id, cantidad
            FROM detalle_pedidos
            WHERE pedido_id = ?
        `, [orderId]);

        const updateQueries = items.map(item => ({
            query: `
                UPDATE productos 
                SET 
                    stock_disponible = GREATEST(0, stock_disponible - ?),
                    estado = CASE 
                        WHEN (stock_disponible - ?) <= 0 THEN 'agotado'
                        ELSE estado
                    END,
                    fecha_actualizacion = NOW()
                WHERE id = ?
            `,
            params: [item.cantidad, item.cantidad, item.producto_id]
        }));

        await executeTransaction(updateQueries);
    }

    /**
     * Cancelar pedido
     */
    static async cancelOrder(orderId, userId, userType, motivo = null) {
        return await Order.updateStatus(orderId, 'cancelled', userId, userType, motivo);
    }

    /**
     * Calificar pedido
     */
    static async rateOrder(orderId, userId, userType, calificacion, comentario = null) {
        // Verificar que el pedido existe y está completado
        const order = await findOne(`
            SELECT campesino_id, comprador_id, estado, calificacion_comprador, calificacion_campesino
            FROM pedidos 
            WHERE id = ?
        `, [orderId]);

        if (!order) {
            throw new Error('Pedido no encontrado');
        }

        if (order.estado !== 'completed') {
            throw new Error('Solo se pueden calificar pedidos completados');
        }

        // Verificar permisos y que no haya calificado ya
        let updateField, targetUserId, hasRated;
        
        if (userType === 'comprador' && order.comprador_id === userId) {
            updateField = 'calificacion_campesino';
            targetUserId = order.campesino_id;
            hasRated = order.calificacion_campesino !== null;
        } else if (userType === 'campesino' && order.campesino_id === userId) {
            updateField = 'calificacion_comprador';
            targetUserId = order.comprador_id;
            hasRated = order.calificacion_comprador !== null;
        } else {
            throw new Error('No tienes permisos para calificar este pedido');
        }

        if (hasRated) {
            throw new Error('Ya has calificado este pedido');
        }

        if (calificacion < 1 || calificacion > 5) {
            throw new Error('La calificación debe estar entre 1 y 5');
        }

        // Actualizar el pedido
        const updateData = {
            [updateField]: calificacion,
            comentario_calificacion: comentario
        };

        await update('pedidos', updateData, 'id = ?', [orderId]);

        // Actualizar calificación promedio del usuario calificado
        const User = require('./User');
        await User.updateRating(targetUserId, calificacion);

        // Registrar actividad
        await insert('actividades_recientes', {
            usuario_id: userId,
            tipo: 'success',
            descripcion: `Calificación enviada: ${calificacion} estrellas`,
            entidad_tipo: 'pedido',
            entidad_id: orderId
        });

        return await Order.findById(orderId);
    }

    /**
     * Obtener estadísticas de pedidos
     */
    static async getOrderStats(userId, userType) {
        let query;
        
        if (userType === 'campesino') {
            query = `
                SELECT 
                    COUNT(*) as total_pedidos,
                    COUNT(CASE WHEN estado = 'pending' THEN 1 END) as pendientes,
                    COUNT(CASE WHEN estado = 'confirmed' THEN 1 END) as confirmados,
                    COUNT(CASE WHEN estado = 'preparing' THEN 1 END) as preparando,
                    COUNT(CASE WHEN estado = 'ready' THEN 1 END) as listos,
                    COUNT(CASE WHEN estado = 'completed' THEN 1 END) as completados,
                    COUNT(CASE WHEN estado = 'cancelled' THEN 1 END) as cancelados,
                    COALESCE(SUM(CASE WHEN estado = 'completed' THEN total ELSE 0 END), 0) as total_ventas,
                    COALESCE(SUM(CASE 
                        WHEN estado = 'completed' 
                        AND MONTH(fecha_completado) = MONTH(CURRENT_DATE)
                        AND YEAR(fecha_completado) = YEAR(CURRENT_DATE)
                        THEN total ELSE 0 
                    END), 0) as ventas_mes_actual,
                    COALESCE(AVG(CASE WHEN calificacion_campesino IS NOT NULL THEN calificacion_campesino END), 0) as calificacion_promedio
                FROM pedidos
                WHERE campesino_id = ?
            `;
        } else {
            query = `
                SELECT 
                    COUNT(*) as total_pedidos,
                    COUNT(CASE WHEN estado IN ('pending', 'confirmed', 'preparing', 'ready') THEN 1 END) as pedidos_activos,
                    COUNT(CASE WHEN estado = 'completed' THEN 1 END) as completados,
                    COUNT(CASE WHEN estado = 'cancelled' THEN 1 END) as cancelados,
                    COALESCE(SUM(CASE WHEN estado = 'completed' THEN total ELSE 0 END), 0) as total_gastado,
                    COALESCE(SUM(CASE 
                        WHEN estado = 'completed' 
                        AND MONTH(fecha_completado) = MONTH(CURRENT_DATE)
                        AND YEAR(fecha_completado) = YEAR(CURRENT_DATE)
                        THEN total ELSE 0 
                    END), 0) as gastado_mes_actual,
                    COUNT(DISTINCT campesino_id) as campesinos_contactados
                FROM pedidos
                WHERE comprador_id = ?
            `;
        }

        const stats = await executeQuery(query, [userId]);
        return stats[0];
    }

    /**
     * Obtener historial de pedidos de un producto
     */
    static async getProductOrderHistory(productId, limit = 10) {
        return await executeQuery(`
            SELECT 
                p.id,
                p.fecha_pedido,
                p.estado,
                dp.cantidad,
                dp.precio_unitario,
                dp.subtotal,
                CONCAT(u.nombre, ' ', u.apellido) as comprador
            FROM pedidos p
            JOIN detalle_pedidos dp ON p.id = dp.pedido_id
            JOIN usuarios u ON p.comprador_id = u.id
            WHERE dp.producto_id = ?
            ORDER BY p.fecha_pedido DESC
            LIMIT ?
        `, [productId, limit]);
    }

    /**
     * Verificar si un usuario puede calificar un pedido
     */
    static async canRate(orderId, userId, userType) {
        const order = await findOne(`
            SELECT 
                campesino_id, comprador_id, estado, 
                calificacion_comprador, calificacion_campesino
            FROM pedidos 
            WHERE id = ?
        `, [orderId]);

        if (!order || order.estado !== 'completed') {
            return false;
        }

        if (userType === 'comprador' && order.comprador_id === userId) {
            return order.calificacion_campesino === null;
        }

        if (userType === 'campesino' && order.campesino_id === userId) {
            return order.calificacion_comprador === null;
        }

        return false;
    }
}

module.exports = Order;