// ============================================================
// RUTAS ANTI-INTERMEDIARIOS - CAMPO DIRECTO
// Mensajería directa y transparencia de precios
// ============================================================

const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Messaging = require('../models/Messaging');
const PriceTransparency = require('../models/PriceTransparency');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ============================================================
// RUTAS DE MENSAJERÍA DIRECTA
// ============================================================

/**
 * GET /api/anti-intermediarios/conversations
 * Obtener conversaciones del usuario
 */
router.get('/conversations',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const conversations = await Messaging.getUserConversations(req.user.id, req.user.tipo_usuario);

        res.json({
            status: 'success',
            data: { conversations }
        });
    })
);

/**
 * POST /api/anti-intermediarios/conversations
 * Crear o obtener conversación
 */
router.post('/conversations',
    authenticateToken,
    [
        body('destinatario_id').isInt({ min: 1 }).withMessage('ID de destinatario inválido'),
        body('producto_id').optional().isInt({ min: 1 }),
        body('mensaje_inicial').optional().isString().trim().isLength({ min: 1, max: 1000 })
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                errors: errors.array()
            });
        }

        const { destinatario_id, producto_id, mensaje_inicial } = req.body;

        // Determinar roles según el tipo de usuario
        let comprador_id, campesino_id;
        if (req.user.tipo_usuario === 'comprador') {
            comprador_id = req.user.id;
            campesino_id = destinatario_id;
        } else {
            campesino_id = req.user.id;
            comprador_id = destinatario_id;
        }

        const conversation = await Messaging.getOrCreateConversation(
            comprador_id, 
            campesino_id, 
            producto_id
        );

        // Enviar mensaje inicial si se proporciona
        if (mensaje_inicial) {
            await Messaging.sendMessage({
                conversacion_id: conversation.id,
                remitente_id: req.user.id,
                contenido: mensaje_inicial
            });
        }

        res.status(201).json({
            status: 'success',
            message: 'Conversación iniciada exitosamente',
            data: { conversation }
        });
    })
);

/**
 * GET /api/anti-intermediarios/conversations/:id/messages
 * Obtener mensajes de una conversación
 */
router.get('/conversations/:id/messages',
    authenticateToken,
    [
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 })
    ],
    asyncHandler(async (req, res) => {
        const conversationId = req.params.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;

        const result = await Messaging.getMessages(conversationId, req.user.id, page, limit);

        // Marcar mensajes como leídos
        await Messaging.markMessagesAsRead(conversationId, req.user.id);

        res.json({
            status: 'success',
            data: result
        });
    })
);

/**
 * POST /api/anti-intermediarios/conversations/:id/messages
 * Enviar mensaje en conversación
 */
router.post('/conversations/:id/messages',
    authenticateToken,
    [
        body('contenido').trim().isLength({ min: 1, max: 1000 }).withMessage('Mensaje debe tener entre 1 y 1000 caracteres'),
        body('tipo_mensaje').optional().isIn(['texto', 'oferta_precio', 'imagen', 'ubicacion'])
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                errors: errors.array()
            });
        }

        const message = await Messaging.sendMessage({
            conversacion_id: req.params.id,
            remitente_id: req.user.id,
            contenido: req.body.contenido,
            tipo_mensaje: req.body.tipo_mensaje
        });

        res.status(201).json({
            status: 'success',
            message: 'Mensaje enviado exitosamente',
            data: { message }
        });
    })
);

/**
 * POST /api/anti-intermediarios/conversations/:id/price-offer
 * Enviar oferta de precio
 */
