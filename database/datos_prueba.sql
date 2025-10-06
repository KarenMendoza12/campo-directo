-- ============================================================
-- DATOS DE PRUEBA: CAMPO DIRECTO
-- Fecha de creación: 2025-10-06
-- Descripción: Datos de ejemplo para probar todas las funcionalidades
-- ============================================================

USE campo_directo;

-- ============================================================
-- USUARIOS DE PRUEBA
-- ============================================================

-- Campesinos (con contraseñas hasheadas - para demo usamos hash simple)
-- Contraseña para todos: "123456"
INSERT INTO usuarios (nombre, apellido, email, telefono, tipo_usuario, fecha_nacimiento, password_hash, calificacion_promedio, total_calificaciones) VALUES
('Juan', 'Pérez', 'juan.perez@campo.com', '320-123-4567', 'campesino', '1980-05-15', '$2y$10$example1', 4.8, 25),
('María', 'García', 'maria.garcia@campo.com', '315-987-6543', 'campesino', '1975-08-22', '$2y$10$example2', 4.5, 18),
('Carlos', 'López', 'carlos.lopez@campo.com', '301-456-7890', 'campesino', '1982-12-10', '$2y$10$example3', 4.9, 32),
('Ana', 'Rodríguez', 'ana.rodriguez@campo.com', '312-789-0123', 'campesino', '1978-03-18', '$2y$10$example4', 4.6, 22),
('Pedro', 'Martínez', 'pedro.martinez@campo.com', '318-234-5678', 'campesino', '1985-11-05', '$2y$10$example5', 4.7, 15);

-- Compradores
INSERT INTO usuarios (nombre, apellido, email, telefono, tipo_usuario, fecha_nacimiento, password_hash) VALUES
('Laura', 'Hernández', 'laura.hernandez@email.com', '300-111-2222', 'comprador', '1990-07-12', '$2y$10$comprador1'),
('Diego', 'Torres', 'diego.torres@email.com', '305-333-4444', 'comprador', '1988-09-25', '$2y$10$comprador2'),
('Sandra', 'Gómez', 'sandra.gomez@email.com', '311-555-6666', 'comprador', '1992-04-08', '$2y$10$comprador3'),
('Roberto', 'Jiménez', 'roberto.jimenez@email.com', '317-777-8888', 'comprador', '1985-01-30', '$2y$10$comprador4'),
('Carmen', 'Vargas', 'carmen.vargas@email.com', '314-999-0000', 'comprador', '1993-10-14', '$2y$10$comprador5');

-- ============================================================
-- FINCAS DE LOS CAMPESINOS
-- ============================================================

INSERT INTO fincas (usuario_id, nombre_finca, ubicacion_departamento, ubicacion_municipio, direccion, area_hectareas, tipo_cultivo, descripcion, latitud, longitud) VALUES
(1, 'Finca San José', 'Cundinamarca', 'Chía', 'Vereda El Cercado, Km 2 vía Cota', 5.25, 'organico', 'Finca especializada en vegetales orgánicos con certificación BPA', 4.8587, -74.0586),
(2, 'El Vergel Verde', 'Antioquia', 'Rionegro', 'Corregimiento La Ceja, Finca El Vergel', 3.80, 'hidroponico', 'Cultivos hidropónicos de última tecnología', 6.1553, -75.3736),
(3, 'Hacienda Los Naranjos', 'Valle del Cauca', 'Palmira', 'Corregimiento Rozo, Hacienda Los Naranjos', 12.50, 'mixto', 'Producción diversificada con énfasis en frutas tropicales', 3.5394, -76.3036),
(4, 'Finca Esperanza', 'Boyacá', 'Villa de Leyva', 'Vereda Monquirá Alto', 2.75, 'organico', 'Agricultura familiar sostenible en clima frío', 5.6344, -73.5264),
(5, 'Campo Dorado', 'Tolima', 'Espinal', 'Vereda Chicoral', 8.90, 'tradicional', 'Granos y cereales de la región central', 4.1494, -74.8830);

-- ============================================================
-- CERTIFICACIONES
-- ============================================================

