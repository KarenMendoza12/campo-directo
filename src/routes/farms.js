// ============================================================
// RUTAS DE FINCAS - CAMPO DIRECTO
// ============================================================

const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Farm = require('../models/Farm');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { authenticateToken, requireFarmer, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ============================================================
// RUTAS PÚBLICAS
// ============================================================

/**
 * GET /api/farms
 * Obtener fincas con filtros (público)
 */
router.get('/',
    [
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 50 }),
        query('departamento').optional().isString().trim(),
        query('municipio').optional().isString().trim(),
        query('tipo_cultivo').optional().isIn(['organico', 'tradicional', 'hidroponico', 'mixto']),
        query('area_min').optional().isFloat({ min: 0 }),
        query('area_max').optional().isFloat({ min: 0 }),
        query('calificacion_min').optional().isFloat({ min: 0, max: 5 }),
        query('search').optional().isString().trim(),
        query('con_certificaciones').optional().isBoolean()
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
            departamento: req.query.departamento,
            municipio: req.query.municipio,
            tipo_cultivo: req.query.tipo_cultivo,
            area_min: req.query.area_min,
            area_max: req.query.area_max,
            calificacion_min: req.query.calificacion_min,
            search: req.query.search,
            con_certificaciones: req.query.con_certificaciones === 'true'
        };

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;

        const result = await Farm.getFarms(filters, page, limit);

        res.json({
            status: 'success',
            data: result
        });
    })
);

/**
 * GET /api/farms/:id
 * Obtener finca por ID (público)
 */
router.get('/:id',
    optionalAuth,
    asyncHandler(async (req, res) => {
        const farmId = parseInt(req.params.id);

        if (!farmId || farmId <= 0) {
            throw createError('ID de finca inválido', 400);
        }

        const farm = await Farm.findById(farmId);

        if (!farm) {
            throw createError('Finca no encontrada', 404);
        }

        res.json({
            status: 'success',
            data: { farm }
        });
    })
);

/**
 * GET /api/farms/locations/departments
 * Obtener departamentos disponibles
 */
router.get('/locations/departments',
    asyncHandler(async (req, res) => {
        const departments = await Farm.getDepartments();

        res.json({
            status: 'success',
            data: { departments }
        });
    })
);

/**
 * GET /api/farms/locations/municipalities
 * Obtener municipios de un departamento
 */
router.get('/locations/municipalities',
    [
        query('departamento').notEmpty().withMessage('Departamento requerido')
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                errors: errors.array()
            });
        }

        const municipalities = await Farm.getMunicipios(req.query.departamento);

        res.json({
            status: 'success',
            data: { municipalities }
        });
    })
);

/**
 * GET /api/farms/nearby
 * Obtener fincas cercanas
 */
router.get('/nearby/search',
    [
        query('latitud').isFloat().withMessage('Latitud requerida'),
        query('longitud').isFloat().withMessage('Longitud requerida'),
        query('radio').optional().isInt({ min: 1, max: 200 }).withMessage('Radio debe estar entre 1 y 200 km'),
        query('limit').optional().isInt({ min: 1, max: 50 })
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                errors: errors.array()
            });
        }

        const latitud = parseFloat(req.query.latitud);
        const longitud = parseFloat(req.query.longitud);
        const radio = parseInt(req.query.radio) || 50;
        const limit = parseInt(req.query.limit) || 10;

        const nearbyFarms = await Farm.getNearbyFarms(latitud, longitud, radio, limit);

        res.json({
            status: 'success',
            data: { farms: nearbyFarms }
        });
    })
);

// ============================================================
// RUTAS PROTEGIDAS (CAMPESINOS)
// ============================================================

/**
 * POST /api/farms
 * Crear nueva finca (solo campesinos)
 */
router.post('/',
    authenticateToken,
    requireFarmer,
    [
        body('nombre_finca').trim().isLength({ min: 2, max: 150 }).withMessage('Nombre debe tener entre 2 y 150 caracteres'),
        body('ubicacion_departamento').trim().isLength({ min: 2, max: 100 }).withMessage('Departamento requerido'),
        body('ubicacion_municipio').trim().isLength({ min: 2, max: 100 }).withMessage('Municipio requerido'),
        body('direccion').optional().trim().isLength({ max: 500 }),
        body('area_hectareas').isFloat({ min: 0.01 }).withMessage('Área debe ser mayor a 0'),
        body('tipo_cultivo').optional().isIn(['organico', 'tradicional', 'hidroponico', 'mixto']),
        body('descripcion').optional().trim().isLength({ max: 1000 }),
        body('latitud').optional().isFloat({ min: -90, max: 90 }),
        body('longitud').optional().isFloat({ min: -180, max: 180 })
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                errors: errors.array()
            });
        }

        const farmData = {
            usuario_id: req.user.id,
            nombre_finca: req.body.nombre_finca,
            ubicacion_departamento: req.body.ubicacion_departamento,
            ubicacion_municipio: req.body.ubicacion_municipio,
            direccion: req.body.direccion,
            area_hectareas: req.body.area_hectareas,
            tipo_cultivo: req.body.tipo_cultivo,
            descripcion: req.body.descripcion,
            latitud: req.body.latitud,
            longitud: req.body.longitud
        };

        const farm = await Farm.create(farmData);

        res.status(201).json({
            status: 'success',
            message: 'Finca creada exitosamente',
            data: { farm }
        });
    })
);

