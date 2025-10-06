// ============================================================
// MODELO DE TRANSPARENCIA DE PRECIOS - CAMPO DIRECTO
// Funcionalidad anti-intermediarios: Comparaciones de precios
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

class PriceTransparency {
    /**
     * Obtener comparación de precios para un producto específico
     */
    static async getProductPriceComparison(productId) {
        return await findOne(`
            SELECT 
                p.id,
                p.nombre,
                p.precio_por_kg as precio_directo,
                p.stock_disponible,
                pm.precio_promedio_mercado,
                pm.precio_minimo_mercado,
                pm.precio_maximo_mercado,
                pm.fuente,
                pm.fecha_actualizacion as fecha_referencia,
                ROUND(((pm.precio_promedio_mercado - p.precio_por_kg) / pm.precio_promedio_mercado) * 100, 2) as ahorro_porcentaje,
                (pm.precio_promedio_mercado - p.precio_por_kg) as ahorro_pesos_por_kg,
                c.nombre as categoria,
                f.ubicacion_departamento,
                f.ubicacion_municipio,
                CONCAT(u.nombre, ' ', u.apellido) as campesino_nombre
            FROM productos p
            JOIN categorias_productos c ON p.categoria_id = c.id
            JOIN usuarios u ON p.usuario_id = u.id
            LEFT JOIN fincas f ON p.finca_id = f.id
            LEFT JOIN precios_mercado pm ON (
                (pm.producto_nombre LIKE CONCAT('%', SUBSTRING_INDEX(p.nombre, ' ', 1), '%') OR
                 pm.categoria_id = p.categoria_id) AND
                (pm.ubicacion_departamento = f.ubicacion_departamento OR pm.ubicacion_departamento IS NULL)
            )
            WHERE p.id = ? AND p.estado = 'disponible'
            ORDER BY pm.fecha_actualizacion DESC
            LIMIT 1
        `, [productId]);
    }

    /**
     * Obtener productos con mayor ahorro vs mercado tradicional
     */
    static async getProductsWithBestSavings(departamento = null, categoria = null, limit = 10) {
        let whereConditions = ['p.estado = "disponible"', 'pm.precio_promedio_mercado > p.precio_por_kg'];
        let params = [];

        if (departamento) {
            whereConditions.push('f.ubicacion_departamento = ?');
            params.push(departamento);
        }

        if (categoria) {
            whereConditions.push('p.categoria_id = ?');
            params.push(categoria);
        }

        const whereClause = whereConditions.join(' AND ');

        return await executeQuery(`
            SELECT 
                p.id,
                p.nombre,
                p.precio_por_kg as precio_directo,
                p.stock_disponible,
                pm.precio_promedio_mercado,
                ROUND(((pm.precio_promedio_mercado - p.precio_por_kg) / pm.precio_promedio_mercado) * 100, 2) as ahorro_porcentaje,
                (pm.precio_promedio_mercado - p.precio_por_kg) as ahorro_pesos_por_kg,
                c.nombre as categoria,
                c.icono as categoria_icono,
                f.ubicacion_departamento,
                f.ubicacion_municipio,
                CONCAT(u.nombre, ' ', u.apellido) as campesino_nombre,
                u.calificacion_promedio as calificacion_campesino,
                p.imagen_principal
            FROM productos p
            JOIN categorias_productos c ON p.categoria_id = c.id
            JOIN usuarios u ON p.usuario_id = u.id
            LEFT JOIN fincas f ON p.finca_id = f.id
            JOIN precios_mercado pm ON (
                (pm.producto_nombre LIKE CONCAT('%', SUBSTRING_INDEX(p.nombre, ' ', 1), '%') OR
                 pm.categoria_id = p.categoria_id) AND
                (pm.ubicacion_departamento = f.ubicacion_departamento OR pm.ubicacion_departamento IS NULL)
            )
            WHERE ${whereClause}
            ORDER BY ahorro_porcentaje DESC
            LIMIT ?
        `, [...params, limit]);
    }

