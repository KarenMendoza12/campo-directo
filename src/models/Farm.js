// ============================================================
// MODELO DE FINCAS - CAMPO DIRECTO
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

class Farm {
    /**
     * Crear una nueva finca
     */
    static async create(farmData) {
        const {
            usuario_id,
            nombre_finca,
            ubicacion_departamento,
            ubicacion_municipio,
            direccion,
            area_hectareas,
            tipo_cultivo = 'organico',
            descripcion,
            latitud,
            longitud
        } = farmData;

        try {
            // Verificar que el usuario sea campesino
            const user = await findOne(
                'SELECT tipo_usuario FROM usuarios WHERE id = ? AND estado = "activo"',
                [usuario_id]
            );

            if (!user) {
                throw new Error('Usuario no encontrado o inactivo');
            }

            if (user.tipo_usuario !== 'campesino') {
                throw new Error('Solo los campesinos pueden crear fincas');
            }

            // Verificar que el usuario no tenga ya una finca activa
            const existingFarm = await exists(
                'fincas', 
                'usuario_id = ? AND estado = "activa"', 
                [usuario_id]
            );

            if (existingFarm) {
                throw new Error('El usuario ya tiene una finca activa registrada');
            }

            const farmId = await insert('fincas', {
                usuario_id,
                nombre_finca,
                ubicacion_departamento,
                ubicacion_municipio,
                direccion,
                area_hectareas,
                tipo_cultivo,
                descripcion,
                latitud: latitud ? parseFloat(latitud) : null,
                longitud: longitud ? parseFloat(longitud) : null,
                estado: 'activa'
            });

            // Registrar actividad
            await insert('actividades_recientes', {
                usuario_id,
                tipo: 'success',
                descripcion: `Nueva finca registrada - ${nombre_finca}`,
                entidad_tipo: 'finca',
                entidad_id: farmId.toString()
            });

            return await Farm.findById(farmId);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Buscar finca por ID
     */
    static async findById(id) {
        const farm = await findOne(`
            SELECT 
                f.*,
                CONCAT(u.nombre, ' ', u.apellido) as propietario,
                u.email as email_propietario,
                u.telefono as telefono_propietario,
                u.calificacion_promedio as calificacion_propietario,
                (SELECT COUNT(*) FROM productos p WHERE p.finca_id = f.id AND p.estado != 'inactivo') as total_productos,
                (SELECT COUNT(*) FROM certificaciones c WHERE c.finca_id = f.id AND c.estado = 'vigente') as total_certificaciones
            FROM fincas f
            JOIN usuarios u ON f.usuario_id = u.id
            WHERE f.id = ?
        `, [id]);

        if (!farm) {
            return null;
        }

        // Obtener certificaciones de la finca
        const certificaciones = await executeQuery(`
            SELECT 
                id,
                nombre,
                descripcion,
                entidad_certificadora,
                fecha_obtencion,
                fecha_vencimiento,
                estado,
                archivo_certificado
            FROM certificaciones
            WHERE finca_id = ?
            ORDER BY fecha_obtencion DESC
        `, [id]);

        return {
            ...farm,
            certificaciones
        };
    }

    /**
     * Buscar finca por usuario
     */
    static async findByUserId(userId) {
        const farm = await findOne(`
            SELECT 
                f.*,
                (SELECT COUNT(*) FROM productos p WHERE p.finca_id = f.id AND p.estado != 'inactivo') as total_productos,
                (SELECT COUNT(*) FROM certificaciones c WHERE c.finca_id = f.id AND c.estado = 'vigente') as total_certificaciones
            FROM fincas f
            WHERE f.usuario_id = ? AND f.estado = 'activa'
        `, [userId]);

        if (!farm) {
            return null;
        }

        // Obtener certificaciones
        const certificaciones = await executeQuery(`
            SELECT *
            FROM certificaciones
            WHERE finca_id = ?
            ORDER BY fecha_obtencion DESC
        `, [farm.id]);

        return {
            ...farm,
            certificaciones
        };
    }

    /**
     * Obtener fincas con filtros y paginación
     */
    static async getFarms(filters = {}, page = 1, limit = 12) {
        const offset = (page - 1) * limit;
        let whereConditions = ['f.estado = "activa"'];
        let params = [];

        // Aplicar filtros
        if (filters.departamento) {
            whereConditions.push('f.ubicacion_departamento = ?');
            params.push(filters.departamento);
        }

        if (filters.municipio) {
            whereConditions.push('f.ubicacion_municipio = ?');
            params.push(filters.municipio);
        }

        if (filters.tipo_cultivo) {
            whereConditions.push('f.tipo_cultivo = ?');
            params.push(filters.tipo_cultivo);
        }

        if (filters.area_min) {
            whereConditions.push('f.area_hectareas >= ?');
            params.push(parseFloat(filters.area_min));
        }

        if (filters.area_max) {
            whereConditions.push('f.area_hectareas <= ?');
            params.push(parseFloat(filters.area_max));
        }

        if (filters.con_certificaciones) {
            whereConditions.push('EXISTS (SELECT 1 FROM certificaciones c WHERE c.finca_id = f.id AND c.estado = "vigente")');
        }

        if (filters.calificacion_min) {
            whereConditions.push('u.calificacion_promedio >= ?');
            params.push(parseFloat(filters.calificacion_min));
        }

        if (filters.search) {
            whereConditions.push('(f.nombre_finca LIKE ? OR f.descripcion LIKE ? OR CONCAT(u.nombre, " ", u.apellido) LIKE ?)');
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        const whereClause = whereConditions.join(' AND ');

        // Consulta principal
        const query = `
            SELECT 
                f.id,
                f.nombre_finca,
                f.ubicacion_departamento,
                f.ubicacion_municipio,
                f.area_hectareas,
                f.tipo_cultivo,
                f.descripcion,
                f.latitud,
                f.longitud,
                f.fecha_creacion,
                CONCAT(u.nombre, ' ', u.apellido) as propietario,
                u.calificacion_promedio as calificacion_propietario,
                u.total_calificaciones,
                (SELECT COUNT(*) FROM productos p WHERE p.finca_id = f.id AND p.estado = 'disponible') as productos_disponibles,
                (SELECT COUNT(*) FROM certificaciones c WHERE c.finca_id = f.id AND c.estado = 'vigente') as total_certificaciones
            FROM fincas f
            JOIN usuarios u ON f.usuario_id = u.id
            WHERE ${whereClause}
            ORDER BY u.calificacion_promedio DESC, f.fecha_creacion DESC
            LIMIT ? OFFSET ?
        `;

        const farms = await executeQuery(query, [...params, limit, offset]);

        // Obtener certificaciones principales para cada finca
        for (const farm of farms) {
            const certificaciones = await executeQuery(`
                SELECT nombre, entidad_certificadora
                FROM certificaciones
                WHERE finca_id = ? AND estado = 'vigente'
                ORDER BY fecha_obtencion DESC
                LIMIT 3
            `, [farm.id]);

            farm.certificaciones_principales = certificaciones;
        }

        // Obtener total para paginación
        const totalQuery = `
            SELECT COUNT(*) as total
            FROM fincas f
            JOIN usuarios u ON f.usuario_id = u.id
            WHERE ${whereClause}
        `;
        const totalResult = await executeQuery(totalQuery, params);
        const total = totalResult[0].total;

        return {
            farms,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(total),
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Actualizar información de finca
     */
    static async updateFarm(id, userId, updateData) {
        // Verificar que la finca pertenece al usuario
        const farm = await findOne(
            'SELECT usuario_id FROM fincas WHERE id = ?', 
            [id]
        );

        if (!farm) {
            throw new Error('Finca no encontrada');
        }

        if (farm.usuario_id !== userId) {
            throw new Error('No tienes permisos para modificar esta finca');
        }

        const allowedFields = [
            'nombre_finca', 'ubicacion_departamento', 'ubicacion_municipio', 
            'direccion', 'area_hectareas', 'tipo_cultivo', 'descripcion',
            'latitud', 'longitud'
        ];

        const updateObj = {};
        
        // Filtrar solo campos permitidos
        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                if (field === 'latitud' || field === 'longitud') {
                    updateObj[field] = updateData[field] ? parseFloat(updateData[field]) : null;
                } else {
                    updateObj[field] = updateData[field];
                }
            }
        }

        if (Object.keys(updateObj).length === 0) {
            throw new Error('No hay campos válidos para actualizar');
        }

        updateObj.fecha_actualizacion = new Date();

        const affectedRows = await update('fincas', updateObj, 'id = ?', [id]);
        
        if (affectedRows === 0) {
            throw new Error('Error al actualizar finca');
        }

        // Registrar actividad
        await insert('actividades_recientes', {
            usuario_id: userId,
            tipo: 'info',
            descripcion: `Información de finca actualizada - ${updateData.nombre_finca || 'Sin nombre'}`,
            entidad_tipo: 'finca',
            entidad_id: id.toString()
        });

        return await Farm.findById(id);
    }

    /**
     * Agregar certificación a la finca
     */
    static async addCertification(fincaId, userId, certificationData) {
        // Verificar que la finca pertenece al usuario
        const farm = await findOne(
            'SELECT usuario_id, nombre_finca FROM fincas WHERE id = ?', 
            [fincaId]
        );

        if (!farm) {
            throw new Error('Finca no encontrada');
        }

        if (farm.usuario_id !== userId) {
            throw new Error('No tienes permisos para modificar esta finca');
        }

        const {
            nombre,
            descripcion,
            entidad_certificadora,
            fecha_obtencion,
            fecha_vencimiento,
            archivo_certificado
        } = certificationData;

        const certId = await insert('certificaciones', {
            finca_id: fincaId,
            nombre,
            descripcion,
            entidad_certificadora,
            fecha_obtencion,
            fecha_vencimiento,
            estado: 'vigente',
            archivo_certificado
        });

        // Registrar actividad
        await insert('actividades_recientes', {
            usuario_id: userId,
            tipo: 'success',
            descripcion: `Nueva certificación agregada - ${nombre}`,
            entidad_tipo: 'finca',
            entidad_id: fincaId.toString()
        });

        return await executeQuery(
            'SELECT * FROM certificaciones WHERE id = ?', 
            [certId]
        );
    }

    /**
     * Actualizar certificación
     */
    static async updateCertification(certId, userId, updateData) {
        // Verificar que la certificación existe y pertenece al usuario
        const cert = await findOne(`
            SELECT c.*, f.usuario_id
            FROM certificaciones c
            JOIN fincas f ON c.finca_id = f.id
            WHERE c.id = ?
        `, [certId]);

        if (!cert) {
            throw new Error('Certificación no encontrada');
        }

        if (cert.usuario_id !== userId) {
            throw new Error('No tienes permisos para modificar esta certificación');
        }

        const allowedFields = [
            'nombre', 'descripcion', 'entidad_certificadora', 
            'fecha_obtencion', 'fecha_vencimiento', 'estado', 'archivo_certificado'
        ];

        const updateObj = {};
        
        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                updateObj[field] = updateData[field];
            }
        }

        if (Object.keys(updateObj).length === 0) {
            throw new Error('No hay campos válidos para actualizar');
        }

        const affectedRows = await update('certificaciones', updateObj, 'id = ?', [certId]);
        
        if (affectedRows === 0) {
            throw new Error('Error al actualizar certificación');
        }

        return await executeQuery(
            'SELECT * FROM certificaciones WHERE id = ?', 
            [certId]
        );
    }

    /**
     * Eliminar certificación
     */
    static async deleteCertification(certId, userId) {
        // Verificar permisos
        const cert = await findOne(`
            SELECT c.nombre, f.usuario_id
            FROM certificaciones c
            JOIN fincas f ON c.finca_id = f.id
            WHERE c.id = ?
        `, [certId]);

        if (!cert) {
            throw new Error('Certificación no encontrada');
        }

        if (cert.usuario_id !== userId) {
            throw new Error('No tienes permisos para eliminar esta certificación');
        }

        const affectedRows = await deleteRecord('certificaciones', 'id = ?', [certId]);

        if (affectedRows === 0) {
            throw new Error('Error al eliminar certificación');
        }

        // Registrar actividad
        await insert('actividades_recientes', {
            usuario_id: userId,
            tipo: 'warning',
            descripcion: `Certificación eliminada - ${cert.nombre}`,
            entidad_tipo: 'finca',
            entidad_id: certId.toString()
        });

        return true;
    }

    /**
     * Obtener estadísticas de la finca
     */
    static async getFarmStats(fincaId) {
        return await executeQuery(`
            SELECT 
                (SELECT COUNT(*) FROM productos WHERE finca_id = ? AND estado != 'inactivo') as total_productos,
                (SELECT COUNT(*) FROM productos WHERE finca_id = ? AND estado = 'disponible') as productos_disponibles,
                (SELECT COUNT(*) FROM productos WHERE finca_id = ? AND estado = 'agotado') as productos_agotados,
                (SELECT COUNT(*) FROM certificaciones WHERE finca_id = ? AND estado = 'vigente') as certificaciones_vigentes,
                (SELECT COUNT(*) FROM certificaciones WHERE finca_id = ? AND estado = 'vencida') as certificaciones_vencidas,
                (SELECT COUNT(DISTINCT p.comprador_id) 
                 FROM pedidos p 
                 JOIN detalle_pedidos dp ON p.id = dp.pedido_id
                 JOIN productos pr ON dp.producto_id = pr.id
                 WHERE pr.finca_id = ? AND p.estado = 'completed') as clientes_unicos,
                (SELECT COUNT(*) 
                 FROM pedidos p 
                 JOIN detalle_pedidos dp ON p.id = dp.pedido_id
                 JOIN productos pr ON dp.producto_id = pr.id
                 WHERE pr.finca_id = ? AND p.estado = 'completed') as pedidos_completados
        `, [fincaId, fincaId, fincaId, fincaId, fincaId, fincaId, fincaId]);
    }

    /**
     * Obtener fincas cercanas
     */
    static async getNearbyFarms(latitud, longitud, radiusKm = 50, limit = 10) {
        if (!latitud || !longitud) {
            throw new Error('Coordenadas requeridas');
        }

        return await executeQuery(`
            SELECT 
                f.id,
                f.nombre_finca,
                f.ubicacion_departamento,
                f.ubicacion_municipio,
                f.latitud,
                f.longitud,
                f.tipo_cultivo,
                CONCAT(u.nombre, ' ', u.apellido) as propietario,
                u.calificacion_promedio,
                (SELECT COUNT(*) FROM productos p WHERE p.finca_id = f.id AND p.estado = 'disponible') as productos_disponibles,
                (6371 * acos(cos(radians(?)) * cos(radians(f.latitud)) * cos(radians(f.longitud) - radians(?)) + sin(radians(?)) * sin(radians(f.latitud)))) AS distancia_km
            FROM fincas f
            JOIN usuarios u ON f.usuario_id = u.id
            WHERE f.estado = 'activa'
            AND f.latitud IS NOT NULL
            AND f.longitud IS NOT NULL
            HAVING distancia_km <= ?
            ORDER BY distancia_km ASC
            LIMIT ?
        `, [latitud, longitud, latitud, radiusKm, limit]);
    }

    /**
     * Obtener departamentos disponibles
     */
    static async getDepartments() {
        return await executeQuery(`
            SELECT DISTINCT ubicacion_departamento as departamento
            FROM fincas
            WHERE estado = 'activa' AND ubicacion_departamento IS NOT NULL
            ORDER BY ubicacion_departamento
        `);
    }

    /**
     * Obtener municipios de un departamento
     */
    static async getMunicipios(departamento) {
        return await executeQuery(`
            SELECT DISTINCT ubicacion_municipio as municipio
            FROM fincas
            WHERE estado = 'activa' 
            AND ubicacion_departamento = ?
            AND ubicacion_municipio IS NOT NULL
            ORDER BY ubicacion_municipio
        `, [departamento]);
    }

    /**
     * Desactivar finca
     */
    static async deactivateFarm(id, userId) {
        // Verificar permisos
        const farm = await findOne(
            'SELECT usuario_id, nombre_finca FROM fincas WHERE id = ?', 
            [id]
        );

        if (!farm) {
            throw new Error('Finca no encontrada');
        }

        if (farm.usuario_id !== userId) {
            throw new Error('No tienes permisos para desactivar esta finca');
        }

        const affectedRows = await update('fincas', {
            estado: 'inactiva',
            fecha_actualizacion: new Date()
        }, 'id = ?', [id]);

        if (affectedRows === 0) {
            throw new Error('Error al desactivar finca');
        }

        // También desactivar todos los productos de la finca
        await update('productos', {
            estado: 'inactivo',
            fecha_actualizacion: new Date()
        }, 'finca_id = ?', [id]);

        // Registrar actividad
        await insert('actividades_recientes', {
            usuario_id: userId,
            tipo: 'warning',
            descripcion: `Finca desactivada - ${farm.nombre_finca}`,
            entidad_tipo: 'finca',
            entidad_id: id.toString()
        });

        return true;
    }
}

module.exports = Farm;