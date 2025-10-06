// ============================================================
// RUTAS DE DASHBOARD - CAMPO DIRECTO
// ============================================================

const express = require('express');
const { executeQuery, findOne, insert } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const User = require('../models/User');

const router = express.Router();

/**
 * GET /api/dashboard/stats
 * Obtener estadísticas del dashboard
 */
router.get('/stats', asyncHandler(async (req, res) => {
    const stats = await User.getStats(req.user.id, req.user.tipo_usuario);
    
    res.json({
        status: 'success',
        data: { stats: stats[0] }
    });
}));

/**
 * GET /api/dashboard/activities
 * Obtener actividades recientes
 */
router.get('/activities', asyncHandler(async (req, res) => {
    const activities = await executeQuery(`
        SELECT 
            id,
            tipo,
            descripcion,
            entidad_tipo,
            entidad_id,
            fecha_actividad
        FROM actividades_recientes
        WHERE usuario_id = ?
        ORDER BY fecha_actividad DESC
        LIMIT 20
    `, [req.user.id]);

    res.json({
        status: 'success',
        data: { activities }
    });
}));

/**
 * POST /api/dashboard/activities
 * Registrar nueva actividad
 */
router.post('/activities', asyncHandler(async (req, res) => {
    const { tipo, descripcion, entidad_tipo, entidad_id } = req.body;
    
    const activityId = await insert('actividades_recientes', {
        usuario_id: req.user.id,
        tipo,
        descripcion,
        entidad_tipo: entidad_tipo || null,
        entidad_id: entidad_id || null
    });

    res.status(201).json({
        status: 'success',
        message: 'Actividad registrada',
        data: { id: activityId }
    });
}));

module.exports = router;