router.post('/conversations/:id/price-offer',
    authenticateToken,
    [
        body('producto_id').isInt({ min: 1 }).withMessage('ID de producto requerido'),
        body('precio_ofertado').isFloat({ min: 0.01 }).withMessage('Precio ofertado inválido'),
        body('cantidad').isFloat({ min: 0.01 }).withMessage('Cantidad inválida'),
        body('mensaje').optional().isString().trim().isLength({ max: 500 })
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                errors: errors.array()
            });
        }

        const { producto_id, precio_ofertado, cantidad, mensaje } = req.body;

        const message = await Messaging.sendPriceOffer(
            req.params.id,
            req.user.id,
            producto_id,
            precio_ofertado,
            cantidad,
            mensaje || ''
        );

        res.status(201).json({
            status: 'success',
            message: 'Oferta de precio enviada exitosamente',
            data: { message }
        });
    })
);

/**
 * POST /api/anti-intermediarios/conversations/:id/location
 * Compartir ubicación
 */
router.post('/conversations/:id/location',
    authenticateToken,
    [
        body('latitud').isFloat({ min: -90, max: 90 }).withMessage('Latitud inválida'),
        body('longitud').isFloat({ min: -180, max: 180 }).withMessage('Longitud inválida'),
        body('descripcion').optional().isString().trim().isLength({ max: 200 })
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                errors: errors.array()
            });
        }

        const { latitud, longitud, descripcion } = req.body;

        const message = await Messaging.sendLocation(
            req.params.id,
            req.user.id,
            latitud,
            longitud,
            descripcion || ''
        );

        res.status(201).json({
            status: 'success',
            message: 'Ubicación compartida exitosamente',
            data: { message }
        });
    })
);

/**
 * PUT /api/anti-intermediarios/conversations/:id/block
 * Bloquear conversación
 */
router.put('/conversations/:id/block',
    authenticateToken,
    [
        body('motivo').optional().isString().trim().isLength({ max: 200 })
    ],
    asyncHandler(async (req, res) => {
        await Messaging.blockConversation(req.params.id, req.user.id, req.body.motivo);

        res.json({
            status: 'success',
            message: 'Conversación bloqueada exitosamente'
        });
    })
);

/**
 * GET /api/anti-intermediarios/messaging/stats
 * Estadísticas de mensajería del usuario
 */
router.get('/messaging/stats',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const stats = await Messaging.getMessagingStats(req.user.id, req.user.tipo_usuario);

        res.json({
            status: 'success',
            data: { stats }
        });
    })
);

// ============================================================
// RUTAS DE TRANSPARENCIA DE PRECIOS
// ============================================================

/**
 * GET /api/anti-intermediarios/price-comparison/:productId
 * Comparación de precios para un producto específico
 */
router.get('/price-comparison/:productId',
    optionalAuth,
    asyncHandler(async (req, res) => {
        const productId = parseInt(req.params.productId);

        if (!productId || productId <= 0) {
            throw createError('ID de producto inválido', 400);
        }

        const comparison = await PriceTransparency.getProductPriceComparison(productId);

        if (!comparison) {
            throw createError('Producto no encontrado o sin datos de comparación', 404);
        }

        res.json({
            status: 'success',
            data: { comparison }
        });
    })
);

/**
 * GET /api/anti-intermediarios/best-savings
 * Productos con mayor ahorro vs mercado tradicional
 */
router.get('/best-savings',
    [
        query('departamento').optional().isString().trim(),
        query('categoria').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 50 })
    ],
    optionalAuth,
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                errors: errors.array()
            });
        }

        const departamento = req.query.departamento;
        const categoria = req.query.categoria ? parseInt(req.query.categoria) : null;
        const limit = parseInt(req.query.limit) || 10;

        const products = await PriceTransparency.getProductsWithBestSavings(departamento, categoria, limit);

        res.json({
            status: 'success',
            data: { products }
        });
    })
);

/**
 * POST /api/anti-intermediarios/calculate-savings
 * Calcular ahorro estimado para un pedido
 */