INSERT INTO certificaciones (finca_id, nombre, descripcion, entidad_certificadora, fecha_obtencion, fecha_vencimiento, estado) VALUES
(1, 'Orgánico', 'Certificación de agricultura orgánica', 'ECOCERT Colombia', '2023-01-15', '2026-01-15', 'vigente'),
(1, 'BPA', 'Buenas Prácticas Agrícolas', 'ICA', '2023-03-20', '2025-03-20', 'vigente'),
(1, 'Sostenible', 'Agricultura sostenible', 'Rainforest Alliance', '2023-06-10', '2026-06-10', 'vigente'),
(2, 'Hidroponía Premium', 'Certificación de cultivos hidropónicos', 'ICONTEC', '2023-02-28', '2025-02-28', 'vigente'),
(3, 'GlobalGAP', 'Certificación internacional de calidad', 'GlobalGAP', '2023-04-12', '2025-04-12', 'vigente'),
(4, 'Orgánico', 'Certificación de agricultura orgánica', 'ECOCERT Colombia', '2023-05-18', '2026-05-18', 'vigente'),
(5, 'BPA', 'Buenas Prácticas Agrícolas', 'ICA', '2023-07-22', '2025-07-22', 'vigente');

-- ============================================================
-- PRODUCTOS
-- ============================================================

-- Productos de Juan Pérez (Finca San José)
INSERT INTO productos (usuario_id, finca_id, categoria_id, nombre, descripcion, precio_por_kg, stock_disponible, estado, tags, calidad, fecha_cosecha, peso_minimo_venta, peso_maximo_venta) VALUES
(1, 1, 1, 'Tomates Cherry Orgánicos', 'Tomates cherry cultivados sin químicos, dulces y jugosos', 8000, 25, 'disponible', 'organico,cherry,dulce,fresco', 'premium', '2024-10-01', 0.5, 10.0),
(1, 1, 1, 'Lechugas Crespa Hidropónica', 'Lechugas frescas cultivadas en sistema hidropónico', 3500, 40, 'disponible', 'hidroponico,fresco,lechuga,verde', 'primera', '2024-10-03', 0.25, 5.0),
(1, 1, 1, 'Zanahorias Orgánicas', 'Zanahorias grandes y dulces, cultivadas orgánicamente', 4500, 0, 'agotado', 'organico,zanahoria,dulce,grande', 'primera', '2024-09-28', 0.5, 15.0),
(1, 1, 4, 'Cilantro Fresco', 'Cilantro aromático cultivado orgánicamente', 2800, 15, 'disponible', 'organico,aromatico,cilantro,condimento', 'primera', '2024-10-05', 0.1, 2.0);

-- Productos de María García (El Vergel Verde)
INSERT INTO productos (usuario_id, finca_id, categoria_id, nombre, descripcion, precio_por_kg, stock_disponible, estado, tags, calidad, fecha_cosecha) VALUES
(2, 2, 2, 'Fresas Premium', 'Fresas dulces cultivadas en invernadero hidropónico', 15000, 10, 'disponible', 'hidroponico,dulce,fresa,premium', 'premium', '2024-10-04'),
(2, 2, 1, 'Pimientos Rojos', 'Pimientos rojos grandes y carnosos', 6500, 18, 'disponible', 'hidroponico,pimiento,rojo,carnoso', 'primera', '2024-10-02'),
(2, 2, 1, 'Pepinos Largos', 'Pepinos hidropónicos largos y crujientes', 4200, 30, 'disponible', 'hidroponico,pepino,largo,crujiente', 'primera', '2024-10-05'),
(2, 2, 4, 'Albahaca Gourmet', 'Albahaca aromática de calidad gourmet', 12000, 8, 'disponible', 'hidroponico,albahaca,gourmet,aromatica', 'premium', '2024-10-06');

