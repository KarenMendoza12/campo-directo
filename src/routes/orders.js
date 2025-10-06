// ============================================================
// RUTAS DE PEDIDOS - CAMPO DIRECTO
// ============================================================

const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Order = require('../models/Order');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { authenticateToken, requireFarmer, requireBuyer } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/orders
 * Obtener pedidos del usuario
 */
router.get('/', 
    authenticateToken,
    [
        query('estado').optional().isIn(['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']),
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 50 }),
        query('fecha_desde').optional().isDate(),
        query('fecha_hasta').optional().isDate()
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                errors: errors.array()
            });
        }

        const filters = {
            usuario_id: req.user.id,
            tipo_usuario: req.user.tipo_usuario,
            estado: req.query.estado,
            fecha_desde: req.query.fecha_desde,
            fecha_hasta: req.query.fecha_hasta
        };

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const result = await Order.getOrders(filters, page, limit);

        res.json({
            status: 'success',
            data: result
        });
    }));

/**
 * POST /api/orders
 * Crear nuevo pedido (solo compradores)
 */
router.post('/',
    authenticateToken,
    requireBuyer,
    [
        body('campesino_id').isInt({ min: 1 }).withMessage('ID de campesino inválido'),
        body('items').isArray({ min: 1 }).withMessage('Debe incluir al menos un producto'),
        body('items.*.producto_id').isInt({ min: 1 }).withMessage('ID de producto inválido'),
        body('items.*.cantidad').isFloat({ min: 0.01 }).withMessage('Cantidad debe ser mayor a 0'),
        body('items.*.precio_unitario').optional().isFloat({ min: 0.01 }),
        body('direccion_entrega').notEmpty().withMessage('Dirección de entrega requerida'),
        body('telefono_contacto').notEmpty().withMessage('Teléfono de contacto requerido'),
        body('fecha_entrega_programada').isDate().withMessage('Fecha de entrega inválida'),
        body('hora_entrega_programada').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        body('metodo_pago').optional().isIn(['efectivo', 'transferencia', 'tarjeta', 'otro']),
        body('notas_comprador').optional().isString().trim()
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                errors: errors.array()
            });
        }

        const orderData = {
            comprador_id: req.user.id,
            campesino_id: req.body.campesino_id,
            items: req.body.items,
            direccion_entrega: req.body.direccion_entrega,
            telefono_contacto: req.body.telefono_contacto,
            fecha_entrega_programada: req.body.fecha_entrega_programada,
            hora_entrega_programada: req.body.hora_entrega_programada,
            metodo_pago: req.body.metodo_pago,
            notas_comprador: req.body.notas_comprador
        };

        const order = await Order.create(orderData);

        res.status(201).json({
            status: 'success',
            message: 'Pedido creado exitosamente',
            data: { order }
        });
    })
);

/**
 * GET /api/orders/:id
 * Obtener pedido por ID
 */
router.get('/:id',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            throw createError('Pedido no encontrado', 404);
        }

        // Verificar permisos
        if (order.comprador_id !== req.user.id && order.campesino_id !== req.user.id) {
            throw createError('No tienes permisos para ver este pedido', 403);
        }

        res.json({
            status: 'success',
            data: { order }
        });
    })
);

/**
 * PUT /api/orders/:id/status
 * Actualizar estado de pedido
 */
router.put('/:id/status', 
    authenticateToken,
    [
        body('estado').isIn(['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']),
        body('notas').optional().isString().trim()
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                errors: errors.array()
            });
        }

        const { estado, notas } = req.body;
        const orderId = req.params.id;

        const updatedOrder = await Order.updateStatus(
            orderId, 
            estado, 
            req.user.id, 
            req.user.tipo_usuario, 
            notas
        );

        res.json({
            status: 'success',
            message: 'Estado actualizado exitosamente',
            data: { order: updatedOrder }
        });
    }));

/**
 * PUT /api/orders/:id/cancel
 * Cancelar pedido
 */
router.put('/:id/cancel',
    authenticateToken,
    [
        body('motivo').optional().isString().trim()
    ],
    asyncHandler(async (req, res) => {
        const orderId = req.params.id;
        const motivo = req.body.motivo;

        const cancelledOrder = await Order.cancelOrder(
            orderId, 
            req.user.id, 
            req.user.tipo_usuario, 
            motivo
        );

        res.json({
            status: 'success',
            message: 'Pedido cancelado exitosamente',
            data: { order: cancelledOrder }
        });
    })
);

/**
 * POST /api/orders/:id/rate
 * Calificar pedido
 */
router.post('/:id/rate',
    authenticateToken,
    [
        body('calificacion').isInt({ min: 1, max: 5 }).withMessage('Calificación debe estar entre 1 y 5'),
        body('comentario').optional().isString().trim().isLength({ max: 500 })
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                errors: errors.array()
            });
        }

        const orderId = req.params.id;
        const { calificacion, comentario } = req.body;

        const ratedOrder = await Order.rateOrder(
            orderId,
            req.user.id,
            req.user.tipo_usuario,
            calificacion,
            comentario
        );

        res.json({
            status: 'success',
            message: 'Calificación enviada exitosamente',
            data: { order: ratedOrder }
        });
    })
);

/**
 * GET /api/orders/stats
 * Obtener estadísticas de pedidos
 */
router.get('/stats/summary',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const stats = await Order.getOrderStats(req.user.id, req.user.tipo_usuario);

        res.json({
            status: 'success',
            data: { stats }
        });
    })
);

module.exports = router;