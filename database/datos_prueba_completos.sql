-- ============================================================
-- DATOS DE PRUEBA COMPLETOS - CAMPO DIRECTO
-- ============================================================

USE campo_directo;

-- Insertar usuarios de prueba (las contraseñas se hashearán automáticamente por el backend)
INSERT INTO usuarios (nombre, email, telefono, tipo_usuario, password, created_at, updated_at) VALUES
('Juan Carlos Pérez', 'campesino@test.com', '3001234567', 'campesino', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), NOW()),
('María González', 'comprador@test.com', '3007654321', 'comprador', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), NOW()),
('Pedro Ramírez', 'campesino2@test.com', '3001111111', 'campesino', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), NOW()),
('Ana Torres', 'comprador2@test.com', '3002222222', 'comprador', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), NOW());

-- Insertar fincas de prueba
INSERT INTO fincas (nombre, propietario_id, ubicacion, area_hectareas, certificaciones, descripcion, created_at, updated_at) VALUES
('Finca San José', 1, 'Vereda El Carmen, Fresno, Tolima', 15.5, JSON_ARRAY('organico', 'bpa'), 'Finca especializada en cultivos orgánicos de frutas y verduras', NOW(), NOW()),
('Granja La Esperanza', 3, 'Vereda La Palma, Ibagué, Tolima', 8.2, JSON_ARRAY('comercio_justo'), 'Producción sostenible de hortalizas y hierbas aromáticas', NOW(), NOW());

-- Insertar productos de prueba
INSERT INTO productos (nombre, finca_id, categoria, precio_kg, cantidad_disponible, descripcion, imagen_url, activo, created_at, updated_at) VALUES
('Tomate Cherry Orgánico', 1, 'verduras', 5500, 150, 'Tomates cherry cultivados orgánicamente, perfectos para ensaladas', '/uploads/products/tomate-cherry.jpg', TRUE, NOW(), NOW()),
('Lechuga Crespa', 1, 'verduras', 3200, 80, 'Lechuga fresca y crujiente, ideal para ensaladas', '/uploads/products/lechuga.jpg', TRUE, NOW(), NOW()),
('Mango Tommy', 1, 'frutas', 4800, 200, 'Mangos dulces y jugosos de primera calidad', '/uploads/products/mango.jpg', TRUE, NOW(), NOW()),
('Albahaca Fresca', 2, 'hierbas', 8500, 25, 'Albahaca aromática, perfecta para cocina italiana', '/uploads/products/albahaca.jpg', TRUE, NOW(), NOW()),
('Zanahoria Criolla', 2, 'verduras', 2800, 120, 'Zanahorias frescas y dulces, cultivadas naturalmente', '/uploads/products/zanahoria.jpg', TRUE, NOW(), NOW());

-- Insertar pedidos de prueba
INSERT INTO pedidos (comprador_id, producto_id, cantidad_kg, precio_total, estado, fecha_entrega, notas, created_at, updated_at) VALUES
(2, 1, 25, 137500, 'pendiente', DATE_ADD(CURRENT_DATE, INTERVAL 3 DAY), 'Entregar en la mañana, antes de las 10 AM', NOW(), NOW()),
(4, 3, 15, 72000, 'confirmado', DATE_ADD(CURRENT_DATE, INTERVAL 5 DAY), 'Producto para restaurante, verificar calidad', NOW(), NOW()),
(2, 5, 30, 84000, 'en_preparacion', DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY), 'Para mercado local', NOW(), NOW());

-- Insertar precios de mercado de referencia (SIPSA-DANE)
INSERT INTO precios_mercado (producto_categoria, precio_promedio_kg, fecha_precio, fuente, created_at, updated_at) VALUES
('verduras', 6500, CURRENT_DATE, 'SIPSA-DANE', NOW(), NOW()),
('frutas', 5800, CURRENT_DATE, 'SIPSA-DANE', NOW(), NOW()),
('hierbas', 12000, CURRENT_DATE, 'SIPSA-DANE', NOW(), NOW());