router.post('/calculate-savings',
    [
        body('items').isArray({ min: 1 }).withMessage('Items requeridos'),
        body('items.*.producto_id').isInt({ min: 1 }).withMessage('ID de producto inválido'),
        body('items.*.cantidad').isFloat({ min: 0.01 }).withMessage('Cantidad inválida'),
        body('items.*.precio_unitario').isFloat({ min: 0.01 }).withMessage('Precio unitario inválido')
    ],
    optionalAuth,
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                errors: errors.array()
            });
        }

        const savings = await PriceTransparency.calculateOrderSavings(req.body.items);

        res.json({
            status: 'success',
            data: { savings }
        });
    })
);

/**
 * GET /api/anti-intermediarios/my-savings
 * Estadísticas de ahorro personal del comprador
 */
router.get('/my-savings',
    authenticateToken,
    asyncHandler(async (req, res) => {
        if (req.user.tipo_usuario !== 'comprador') {
            throw createError('Solo disponible para compradores', 403);
        }

        const stats = await PriceTransparency.getBuyerSavingsStats(req.user.id);

        res.json({
            status: 'success',
            data: { stats }
        });
    })
);

/**
 * GET /api/anti-intermediarios/my-benefits
 * Estadísticas de beneficios del campesino
 */
router.get('/my-benefits',
    authenticateToken,
    asyncHandler(async (req, res) => {
        if (req.user.tipo_usuario !== 'campesino') {
            throw createError('Solo disponible para campesinos', 403);
        }

        const stats = await PriceTransparency.getFarmerBenefitStats(req.user.id);

        res.json({
            status: 'success',
            data: { stats }
        });
    })
);

/**
 * GET /api/anti-intermediarios/platform-impact
 * Impacto general de la plataforma anti-intermediarios
 */
router.get('/platform-impact',
    optionalAuth,
    asyncHandler(async (req, res) => {
        const impact = await PriceTransparency.getPlatformImpactStats();

        res.json({
            status: 'success',
            data: { impact }
        });
    })
);

/**
 * GET /api/anti-intermediarios/fair-prices
 * Productos con precios más justos
 */
router.get('/fair-prices',
    [
        query('limit').optional().isInt({ min: 1, max: 50 })
    ],
    optionalAuth,
    asyncHandler(async (req, res) => {
        const limit = parseInt(req.query.limit) || 20;

        const products = await PriceTransparency.getFairPriceProducts(limit);

        res.json({
            status: 'success',
            data: { products }
        });
    })
);

/**
 * GET /api/anti-intermediarios/savings-alerts
 * Alertas de oportunidades de ahorro
 */
router.get('/savings-alerts',
    authenticateToken,
    [
        query('departamento').optional().isString().trim()
    ],
    asyncHandler(async (req, res) => {
        const alerts = await PriceTransparency.getSavingsAlerts(
            req.user.id, 
            req.query.departamento
        );

        res.json({
            status: 'success',
            data: { alerts }
        });
    })
);

/**
 * GET /api/anti-intermediarios/impact-report
 * Reporte de impacto para período específico
 */
router.get('/impact-report',
    [
        query('start_date').isDate().withMessage('Fecha de inicio inválida'),
        query('end_date').isDate().withMessage('Fecha de fin inválida')
    ],
    optionalAuth,
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                errors: errors.array()
            });
        }

        const report = await PriceTransparency.generateImpactReport(
            req.query.start_date,
            req.query.end_date
        );

        res.json({
            status: 'success',
            data: { report }
        });
    })
);

/**
 * GET /api/anti-intermediarios/product/:id/price-history
 * Historial de precios de un producto
 */
router.get('/product/:id/price-history',
    [
        query('days').optional().isInt({ min: 1, max: 365 })
    ],
    optionalAuth,
    asyncHandler(async (req, res) => {
        const productId = parseInt(req.params.id);
        const days = parseInt(req.query.days) || 30;

        const history = await PriceTransparency.getProductPriceHistory(productId, days);

        res.json({
            status: 'success',
            data: { history }
        });
    })
);

module.exports = router;