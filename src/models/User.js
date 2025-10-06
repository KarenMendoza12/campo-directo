// ============================================================
// MODELO DE USUARIO - CAMPO DIRECTO
// ============================================================

const bcrypt = require('bcrypt');
const { 
    executeQuery, 
    findOne, 
    insert, 
    update, 
    deleteRecord,
    exists,
    count 
} = require('../config/database');

class User {
    /**
     * Crear un nuevo usuario
     */
    static async create(userData) {
        const {
            nombre,
            apellido,
            email,
            telefono,
            tipo_usuario,
            fecha_nacimiento,
            password,
            nombreFinca
        } = userData;

        // Hash de la contraseña
        const saltRounds = 12;
        const password_hash = await bcrypt.hash(password, saltRounds);

        try {
            // Verificar si el email ya existe
            const emailExists = await exists('usuarios', 'email = ?', [email]);
            if (emailExists) {
                throw new Error('El email ya está registrado');
            }

            // Crear usuario
            const userId = await insert('usuarios', {
                nombre,
                apellido,
                email,
                telefono,
                tipo_usuario,
                fecha_nacimiento,
                password_hash,
                estado: 'activo'
            });

            // Si es campesino y tiene nombre de finca, crear la finca
            if (tipo_usuario === 'campesino' && nombreFinca) {
                await insert('fincas', {
                    usuario_id: userId,
                    nombre_finca: nombreFinca,
                    ubicacion_departamento: 'Por definir',
                    ubicacion_municipio: 'Por definir',
                    area_hectareas: 0,
                    tipo_cultivo: 'organico',
                    estado: 'activa'
                });
            }

            // Obtener usuario creado sin la contraseña
            const newUser = await User.findById(userId);
            return newUser;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Buscar usuario por ID
     */
    static async findById(id) {
        return await findOne(`
            SELECT 
                u.id,
                u.nombre,
                u.apellido,
                u.email,
                u.telefono,
                u.tipo_usuario,
                u.fecha_nacimiento,
                u.estado,
                u.fecha_registro,
                u.calificacion_promedio,
                u.total_calificaciones,
                f.nombre_finca,
                f.ubicacion_departamento,
                f.ubicacion_municipio,
                f.area_hectareas,
                f.tipo_cultivo
            FROM usuarios u
            LEFT JOIN fincas f ON u.id = f.usuario_id AND u.tipo_usuario = 'campesino'
            WHERE u.id = ?
        `, [id]);
    }

    /**
     * Buscar usuario por email
     */
    static async findByEmail(email) {
        return await findOne(`
            SELECT 
                u.id,
                u.nombre,
                u.apellido,
                u.email,
                u.telefono,
                u.tipo_usuario,
                u.fecha_nacimiento,
                u.password_hash,
                u.estado,
                u.fecha_registro,
                u.calificacion_promedio,
                u.total_calificaciones
            FROM usuarios u
            WHERE u.email = ?
        `, [email]);
    }

    /**
     * Autenticar usuario
     */
    static async authenticate(email, password) {
        const user = await User.findByEmail(email);
        
        if (!user) {
            return null;
        }

        if (user.estado !== 'activo') {
            throw new Error('Usuario inactivo o suspendido');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        
        if (!isPasswordValid) {
            return null;
        }

        // Actualizar último login
        await update('usuarios', 
            { ultimo_login: new Date() }, 
            'id = ?', 
            [user.id]
        );

        // Eliminar hash de la respuesta
        delete user.password_hash;
        
        return user;
    }

    /**
     * Actualizar perfil de usuario
     */
    static async updateProfile(id, updateData) {
        const allowedFields = ['nombre', 'apellido', 'telefono'];
        const updateObj = {};
        
        // Filtrar solo campos permitidos
        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                updateObj[field] = updateData[field];
            }
        }

        if (Object.keys(updateObj).length === 0) {
            throw new Error('No hay campos válidos para actualizar');
        }

        updateObj.fecha_actualizacion = new Date();

        const affectedRows = await update('usuarios', updateObj, 'id = ?', [id]);
        
        if (affectedRows === 0) {
            throw new Error('Usuario no encontrado');
        }

        return await User.findById(id);
    }

    /**
     * Cambiar contraseña
     */
    static async changePassword(id, currentPassword, newPassword) {
        // Obtener usuario actual
        const user = await findOne('SELECT password_hash FROM usuarios WHERE id = ?', [id]);
        
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        // Verificar contraseña actual
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
        
        if (!isCurrentPasswordValid) {
            throw new Error('Contraseña actual incorrecta');
        }

        // Hash de la nueva contraseña
        const saltRounds = 12;
        const password_hash = await bcrypt.hash(newPassword, saltRounds);

        // Actualizar contraseña
        const affectedRows = await update('usuarios', 
            { password_hash, fecha_actualizacion: new Date() }, 
            'id = ?', 
            [id]
        );

        return affectedRows > 0;
    }

    /**
     * Obtener campesinos con paginación
     */
    static async getFarmers(page = 1, limit = 10, filters = {}) {
        const offset = (page - 1) * limit;
        let whereClause = 'u.tipo_usuario = "campesino" AND u.estado = "activo"';
        const params = [];

        // Aplicar filtros
        if (filters.departamento) {
            whereClause += ' AND f.ubicacion_departamento = ?';
            params.push(filters.departamento);
        }

        if (filters.tipo_cultivo) {
            whereClause += ' AND f.tipo_cultivo = ?';
            params.push(filters.tipo_cultivo);
        }

        if (filters.calificacion_min) {
            whereClause += ' AND u.calificacion_promedio >= ?';
            params.push(parseFloat(filters.calificacion_min));
        }

        const query = `
            SELECT 
                u.id,
                u.nombre,
                u.apellido,
                u.calificacion_promedio,
                u.total_calificaciones,
                f.nombre_finca,
                f.ubicacion_departamento,
                f.ubicacion_municipio,
                f.tipo_cultivo,
                f.area_hectareas,
                COUNT(DISTINCT p.id) as total_productos
            FROM usuarios u
            LEFT JOIN fincas f ON u.id = f.usuario_id
            LEFT JOIN productos p ON u.id = p.usuario_id AND p.estado = 'disponible'
            WHERE ${whereClause}
            GROUP BY u.id
            ORDER BY u.calificacion_promedio DESC, u.fecha_registro ASC
            LIMIT ? OFFSET ?
        `;

        const farmers = await executeQuery(query, [...params, limit, offset]);

        // Obtener total para paginación
        const totalQuery = `
            SELECT COUNT(DISTINCT u.id) as total
            FROM usuarios u
            LEFT JOIN fincas f ON u.id = f.usuario_id
            WHERE ${whereClause}
        `;
        const totalResult = await executeQuery(totalQuery, params);
        const total = totalResult[0].total;

        return {
            farmers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(total),
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Actualizar calificación de usuario
     */
    static async updateRating(userId, newRating) {
        // Obtener datos actuales
        const user = await findOne(
            'SELECT calificacion_promedio, total_calificaciones FROM usuarios WHERE id = ?',
            [userId]
        );

        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        const currentAvg = parseFloat(user.calificacion_promedio) || 0;
        const currentTotal = parseInt(user.total_calificaciones) || 0;

        // Calcular nuevo promedio
        const newTotal = currentTotal + 1;
        const newAvg = ((currentAvg * currentTotal) + newRating) / newTotal;

        // Actualizar en base de datos
        await update('usuarios', {
            calificacion_promedio: Math.round(newAvg * 10) / 10, // Redondear a 1 decimal
            total_calificaciones: newTotal
        }, 'id = ?', [userId]);

        return {
            calificacion_promedio: Math.round(newAvg * 10) / 10,
            total_calificaciones: newTotal
        };
    }

    /**
     * Desactivar usuario
     */
    static async deactivate(id) {
        const affectedRows = await update('usuarios', 
            { estado: 'inactivo', fecha_actualizacion: new Date() }, 
            'id = ?', 
            [id]
        );

        return affectedRows > 0;
    }

    /**
     * Obtener estadísticas de usuario
     */
    static async getStats(userId, tipo_usuario) {
        if (tipo_usuario === 'campesino') {
            return await executeQuery(`
                SELECT 
                    COUNT(DISTINCT p.id) as total_productos,
                    COUNT(DISTINCT CASE WHEN p.estado = 'disponible' THEN p.id END) as productos_activos,
                    COUNT(DISTINCT CASE WHEN pe.estado = 'pending' THEN pe.id END) as pedidos_pendientes,
                    COUNT(DISTINCT CASE WHEN pe.estado = 'completed' THEN pe.id END) as pedidos_completados,
                    COALESCE(SUM(CASE 
                        WHEN pe.estado = 'completed' 
                        AND MONTH(pe.fecha_completado) = MONTH(CURRENT_DATE)
                        AND YEAR(pe.fecha_completado) = YEAR(CURRENT_DATE)
                        THEN pe.total 
                        ELSE 0 
                    END), 0) as ventas_mes_actual
                FROM usuarios u
                LEFT JOIN productos p ON u.id = p.usuario_id
                LEFT JOIN pedidos pe ON u.id = pe.campesino_id
                WHERE u.id = ?
            `, [userId]);
        } else {
            return await executeQuery(`
                SELECT 
                    COUNT(DISTINCT pe.id) as total_pedidos,
                    COUNT(DISTINCT CASE WHEN pe.estado = 'pending' THEN pe.id END) as pedidos_pendientes,
                    COUNT(DISTINCT CASE WHEN pe.estado = 'completed' THEN pe.id END) as pedidos_completados,
                    COALESCE(SUM(CASE 
                        WHEN pe.estado = 'completed' 
                        THEN pe.total 
                        ELSE 0 
                    END), 0) as total_gastado
                FROM usuarios u
                LEFT JOIN pedidos pe ON u.id = pe.comprador_id
                WHERE u.id = ?
            `, [userId]);
        }
    }
}

module.exports = User;