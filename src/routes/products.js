// ============================================================
// RUTAS DE PRODUCTOS - CAMPO DIRECTO
// ============================================================

const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Product = require('../models/Product');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { authenticateToken, requireFarmer, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ============================================================
// RUTAS PÚBLICAS
// ============================================================

/**
 * GET /api/products
 * Obtener productos con filtros y paginación (público)
 */
router.get('/', 
    [
        query('page').optional().isInt({ min: 1 }).withMessage('Página debe ser un entero positivo'),
        query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Límite debe estar entre 1 y 50'),
        query('categoria').optional().isIn(['vegetales', 'frutas', 'granos', 'hierbas', 'tuberculos', 'condimentos']),
        query('precio_min').optional().isFloat({ min: 0 }).withMessage('Precio mínimo inválido'),
        query('precio_max').optional().isFloat({ min: 0 }).withMessage('Precio máximo inválido'),
        query('departamento').optional().isString().trim(),
        query('search').optional().isString().trim()
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

        const filters = {
            categoria_id: req.query.categoria_id,
            usuario_id: req.query.usuario_id,
            precio_min: req.query.precio_min,
            precio_max: req.query.precio_max,
            departamento: req.query.departamento,
            municipio: req.query.municipio,
            calidad: req.query.calidad,
            search: req.query.search,
            stock_minimo: req.query.stock_minimo
        };

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;

        const result = await Product.getProducts(filters, page, limit);

        res.json({
            status: 'success',
            data: result
        });
    })
);

/**
 * GET /api/products/categories
 * Obtener categorías de productos (público)
 */
router.get('/categories', asyncHandler(async (req, res) => {
    const categories = await executeQuery(`
        SELECT 
            id,
            nombre,
            descripcion,
            icono,
            (SELECT COUNT(*) FROM productos p WHERE p.categoria_id = c.id AND p.estado = 'disponible') as total_productos
        FROM categorias_productos c
        WHERE estado = 'activo'
        ORDER BY nombre
    `);

    res.json({
        status: 'success',
        data: { categories }
    });
}));

/**
 * GET /api/products/:id
 * Obtener producto por ID (público)
 */
router.get('/:id', 
    optionalAuth,
    asyncHandler(async (req, res) => {
        const productId = parseInt(req.params.id);

        if (!productId || productId <= 0) {
            throw createError('ID de producto inválido', 400);
        }

        const product = await Product.findById(productId);

        if (!product) {
            throw createError('Producto no encontrado', 404);
        }

        // Obtener productos relacionados
        const relatedProducts = await Product.getRelatedProducts(productId, 4);

        res.json({
            status: 'success',
            data: { 
                product,
                related_products: relatedProducts
            }
        });
    })
);

// ============================================================
// RUTAS PROTEGIDAS (CAMPESINOS)
// ============================================================

/**
 * POST /api/products
 * Crear nuevo producto (solo campesinos)
 */
router.post('/',
    authenticateToken,
    requireFarmer,
    [
        body('nombre').trim().isLength({ min: 2, max: 150 }).withMessage('Nombre debe tener entre 2 y 150 caracteres'),
        body('descripcion').optional().trim().isLength({ max: 1000 }).withMessage('Descripción muy larga'),
        body('categoria_id').isInt({ min: 1 }).withMessage('Categoría inválida'),
        body('finca_id').isInt({ min: 1 }).withMessage('Finca inválida'),
        body('precio_por_kg').isFloat({ min: 0.01 }).withMessage('Precio por kg inválido'),
        body('stock_disponible').isInt({ min: 0 }).withMessage('Stock debe ser un entero positivo'),
        body('unidad_medida').optional().isIn(['kg', 'gramo', 'unidad', 'libra', 'arroba']),
        body('tags').optional().isString().trim(),
        body('calidad').optional().isIn(['premium', 'primera', 'segunda']),
        body('peso_minimo_venta').optional().isFloat({ min: 0 }),
        body('peso_maximo_venta').optional().isFloat({ min: 0 }),
        body('fecha_cosecha').optional().isDate(),
        body('fecha_vencimiento').optional().isDate(),
        body('imagen_principal').optional().isString(),
        body('galeria_imagenes').optional().isArray()
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                errors: errors.array()
            });
        }

        const productData = {
            usuario_id: req.user.id,
            finca_id: req.body.finca_id,
            categoria_id: req.body.categoria_id,
            nombre: req.body.nombre,
            descripcion: req.body.descripcion,
            precio_por_kg: req.body.precio_por_kg,
            stock_disponible: req.body.stock_disponible,
            unidad_medida: req.body.unidad_medida,
            tags: req.body.tags,
            calidad: req.body.calidad,
            fecha_cosecha: req.body.fecha_cosecha,
            fecha_vencimiento: req.body.fecha_vencimiento,
            peso_minimo_venta: req.body.peso_minimo_venta,
            peso_maximo_venta: req.body.peso_maximo_venta,
            imagen_principal: req.body.imagen_principal,
            galeria_imagenes: req.body.galeria_imagenes,
            disponible_entrega_inmediata: req.body.disponible_entrega_inmediata !== false,
            tiempo_preparacion_dias: req.body.tiempo_preparacion_dias || 1
        };

        const product = await Product.create(productData);

        res.status(201).json({
            status: 'success',
            message: 'Producto creado exitosamente',
            data: { product }
        });
    })
);

