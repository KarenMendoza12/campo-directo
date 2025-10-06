// ============================================================
// MODELO DE MENSAJERÍA - CAMPO DIRECTO
// Funcionalidad anti-intermediarios: Comunicación directa
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

class Messaging {
    /**
     * Crear o obtener conversación entre dos usuarios
     */
    static async getOrCreateConversation(comprador_id, campesino_id, producto_id = null) {
        try {
            // Buscar conversación existente
            let conversation = await findOne(`
                SELECT * FROM conversaciones 
                WHERE comprador_id = ? AND campesino_id = ? 
                AND (producto_id = ? OR (producto_id IS NULL AND ? IS NULL))
                AND estado != 'bloqueada'
            `, [comprador_id, campesino_id, producto_id, producto_id]);

            if (!conversation) {
                // Crear nueva conversación
                const conversationId = `CONV-${Date.now().toString().slice(-8).toUpperCase()}`;
                
                await insert('conversaciones', {
                    id: conversationId,
                    comprador_id,
                    campesino_id,
                    producto_id,
                    estado: 'activa'
                });

                conversation = await Messaging.getConversationById(conversationId);
            }

            return conversation;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Obtener conversación por ID con información de participantes
     */
    static async getConversationById(conversationId) {
        return await findOne(`
            SELECT 
                c.*,
                CONCAT(comprador.nombre, ' ', comprador.apellido) as nombre_comprador,
                comprador.telefono as telefono_comprador,
                CONCAT(campesino.nombre, ' ', campesino.apellido) as nombre_campesino,
                campesino.telefono as telefono_campesino,
                p.nombre as producto_nombre,
                p.precio_por_kg as producto_precio,
                (SELECT COUNT(*) FROM mensajes m WHERE m.conversacion_id = c.id AND m.leido = FALSE) as mensajes_no_leidos
            FROM conversaciones c
            JOIN usuarios comprador ON c.comprador_id = comprador.id
            JOIN usuarios campesino ON c.campesino_id = campesino.id
            LEFT JOIN productos p ON c.producto_id = p.id
            WHERE c.id = ?
        `, [conversationId]);
    }

    /**
     * Enviar mensaje en una conversación
     */
    static async sendMessage(messageData) {
        const {
            conversacion_id,
            remitente_id,
            contenido,
            tipo_mensaje = 'texto',
            metadata = null
        } = messageData;

        try {
            // Verificar que el usuario pertenece a la conversación
            const conversation = await findOne(`
                SELECT * FROM conversaciones 
                WHERE id = ? AND (comprador_id = ? OR campesino_id = ?)
                AND estado = 'activa'
            `, [conversacion_id, remitente_id, remitente_id]);

            if (!conversation) {
                throw new Error('No tienes permisos para enviar mensajes en esta conversación');
            }

            // Insertar mensaje
            const messageId = await insert('mensajes', {
                conversacion_id,
                remitente_id,
                contenido,
                tipo_mensaje,
                metadata: metadata ? JSON.stringify(metadata) : null
            });

            // Actualizar última actividad de la conversación
            await update('conversaciones', {
                fecha_ultima_actividad: new Date()
            }, 'id = ?', [conversacion_id]);

            // Obtener mensaje completo
            const message = await findOne(`
                SELECT 
                    m.*,
                    CONCAT(u.nombre, ' ', u.apellido) as nombre_remitente,
                    u.tipo_usuario
                FROM mensajes m
                JOIN usuarios u ON m.remitente_id = u.id
                WHERE m.id = ?
            `, [messageId]);

            // Procesar metadata si existe
            if (message.metadata) {
                try {
                    message.metadata = JSON.parse(message.metadata);
                } catch (e) {
                    message.metadata = null;
                }
            }

            return message;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Obtener mensajes de una conversación
     */
    static async getMessages(conversationId, userId, page = 1, limit = 50) {
        const offset = (page - 1) * limit;

        // Verificar que el usuario pertenece a la conversación
        const hasAccess = await exists(`conversaciones`, 
            'id = ? AND (comprador_id = ? OR campesino_id = ?)',
            [conversationId, userId, userId]
        );

        if (!hasAccess) {
            throw new Error('No tienes permisos para ver esta conversación');
        }

        const messages = await executeQuery(`
            SELECT 
                m.*,
                CONCAT(u.nombre, ' ', u.apellido) as nombre_remitente,
                u.tipo_usuario
            FROM mensajes m
            JOIN usuarios u ON m.remitente_id = u.id
            WHERE m.conversacion_id = ?
            ORDER BY m.fecha_envio DESC
            LIMIT ? OFFSET ?
        `, [conversationId, limit, offset]);

        // Procesar metadata para cada mensaje
        messages.forEach(message => {
            if (message.metadata) {
                try {
                    message.metadata = JSON.parse(message.metadata);
                } catch (e) {
                    message.metadata = null;
                }
            }
        });

        // Obtener total para paginación
        const totalResult = await executeQuery(`
            SELECT COUNT(*) as total FROM mensajes WHERE conversacion_id = ?
        `, [conversationId]);

        return {
            messages: messages.reverse(), // Mostrar más recientes al final
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalResult[0].total,
                pages: Math.ceil(totalResult[0].total / limit)
            }
        };
    }

    /**
     * Marcar mensajes como leídos
     */
    static async markMessagesAsRead(conversationId, userId) {
        // Marcar como leídos todos los mensajes que no son del usuario
        const affectedRows = await update('mensajes', {
            leido: true
        }, 'conversacion_id = ? AND remitente_id != ? AND leido = FALSE', 
        [conversationId, userId]);

        return affectedRows;
    }

    /**
     * Obtener conversaciones de un usuario
     */
    static async getUserConversations(userId, userType) {
        let query;
        if (userType === 'campesino') {
            query = `
                SELECT 
                    c.*,
                    CONCAT(comprador.nombre, ' ', comprador.apellido) as contacto_nombre,
                    comprador.telefono as contacto_telefono,
                    'comprador' as contacto_tipo,
                    p.nombre as producto_nombre,
                    (SELECT COUNT(*) FROM mensajes m WHERE m.conversacion_id = c.id AND m.remitente_id != ? AND m.leido = FALSE) as mensajes_no_leidos,
                    (SELECT m.contenido FROM mensajes m WHERE m.conversacion_id = c.id ORDER BY m.fecha_envio DESC LIMIT 1) as ultimo_mensaje,
                    (SELECT m.fecha_envio FROM mensajes m WHERE m.conversacion_id = c.id ORDER BY m.fecha_envio DESC LIMIT 1) as fecha_ultimo_mensaje
                FROM conversaciones c
                JOIN usuarios comprador ON c.comprador_id = comprador.id
                LEFT JOIN productos p ON c.producto_id = p.id
                WHERE c.campesino_id = ? AND c.estado != 'bloqueada'
                ORDER BY c.fecha_ultima_actividad DESC
            `;
        } else {
            query = `
                SELECT 
                    c.*,
                    CONCAT(campesino.nombre, ' ', campesino.apellido) as contacto_nombre,
                    campesino.telefono as contacto_telefono,
                    'campesino' as contacto_tipo,
                    p.nombre as producto_nombre,
                    (SELECT COUNT(*) FROM mensajes m WHERE m.conversacion_id = c.id AND m.remitente_id != ? AND m.leido = FALSE) as mensajes_no_leidos,
                    (SELECT m.contenido FROM mensajes m WHERE m.conversacion_id = c.id ORDER BY m.fecha_envio DESC LIMIT 1) as ultimo_mensaje,
                    (SELECT m.fecha_envio FROM mensajes m WHERE m.conversacion_id = c.id ORDER BY m.fecha_envio DESC LIMIT 1) as fecha_ultimo_mensaje
                FROM conversaciones c
                JOIN usuarios campesino ON c.campesino_id = campesino.id
                LEFT JOIN productos p ON c.producto_id = p.id
                WHERE c.comprador_id = ? AND c.estado != 'bloqueada'
                ORDER BY c.fecha_ultima_actividad DESC
            `;
        }

        return await executeQuery(query, [userId, userId]);
    }

    /**
     * Enviar oferta de precio
     */
    static async sendPriceOffer(conversationId, remitente_id, productoId, precioOfertado, cantidad, mensaje = '') {
        const metadata = {
            tipo: 'oferta_precio',
            producto_id: productoId,
            precio_ofertado: precioOfertado,
            cantidad: cantidad,
            fecha_oferta: new Date().toISOString()
        };

        const contenido = `💰 **Oferta de precio**\n${mensaje}\n\n**Detalles:**\n- Precio ofertado: $${precioOfertado.toLocaleString()} por kg\n- Cantidad: ${cantidad} kg\n- Total estimado: $${(precioOfertado * cantidad).toLocaleString()}`;

        return await Messaging.sendMessage({
            conversacion_id: conversationId,
            remitente_id,
            contenido,
            tipo_mensaje: 'oferta_precio',
            metadata
        });
    }

    /**
     * Enviar ubicación
     */
    static async sendLocation(conversationId, remitente_id, latitud, longitud, descripcion = '') {
        const metadata = {
            tipo: 'ubicacion',
            latitud,
            longitud,
            descripcion
        };

        const contenido = `📍 **Ubicación compartida**\n${descripcion}\n\nCoordenadas: ${latitud}, ${longitud}`;

        return await Messaging.sendMessage({
            conversacion_id: conversationId,
            remitente_id,
            contenido,
            tipo_mensaje: 'ubicacion',
            metadata
        });
    }

    /**
     * Bloquear conversación
     */
    static async blockConversation(conversationId, userId, motivo = '') {
        // Verificar que el usuario pertenece a la conversación
        const hasAccess = await exists(`conversaciones`, 
            'id = ? AND (comprador_id = ? OR campesino_id = ?)',
            [conversationId, userId, userId]
        );

        if (!hasAccess) {
            throw new Error('No tienes permisos para bloquear esta conversación');
        }

        await update('conversaciones', {
            estado: 'bloqueada',
            fecha_ultima_actividad: new Date()
        }, 'id = ?', [conversationId]);

        // Registrar motivo del bloqueo si se proporciona
        if (motivo) {
            await Messaging.sendMessage({
                conversacion_id: conversationId,
                remitente_id: userId,
                contenido: `⛔ Conversación bloqueada. Motivo: ${motivo}`,
                tipo_mensaje: 'texto'
            });
        }

        return true;
    }

    /**
     * Cerrar conversación
     */
    static async closeConversation(conversationId, userId) {
        const hasAccess = await exists(`conversaciones`, 
            'id = ? AND (comprador_id = ? OR campesino_id = ?)',
            [conversationId, userId, userId]
        );

        if (!hasAccess) {
            throw new Error('No tienes permisos para cerrar esta conversación');
        }

        await update('conversaciones', {
            estado: 'cerrada',
            fecha_ultima_actividad: new Date()
        }, 'id = ?', [conversationId]);

        return true;
    }

    /**
     * Obtener estadísticas de mensajería para el usuario
     */
    static async getMessagingStats(userId, userType) {
        let statsQuery;
        
        if (userType === 'campesino') {
            statsQuery = `
                SELECT 
                    COUNT(DISTINCT c.id) as total_conversaciones,
                    COUNT(DISTINCT CASE WHEN c.estado = 'activa' THEN c.id END) as conversaciones_activas,
                    COUNT(DISTINCT c.comprador_id) as compradores_contactados,
                    (SELECT COUNT(*) FROM mensajes m 
                     JOIN conversaciones conv ON m.conversacion_id = conv.id 
                     WHERE conv.campesino_id = ? AND m.remitente_id != ?) as mensajes_recibidos,
                    (SELECT COUNT(*) FROM mensajes m 
                     JOIN conversaciones conv ON m.conversacion_id = conv.id 
                     WHERE conv.campesino_id = ? AND m.remitente_id = ?) as mensajes_enviados
                FROM conversaciones c
                WHERE c.campesino_id = ?
            `;
        } else {
            statsQuery = `
                SELECT 
                    COUNT(DISTINCT c.id) as total_conversaciones,
                    COUNT(DISTINCT CASE WHEN c.estado = 'activa' THEN c.id END) as conversaciones_activas,
                    COUNT(DISTINCT c.campesino_id) as campesinos_contactados,
                    (SELECT COUNT(*) FROM mensajes m 
                     JOIN conversaciones conv ON m.conversacion_id = conv.id 
                     WHERE conv.comprador_id = ? AND m.remitente_id != ?) as mensajes_recibidos,
                    (SELECT COUNT(*) FROM mensajes m 
                     JOIN conversaciones conv ON m.conversacion_id = conv.id 
                     WHERE conv.comprador_id = ? AND m.remitente_id = ?) as mensajes_enviados
                FROM conversaciones c
                WHERE c.comprador_id = ?
            `;
        }

        const stats = await executeQuery(statsQuery, [userId, userId, userId, userId, userId]);
        return stats[0];
    }

    /**
     * Buscar conversaciones
     */
    static async searchConversations(userId, userType, searchTerm) {
        let searchQuery;
        
        if (userType === 'campesino') {
            searchQuery = `
                SELECT DISTINCT
                    c.*,
                    CONCAT(comprador.nombre, ' ', comprador.apellido) as contacto_nombre,
                    p.nombre as producto_nombre
                FROM conversaciones c
                JOIN usuarios comprador ON c.comprador_id = comprador.id
                LEFT JOIN productos p ON c.producto_id = p.id
                LEFT JOIN mensajes m ON c.id = m.conversacion_id
                WHERE c.campesino_id = ? 
                AND c.estado != 'bloqueada'
                AND (
                    CONCAT(comprador.nombre, ' ', comprador.apellido) LIKE ? OR
                    p.nombre LIKE ? OR
                    m.contenido LIKE ?
                )
                ORDER BY c.fecha_ultima_actividad DESC
            `;
        } else {
            searchQuery = `
                SELECT DISTINCT
                    c.*,
                    CONCAT(campesino.nombre, ' ', campesino.apellido) as contacto_nombre,
                    p.nombre as producto_nombre
                FROM conversaciones c
                JOIN usuarios campesino ON c.campesino_id = campesino.id
                LEFT JOIN productos p ON c.producto_id = p.id
                LEFT JOIN mensajes m ON c.id = m.conversacion_id
                WHERE c.comprador_id = ? 
                AND c.estado != 'bloqueada'
                AND (
                    CONCAT(campesino.nombre, ' ', campesino.apellido) LIKE ? OR
                    p.nombre LIKE ? OR
                    m.contenido LIKE ?
                )
                ORDER BY c.fecha_ultima_actividad DESC
            `;
        }

        const searchPattern = `%${searchTerm}%`;
        return await executeQuery(searchQuery, [userId, searchPattern, searchPattern, searchPattern]);
    }
}

module.exports = Messaging;