-- Productos de Carlos López (Hacienda Los Naranjos)
INSERT INTO productos (usuario_id, finca_id, categoria_id, nombre, descripcion, precio_por_kg, stock_disponible, estado, tags, calidad, fecha_cosecha) VALUES
(3, 3, 2, 'Naranjas Valencia', 'Naranjas jugosas perfectas para jugo', 3800, 50, 'disponible', 'citrico,naranja,jugosa,valencia', 'primera', '2024-10-01'),
(3, 3, 2, 'Mangos Tommy', 'Mangos dulces y aromáticos variedad Tommy', 8500, 22, 'disponible', 'mango,tommy,dulce,tropical', 'premium', '2024-09-30'),
(3, 3, 2, 'Aguacates Hass', 'Aguacates Hass cremosos y nutritivos', 12000, 35, 'disponible', 'aguacate,hass,cremoso,nutritivo', 'primera', '2024-10-03'),
(3, 3, 1, 'Tomates Chonto', 'Tomates chonto para cocinar', 5200, 28, 'disponible', 'tomate,chonto,cocina,rojo', 'primera', '2024-10-02');

-- Productos de Ana Rodríguez (Finca Esperanza)
INSERT INTO productos (usuario_id, finca_id, categoria_id, nombre, descripcion, precio_por_kg, stock_disponible, estado, tags, calidad, fecha_cosecha) VALUES
(4, 4, 5, 'Papas Criollas', 'Papas criollas pequeñas y sabrosas', 6800, 45, 'disponible', 'organico,papa,criolla,sabrosa', 'primera', '2024-09-25'),
(4, 4, 1, 'Brócoli Orgánico', 'Brócoli fresco cultivado orgánicamente', 7500, 12, 'disponible', 'organico,brocoli,fresco,verde', 'premium', '2024-10-04'),
(4, 4, 4, 'Romero Aromático', 'Romero fresco muy aromático', 18000, 5, 'disponible', 'organico,romero,aromatico,condimento', 'premium', '2024-10-05'),
(4, 4, 1, 'Espinacas Tiernas', 'Espinacas tiernas ideales para ensaladas', 4800, 20, 'disponible', 'organico,espinaca,tierna,ensalada', 'primera', '2024-10-06');

-- Productos de Pedro Martínez (Campo Dorado)
INSERT INTO productos (usuario_id, finca_id, categoria_id, nombre, descripcion, precio_por_kg, stock_disponible, estado, tags, calidad, fecha_cosecha) VALUES
(5, 5, 3, 'Arroz Blanco Premium', 'Arroz blanco de grano largo de primera calidad', 4200, 100, 'disponible', 'arroz,blanco,grano largo,premium', 'premium', '2024-09-20'),
(5, 5, 3, 'Fríjol Cargamanto', 'Fríjol cargamanto rojo tradicional', 8500, 60, 'disponible', 'frijol,cargamanto,rojo,tradicional', 'primera', '2024-09-15'),
(5, 5, 3, 'Maíz Amarillo', 'Maíz amarillo dulce para mazorcas', 5800, 80, 'disponible', 'maiz,amarillo,dulce,mazorca', 'primera', '2024-09-18'),
(5, 5, 1, 'Cebolla Cabezona', 'Cebolla cabezona blanca grande', 3200, 40, 'disponible', 'cebolla,cabezona,blanca,condimento', 'primera', '2024-09-22');

-- ============================================================
-- PEDIDOS DE PRUEBA
-- ============================================================

-- Pedidos pendientes
INSERT INTO pedidos (id, comprador_id, campesino_id, total, estado, telefono_contacto, fecha_entrega_programada, direccion_entrega, notas_comprador) VALUES
('ORD-001', 6, 1, 41500, 'pending', '300-111-2222', '2024-10-07', 'Calle 100 #15-20, Bogotá', 'Necesito los productos frescos para un evento'),
('ORD-002', 7, 2, 30000, 'pending', '305-333-4444', '2024-10-08', 'Carrera 50 #30-15, Medellín', 'Entrega en horas de la mañana por favor'),
('ORD-003', 8, 4, 18000, 'confirmed', '311-555-6666', '2024-10-09', 'Avenida 68 #40-30, Bogotá', 'Apartamento 502, portería entrega hasta las 6pm');