    /**
     * Calcular ahorro estimado para un pedido específico
     */
    static async calculateOrderSavings(items) {
        let totalDirecto = 0;
        let totalMercadoEstimado = 0;
        let productosConComparacion = [];

        for (const item of items) {
            const comparison = await PriceTransparency.getProductPriceComparison(item.producto_id);
            
            if (comparison) {
                const subtotalDirecto = item.cantidad * item.precio_unitario;
                const subtotalMercado = item.cantidad * (comparison.precio_promedio_mercado || item.precio_unitario * 1.3);
                
                totalDirecto += subtotalDirecto;
                totalMercadoEstimado += subtotalMercado;
                
                productosConComparacion.push({
                    ...item,
                    producto_nombre: comparison.nombre,
                    precio_mercado: comparison.precio_promedio_mercado,
                    ahorro_por_kg: comparison.ahorro_pesos_por_kg || 0,
                    ahorro_subtotal: subtotalMercado - subtotalDirecto
                });
            } else {
                // Si no hay comparación, asumimos un 30% de ahorro vs mercado tradicional
                const subtotalDirecto = item.cantidad * item.precio_unitario;
                const subtotalMercado = subtotalDirecto * 1.3;
                
                totalDirecto += subtotalDirecto;
                totalMercadoEstimado += subtotalMercado;
            }
        }

        const ahorroTotal = totalMercadoEstimado - totalDirecto;
        const ahorroPorcentaje = totalMercadoEstimado > 0 
            ? ((ahorroTotal / totalMercadoEstimado) * 100) 
            : 0;

        return {
            total_campo_directo: Math.round(totalDirecto),
            total_mercado_estimado: Math.round(totalMercadoEstimado),
            ahorro_pesos: Math.round(ahorroTotal),
            ahorro_porcentaje: Math.round(ahorroPorcentaje * 100) / 100,
            productos_comparados: productosConComparacion
        };
    }

    /**
     * Obtener historial de precios de un producto
     */
    static async getProductPriceHistory(productId, days = 30) {
        return await executeQuery(`
            SELECT 
                precio_anterior,
                precio_nuevo,
                fecha_cambio,
                motivo,
                CONCAT(u.nombre, ' ', u.apellido) as usuario_nombre
            FROM historial_precios_productos h
            JOIN usuarios u ON h.usuario_id = u.id
            WHERE h.producto_id = ? 
            AND h.fecha_cambio >= DATE_SUB(NOW(), INTERVAL ? DAY)
            ORDER BY h.fecha_cambio DESC
        `, [productId, days]);
    }

    /**
     * Obtener estadísticas de ahorro de un comprador
     */
    static async getBuyerSavingsStats(compradorId) {
        return await findOne(`
            SELECT 
                COUNT(DISTINCT ca.pedido_id) as pedidos_con_ahorro,
                SUM(ca.ahorro_pesos) as ahorro_total_acumulado,
                AVG(ca.ahorro_porcentaje) as ahorro_promedio_porcentaje,
                MAX(ca.ahorro_pesos) as mayor_ahorro_single_pedido,
                SUM(ca.total_campo_directo) as total_gastado_campo_directo,
                SUM(ca.total_mercado_tradicional_estimado) as total_habria_gastado_mercado
            FROM comparaciones_ahorro ca
            JOIN pedidos p ON ca.pedido_id = p.id
            WHERE p.comprador_id = ? AND p.estado = 'completed'
        `, [compradorId]);
    }

    /**
     * Obtener estadísticas de beneficios de un campesino
     */
    static async getFarmerBenefitStats(campesinoId) {
        return await findOne(`
            SELECT 
                COUNT(DISTINCT bc.pedido_id) as pedidos_con_beneficio,
                SUM(bc.beneficio_adicional) as beneficio_total_acumulado,
                AVG(bc.beneficio_porcentaje) as beneficio_promedio_porcentaje,
                MAX(bc.beneficio_adicional) as mayor_beneficio_single_pedido,
                SUM(bc.precio_venta_directo) as ingresos_directos_totales,
                SUM(bc.precio_mercado_tradicional_estimado) as habria_recibido_mercado_tradicional
            FROM beneficios_campesinos bc
            JOIN pedidos p ON bc.pedido_id = p.id
            WHERE bc.usuario_id = ? AND p.estado = 'completed'
        `, [campesinoId]);
    }