/**
 * GET /api/farms/my-farm
 * Obtener información de mi finca (solo campesinos)
 */
router.get('/my-farm/info',
    authenticateToken,
    requireFarmer,
    asyncHandler(async (req, res) => {
        const farm = await Farm.findByUserId(req.user.id);

        if (!farm) {
            return res.json({
                status: 'success',
                data: { farm: null }
            });
        }

        res.json({
            status: 'success',
            data: { farm }
        });
    })
);

/**
 * PUT /api/farms/my-farm
 * Actualizar información de mi finca (solo campesinos)
 */
router.put('/my-farm',
    authenticateToken,
    requireFarmer,
    [
        body('nombre_finca').optional().trim().isLength({ min: 2, max: 150 }),
        body('ubicacion_departamento').optional().trim().isLength({ min: 2, max: 100 }),
        body('ubicacion_municipio').optional().trim().isLength({ min: 2, max: 100 }),
        body('direccion').optional().trim().isLength({ max: 500 }),
        body('area_hectareas').optional().isFloat({ min: 0.01 }),
        body('tipo_cultivo').optional().isIn(['organico', 'tradicional', 'hidroponico', 'mixto']),
        body('descripcion').optional().trim().isLength({ max: 1000 }),
        body('latitud').optional().isFloat({ min: -90, max: 90 }),
        body('longitud').optional().isFloat({ min: -180, max: 180 })
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                errors: errors.array()
            });
        }

        const farm = await Farm.findByUserId(req.user.id);
        if (!farm) {
            throw createError('Finca no encontrada', 404);
        }

        const updatedFarm = await Farm.updateFarm(farm.id, req.user.id, req.body);

        res.json({
            status: 'success',
            message: 'Información de finca actualizada exitosamente',
            data: { farm: updatedFarm }
        });
    })
);

/**
 * GET /api/farms/my-farm/stats
 * Obtener estadísticas de mi finca
 */
router.get('/my-farm/stats',
    authenticateToken,
    requireFarmer,
    asyncHandler(async (req, res) => {
        const farm = await Farm.findByUserId(req.user.id);
        if (!farm) {
            throw createError('Finca no encontrada', 404);
        }

        const stats = await Farm.getFarmStats(farm.id);

        res.json({
            status: 'success',
            data: { stats: stats[0] }
        });
    })
);

// ============================================================
// RUTAS DE CERTIFICACIONES
// ============================================================

/**
 * POST /api/farms/my-farm/certifications
 * Agregar certificación a mi finca
 */
router.post('/my-farm/certifications',
    authenticateToken,
    requireFarmer,
    [
        body('nombre').trim().isLength({ min: 2, max: 100 }).withMessage('Nombre requerido'),
        body('descripcion').optional().trim().isLength({ max: 500 }),
        body('entidad_certificadora').trim().isLength({ min: 2, max: 150 }).withMessage('Entidad certificadora requerida'),
        body('fecha_obtencion').isDate().withMessage('Fecha de obtención inválida'),
        body('fecha_vencimiento').optional().isDate(),
        body('archivo_certificado').optional().isString()
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                errors: errors.array()
            });
        }

        const farm = await Farm.findByUserId(req.user.id);
        if (!farm) {
            throw createError('Finca no encontrada', 404);
        }

        const certification = await Farm.addCertification(farm.id, req.user.id, req.body);

        res.status(201).json({
            status: 'success',
            message: 'Certificación agregada exitosamente',
            data: { certification: certification[0] }
        });
    })
);

/**
 * PUT /api/farms/certifications/:id
 * Actualizar certificación
 */
router.put('/certifications/:id',
    authenticateToken,
    requireFarmer,
    [
        body('nombre').optional().trim().isLength({ min: 2, max: 100 }),
        body('descripcion').optional().trim().isLength({ max: 500 }),
        body('entidad_certificadora').optional().trim().isLength({ min: 2, max: 150 }),
        body('fecha_obtencion').optional().isDate(),
        body('fecha_vencimiento').optional().isDate(),
        body('estado').optional().isIn(['vigente', 'vencida', 'en_proceso']),
        body('archivo_certificado').optional().isString()
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                errors: errors.array()
            });
        }

        const certId = parseInt(req.params.id);
        const updatedCertification = await Farm.updateCertification(certId, req.user.id, req.body);

        res.json({
            status: 'success',
            message: 'Certificación actualizada exitosamente',
            data: { certification: updatedCertification[0] }
        });
    })
);

/**
 * DELETE /api/farms/certifications/:id
 * Eliminar certificación
 */
router.delete('/certifications/:id',
    authenticateToken,
    requireFarmer,
    asyncHandler(async (req, res) => {
        const certId = parseInt(req.params.id);
        await Farm.deleteCertification(certId, req.user.id);

        res.json({
            status: 'success',
            message: 'Certificación eliminada exitosamente'
        });
    })
);

module.exports = router;