-- Pedidos completados
INSERT INTO pedidos (id, comprador_id, campesino_id, total, estado, telefono_contacto, fecha_entrega_programada, fecha_completado, direccion_entrega, calificacion_comprador, calificacion_campesino, comentario_calificacion) VALUES
('ORD-004', 9, 3, 45600, 'completed', '317-777-8888', '2024-10-05', '2024-10-05 16:30:00', 'Calle 85 #12-34, Cali', 5, 5, 'Excelente calidad y puntualidad en la entrega'),
('ORD-005', 10, 5, 28400, 'completed', '314-999-0000', '2024-10-04', '2024-10-04 14:15:00', 'Carrera 15 #22-18, Ibagué', 4, 5, 'Muy buenos productos, el arroz está excelente'),
('ORD-006', 6, 2, 67500, 'completed', '300-111-2222', '2024-10-03', '2024-10-03 11:45:00', 'Calle 100 #15-20, Bogotá', 5, 4, 'Fresas deliciosas, volveré a comprar');

-- ============================================================
-- DETALLE DE PEDIDOS
-- ============================================================

-- Detalles para ORD-001
INSERT INTO detalle_pedidos (pedido_id, producto_id, cantidad, precio_unitario, subtotal) VALUES
('ORD-001', 1, 3.0, 8000, 24000),
('ORD-001', 2, 5.0, 3500, 17500);

-- Detalles para ORD-002
INSERT INTO detalle_pedidos (pedido_id, producto_id, cantidad, precio_unitario, subtotal) VALUES
('ORD-002', 5, 2.0, 15000, 30000);

-- Detalles para ORD-003
INSERT INTO detalle_pedidos (pedido_id, producto_id, cantidad, precio_unitario, subtotal) VALUES
('ORD-003', 9, 4.0, 4500, 18000);

-- Detalles para ORD-004
INSERT INTO detalle_pedidos (pedido_id, producto_id, cantidad, precio_unitario, subtotal) VALUES
('ORD-004', 11, 3.0, 8500, 25500),
('ORD-004', 12, 2.0, 12000, 24000);

-- Detalles para ORD-005
INSERT INTO detalle_pedidos (pedido_id, producto_id, cantidad, precio_unitario, subtotal) VALUES
('ORD-005', 17, 5.0, 4200, 21000),
('ORD-005', 18, 1.0, 8500, 8500);

-- Detalles para ORD-006
INSERT INTO detalle_pedidos (pedido_id, producto_id, cantidad, precio_unitario, subtotal) VALUES
('ORD-006', 5, 3.0, 15000, 45000),
('ORD-006', 8, 2.0, 12000, 24000);

-- ============================================================
-- ACTIVIDADES RECIENTES
-- ============================================================

INSERT INTO actividades_recientes (usuario_id, tipo, descripcion, entidad_tipo, entidad_id) VALUES
-- Actividades de Juan Pérez
(1, 'completed', 'Pedido completado - Tomates orgánicos (5kg)', 'pedido', 'ORD-001'),
(1, 'product', 'Nuevo producto agregado - Cilantro Fresco', 'producto', '4'),
(1, 'contact', 'Contacto vía WhatsApp con Laura Hernández', 'usuario', '6'),
(1, 'success', 'Stock actualizado - Lechugas Crespa', 'producto', '2'),
(1, 'info', 'Calificación recibida: 5 estrellas', 'pedido', 'ORD-001'),

-- Actividades de María García
(2, 'completed', 'Pedido ORD-002 marcado como completado', 'pedido', 'ORD-002'),
(2, 'product', 'Producto actualizado - Fresas Premium', 'producto', '5'),
(2, 'contact', 'Llamada a Diego Torres', 'usuario', '7'),
(2, 'warning', 'Stock bajo en Albahaca Gourmet', 'producto', '8'),

-- Actividades de Carlos López
(3, 'completed', 'Pedido ORD-004 entregado exitosamente', 'pedido', 'ORD-004'),
(3, 'success', 'Nueva cosecha disponible - Mangos Tommy', 'producto', '10'),
(3, 'contact', 'SMS enviado a Roberto Jiménez', 'usuario', '9'),

-- Actividades de Ana Rodríguez
(4, 'product', 'Nuevo lote agregado - Espinacas Tiernas', 'producto', '16'),
(4, 'info', 'Certificación orgánica renovada', 'finca', '4'),
(4, 'success', 'Pedido ORD-003 confirmado', 'pedido', 'ORD-003'),