    /**
     * Obtener impacto general de la plataforma
     */
    static async getPlatformImpactStats() {
        return await findOne(`
            SELECT 
                COUNT(DISTINCT u_campesino.id) as campesinos_beneficiados,
                COUNT(DISTINCT u_comprador.id) as compradores_beneficiados,
                COUNT(DISTINCT p.id) as pedidos_directos_totales,
                COALESCE(SUM(ca.ahorro_pesos), 0) as ahorro_total_compradores,
                COALESCE(AVG(ca.ahorro_porcentaje), 0) as ahorro_promedio_porcentaje,
                COALESCE(SUM(bc.beneficio_adicional), 0) as beneficio_total_campesinos,
                COALESCE(AVG(bc.beneficio_porcentaje), 0) as beneficio_promedio_campesinos,
                COUNT(DISTINCT CASE WHEN p.fecha_completado >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN p.id END) as pedidos_ultimo_mes,
                COALESCE(SUM(CASE WHEN p.fecha_completado >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN ca.ahorro_pesos ELSE 0 END), 0) as ahorro_ultimo_mes
            FROM pedidos p
            LEFT JOIN comparaciones_ahorro ca ON p.id = ca.pedido_id
            LEFT JOIN beneficios_campesinos bc ON p.id = bc.pedido_id
            JOIN usuarios u_campesino ON p.campesino_id = u_campesino.id
            JOIN usuarios u_comprador ON p.comprador_id = u_comprador.id
            WHERE p.estado = 'completed'
        `);
    }

    /**
     * Obtener productos con precios más justos (comparado con mercado)
     */
    static async getFairPriceProducts(limit = 20) {
        return await executeQuery(`
            SELECT 
                p.id,
                p.nombre,
                p.precio_por_kg as precio_directo,
                pm.precio_promedio_mercado,
                pm.precio_minimo_mercado,
                ROUND(((pm.precio_promedio_mercado - p.precio_por_kg) / pm.precio_promedio_mercado) * 100, 2) as ahorro_porcentaje,
                (pm.precio_promedio_mercado - p.precio_por_kg) as ahorro_pesos_por_kg,
                c.nombre as categoria,
                CONCAT(u.nombre, ' ', u.apellido) as campesino_nombre,
                u.calificacion_promedio as calificacion_campesino,
                f.nombre_finca,
                f.ubicacion_departamento,
                f.ubicacion_municipio,
                p.imagen_principal,
                p.stock_disponible
            FROM productos p
            JOIN categorias_productos c ON p.categoria_id = c.id
            JOIN usuarios u ON p.usuario_id = u.id
            LEFT JOIN fincas f ON p.finca_id = f.id
            JOIN precios_mercado pm ON (
                pm.producto_nombre LIKE CONCAT('%', SUBSTRING_INDEX(p.nombre, ' ', 1), '%') OR
                pm.categoria_id = p.categoria_id
            )
            WHERE p.estado = 'disponible'
            AND pm.precio_promedio_mercado > p.precio_por_kg
            AND p.precio_por_kg >= pm.precio_minimo_mercado * 0.8  -- Precio no suspiciosamente bajo
            ORDER BY 
                (pm.precio_promedio_mercado - p.precio_por_kg) DESC,
                u.calificacion_promedio DESC
            LIMIT ?
        `, [limit]);
    }

    /**
     * Actualizar precios de mercado (función administrativa)
     */
    static async updateMarketPrices(marketData) {
        const queries = marketData.map(item => ({
            query: `
                INSERT INTO precios_mercado 
                (producto_nombre, categoria_id, precio_promedio_mercado, precio_minimo_mercado, precio_maximo_mercado, ubicacion_departamento, fecha_actualizacion, fuente)
                VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?)
                ON DUPLICATE KEY UPDATE
                precio_promedio_mercado = VALUES(precio_promedio_mercado),
                precio_minimo_mercado = VALUES(precio_minimo_mercado),
                precio_maximo_mercado = VALUES(precio_maximo_mercado),
                fecha_actualizacion = CURDATE()
            `,
            params: [
                item.producto_nombre,
                item.categoria_id,
                item.precio_promedio,
                item.precio_minimo,
                item.precio_maximo,
                item.departamento,
                item.fuente || 'SIPSA-DANE'
            ]
        }));

        await executeTransaction(queries);
        return queries.length;
    }