-- Insertar conversaciones de prueba
INSERT INTO conversaciones (id, participante1_id, participante2_id, ultimo_mensaje_id, created_at, updated_at) VALUES
('conv_1_2', 1, 2, NULL, NOW(), NOW()),
('conv_3_4', 3, 4, NULL, NOW(), NOW());

-- Insertar mensajes de prueba
INSERT INTO mensajes (conversacion_id, emisor_id, receptor_id, contenido, tipo_mensaje, metadata, leido, created_at, updated_at) VALUES
('conv_1_2', 1, 2, '¡Hola! Tengo tomates cherry orgánicos frescos disponibles. ¿Te interesan?', 'text', NULL, FALSE, NOW(), NOW()),
('conv_1_2', 2, 1, '¡Perfecto! Me interesan mucho. ¿Qué precio manejas?', 'text', NULL, TRUE, NOW(), NOW()),
('conv_1_2', 1, 2, 'Te puedo hacer un precio especial de $5200/kg para pedidos mayores a 20kg', 'price_offer', JSON_OBJECT('producto_id', 1, 'precio_ofertado', 5200, 'cantidad_minima', 20), FALSE, NOW(), NOW()),
('conv_3_4', 3, 4, 'Buenos días, tengo albahaca fresca recién cosechada', 'text', NULL, FALSE, NOW(), NOW());

-- Actualizar último_mensaje_id en conversaciones
UPDATE conversaciones SET ultimo_mensaje_id = 3 WHERE id = 'conv_1_2';
UPDATE conversaciones SET ultimo_mensaje_id = 4 WHERE id = 'conv_3_4';

-- Insertar comparaciones de precios
INSERT INTO comparaciones_precios (producto_id, precio_directo, precio_mercado_tradicional, ahorro_pesos, ahorro_porcentaje, created_at, updated_at) VALUES
(1, 5500, 6500, 1000, 15.38, NOW(), NOW()),
(2, 3200, 4000, 800, 20.00, NOW(), NOW()),
(3, 4800, 5800, 1000, 17.24, NOW(), NOW()),
(4, 8500, 12000, 3500, 29.17, NOW(), NOW()),
(5, 2800, 3500, 700, 20.00, NOW(), NOW());

-- Insertar alertas de ahorro
INSERT INTO alertas_ahorro (usuario_id, producto_id, precio_objetivo, activa, created_at, updated_at) VALUES
(2, 1, 5000, TRUE, NOW(), NOW()),
(4, 4, 8000, TRUE, NOW(), NOW());

-- Insertar beneficios para campesinos
INSERT INTO beneficios_campesinos (campesino_id, total_ingresos_extra, numero_ventas_directas, promedio_ahorro_logistica, created_at, updated_at) VALUES
(1, 125000, 15, 2500, NOW(), NOW()),
(3, 85000, 8, 3200, NOW(), NOW());

-- Insertar ahorros para compradores
INSERT INTO ahorros_compradores (comprador_id, total_ahorrado, numero_compras_directas, promedio_ahorro_compra, created_at, updated_at) VALUES
(2, 45000, 12, 3750, NOW(), NOW()),
(4, 28000, 6, 4667, NOW(), NOW());

COMMIT;

-- ============================================================
-- INFORMACIÓN DE USUARIOS DE PRUEBA
-- ============================================================

/*
USUARIOS DE PRUEBA CREADOS:

1. CAMPESINO (Productor):
   Email: campesino@test.com
   Password: password123
   Nombre: Juan Carlos Pérez
   Tipo: campesino
   
2. COMPRADOR (Cliente):
   Email: comprador@test.com  
   Password: password123
   Nombre: María González
   Tipo: comprador

3. CAMPESINO 2:
   Email: campesino2@test.com
   Password: password123
   Nombre: Pedro Ramírez
   Tipo: campesino

4. COMPRADOR 2:
   Email: comprador2@test.com
   Password: password123
   Nombre: Ana Torres
   Tipo: comprador

NOTA: Todos los usuarios tienen la misma contraseña: "password123"
El hash mostrado en la BD corresponde a esta contraseña.
*/