-- Actividades de Pedro Martínez
(5, 'completed', 'Pedido ORD-005 completado con éxito', 'pedido', 'ORD-005'),
(5, 'product', 'Stock actualizado - Arroz Blanco Premium', 'producto', '17'),
(5, 'success', 'Nueva cosecha procesada - Fríjol Cargamanto', 'producto', '18');

-- ============================================================
-- ESTADÍSTICAS INICIALES
-- ============================================================

-- Estadísticas mensuales para octubre 2024
INSERT INTO estadisticas_usuarios (usuario_id, periodo_tipo, periodo_fecha, productos_activos, productos_vendidos, ingresos_total, pedidos_completados, pedidos_cancelados, calificacion_promedio) VALUES
(1, 'mensual', '2024-10-01', 3, 8, 195600, 4, 0, 4.8),
(2, 'mensual', '2024-10-01', 4, 12, 287300, 6, 1, 4.5),
(3, 'mensual', '2024-10-01', 4, 15, 420800, 8, 0, 4.9),
(4, 'mensual', '2024-10-01', 4, 6, 156200, 3, 0, 4.6),
(5, 'mensual', '2024-10-01', 4, 18, 312450, 9, 1, 4.7);

-- Estadísticas para compradores
INSERT INTO estadisticas_usuarios (usuario_id, periodo_tipo, periodo_fecha, pedidos_realizados, monto_gastado, productos_comprados, campesinos_contactados) VALUES
(6, 'mensual', '2024-10-01', 3, 154000, 18, 3),
(7, 'mensual', '2024-10-01', 2, 89500, 8, 2),
(8, 'mensual', '2024-10-01', 1, 18000, 4, 1),
(9, 'mensual', '2024-10-01', 2, 78900, 12, 2),
(10, 'mensual', '2024-10-01', 1, 28400, 6, 1);

-- ============================================================
-- SESIONES DE EJEMPLO (Solo para demostración)
-- ============================================================

INSERT INTO sesiones (id, usuario_id, ip_address, user_agent, fecha_expiracion, activa, remember_me) VALUES
('sess_juan_123456789', 1, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', DATE_ADD(NOW(), INTERVAL 30 DAY), TRUE, TRUE),
('sess_maria_987654321', 2, '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', DATE_ADD(NOW(), INTERVAL 1 DAY), TRUE, FALSE);

-- ============================================================
-- COMENTARIOS SOBRE LOS DATOS DE PRUEBA
-- ============================================================

/*
DATOS INCLUIDOS:
✅ 5 Campesinos con información completa
✅ 5 Compradores para pruebas
✅ 5 Fincas con ubicaciones reales de Colombia
✅ 7 Certificaciones distribuidas entre las fincas
✅ 20 Productos variados en todas las categorías
✅ 6 Pedidos (3 pendientes, 3 completados)
✅ Detalles de pedidos con productos reales
✅ 20+ Actividades recientes distribuidas entre usuarios
✅ Estadísticas mensuales para todos los usuarios
✅ 2 Sesiones de ejemplo

CARACTERÍSTICAS DE LOS DATOS:
- Precios realistas en pesos colombianos
- Productos estacionales con fechas de cosecha recientes
- Ubicaciones geográficas reales de Colombia
- Certificaciones comunes en agricultura colombiana
- Stocks variados (algunos agotados para pruebas)
- Calificaciones realistas entre 4.5 y 4.9
- Actividades recientes con timestamps graduales

USUARIOS DE PRUEBA:
Campesinos: juan.perez@campo.com, maria.garcia@campo.com, etc.
Compradores: laura.hernandez@email.com, diego.torres@email.com, etc.
Contraseña para todos: "123456" (en producción usar hash real)

PARA TESTING:
- Prueba filtros por categoría (vegetales, frutas, granos, etc.)
- Prueba estados de productos (disponible, agotado)
- Prueba estados de pedidos (pending, completed)
- Prueba actividades por tipo y fecha
- Prueba estadísticas mensuales
*/