    /**
     * Obtener alertas de oportunidades de ahorro para compradores
     */
    static async getSavingsAlerts(compradorId, departamento = null) {
        let whereCondition = 'p.estado = "disponible" AND pm.precio_promedio_mercado > p.precio_por_kg';
        let params = [];

        if (departamento) {
            whereCondition += ' AND f.ubicacion_departamento = ?';
            params.push(departamento);
        }

        return await executeQuery(`
            SELECT 
                p.id,
                p.nombre,
                p.precio_por_kg,
                pm.precio_promedio_mercado,
                ROUND(((pm.precio_promedio_mercado - p.precio_por_kg) / pm.precio_promedio_mercado) * 100, 2) as ahorro_porcentaje,
                (pm.precio_promedio_mercado - p.precio_por_kg) as ahorro_pesos_por_kg,
                c.nombre as categoria,
                CONCAT(u.nombre, ' ', u.apellido) as campesino_nombre,
                f.ubicacion_departamento,
                f.ubicacion_municipio,
                p.imagen_principal,
                'Ahorro significativo disponible' as tipo_alerta,
                CASE 
                    WHEN ((pm.precio_promedio_mercado - p.precio_por_kg) / pm.precio_promedio_mercado) > 0.4 THEN 'alta'
                    WHEN ((pm.precio_promedio_mercado - p.precio_por_kg) / pm.precio_promedio_mercado) > 0.2 THEN 'media'
                    ELSE 'baja'
                END as prioridad
            FROM productos p
            JOIN categorias_productos c ON p.categoria_id = c.id
            JOIN usuarios u ON p.usuario_id = u.id
            LEFT JOIN fincas f ON p.finca_id = f.id
            JOIN precios_mercado pm ON (
                pm.producto_nombre LIKE CONCAT('%', SUBSTRING_INDEX(p.nombre, ' ', 1), '%') OR
                pm.categoria_id = p.categoria_id
            )
            WHERE ${whereCondition}
            ORDER BY ahorro_porcentaje DESC
            LIMIT 10
        `, params);
    }

    /**
     * Generar reporte de impacto para un período específico
     */
    static async generateImpactReport(startDate, endDate) {
        const report = await findOne(`
            SELECT 
                COUNT(DISTINCT p.id) as pedidos_periodo,
                COUNT(DISTINCT p.comprador_id) as compradores_activos,
                COUNT(DISTINCT p.campesino_id) as campesinos_activos,
                COALESCE(SUM(ca.ahorro_pesos), 0) as ahorro_total_periodo,
                COALESCE(AVG(ca.ahorro_porcentaje), 0) as ahorro_promedio_porcentaje,
                COALESCE(SUM(bc.beneficio_adicional), 0) as beneficio_campesinos_periodo,
                COALESCE(SUM(p.total), 0) as volumen_ventas_directas,
                COALESCE(SUM(ca.total_mercado_tradicional_estimado), 0) as habria_costado_mercado_tradicional
            FROM pedidos p
            LEFT JOIN comparaciones_ahorro ca ON p.id = ca.pedido_id
            LEFT JOIN beneficios_campesinos bc ON p.id = bc.pedido_id
            WHERE p.estado = 'completed'
            AND DATE(p.fecha_completado) BETWEEN ? AND ?
        `, [startDate, endDate]);

        // Obtener top productos con mayor ahorro en el período
        const topSavingsProducts = await executeQuery(`
            SELECT 
                pr.nombre as producto,
                COUNT(dp.id) as veces_vendido,
                SUM(dp.cantidad) as cantidad_total_vendida,
                AVG(pm.precio_promedio_mercado - pr.precio_por_kg) as ahorro_promedio_por_kg,
                SUM((pm.precio_promedio_mercado - pr.precio_por_kg) * dp.cantidad) as ahorro_total_producto
            FROM pedidos p
            JOIN detalle_pedidos dp ON p.id = dp.pedido_id
            JOIN productos pr ON dp.producto_id = pr.id
            LEFT JOIN precios_mercado pm ON (
                pm.producto_nombre LIKE CONCAT('%', SUBSTRING_INDEX(pr.nombre, ' ', 1), '%') OR
                pm.categoria_id = pr.categoria_id
            )
            WHERE p.estado = 'completed'
            AND DATE(p.fecha_completado) BETWEEN ? AND ?
            AND pm.precio_promedio_mercado > pr.precio_por_kg
            GROUP BY pr.id, pr.nombre
            ORDER BY ahorro_total_producto DESC
            LIMIT 5
        `, [startDate, endDate]);

        return {
            resumen_general: report,
            top_productos_ahorro: topSavingsProducts,
            periodo: {
                inicio: startDate,
                fin: endDate
            }
        };
    }
}

module.exports = PriceTransparency;