/**
 * PUT /api/products/:id
 * Actualizar producto (solo propietario)
 */
router.put('/:id',
    authenticateToken,
    requireFarmer,
    [
        body('nombre').optional().trim().isLength({ min: 2, max: 150 }),
        body('descripcion').optional().trim().isLength({ max: 1000 }),
        body('precio_por_kg').optional().isFloat({ min: 0.01 }),
        body('stock_disponible').optional().isInt({ min: 0 }),
        body('tags').optional().isString().trim(),
        body('calidad').optional().isIn(['premium', 'primera', 'segunda']),
        body('peso_minimo_venta').optional().isFloat({ min: 0 }),
        body('peso_maximo_venta').optional().isFloat({ min: 0 }),
        body('fecha_cosecha').optional().isDate(),
        body('fecha_vencimiento').optional().isDate(),
        body('imagen_principal').optional().isString(),
        body('galeria_imagenes').optional().isArray(),
        body('disponible_entrega_inmediata').optional().isBoolean(),
        body('tiempo_preparacion_dias').optional().isInt({ min: 1 })
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                errors: errors.array()
            });
        }

        const productId = parseInt(req.params.id);
        
        const updatedProduct = await Product.updateProduct(productId, req.user.id, req.body);

        res.json({
            status: 'success',
            message: 'Producto actualizado exitosamente',
            data: { product: updatedProduct }
        });
    })
);

/**
 * DELETE /api/products/:id
 * Eliminar producto (solo propietario)
 */
router.delete('/:id',
    authenticateToken,
    requireFarmer,
    asyncHandler(async (req, res) => {
        const productId = parseInt(req.params.id);
        
        await Product.deleteProduct(productId, req.user.id);

        res.json({
            status: 'success',
            message: 'Producto eliminado exitosamente'
        });
    })
);

/**
 * PUT /api/products/:id/stock
 * Actualizar stock de producto
 */
router.put('/:id/stock',
    authenticateToken,
    requireFarmer,
    [
        body('stock').isInt({ min: 0 }).withMessage('Stock debe ser un entero positivo')
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                errors: errors.array()
            });
        }

        const productId = parseInt(req.params.id);
        const newStock = parseInt(req.body.stock);
        
        await Product.updateStock(productId, newStock, req.user.id);

        res.json({
            status: 'success',
            message: 'Stock actualizado exitosamente'
        });
    })
);

/**
 * GET /api/products/:id/availability
 * Verificar disponibilidad para pedido
 */
router.get('/:id/availability',
    optionalAuth,
    [
        query('cantidad').isFloat({ min: 0.01 }).withMessage('Cantidad debe ser mayor a 0')
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                errors: errors.array()
            });
        }

        const productId = parseInt(req.params.id);
        const cantidad = parseFloat(req.query.cantidad);
        
        const availability = await Product.checkAvailability(productId, cantidad);

        res.json({
            status: 'success',
            data: availability
        });
    })
);

module.exports = router;