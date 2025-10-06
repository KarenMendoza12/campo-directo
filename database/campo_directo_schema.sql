-- ============================================================
-- ESQUEMA DE BASE DE DATOS: CAMPO DIRECTO
-- Fecha de creación: 2025-10-06
-- Descripción: Base de datos completa para la plataforma Campo Directo
-- ============================================================

-- Eliminar base de datos si existe (para desarrollo)
-- DROP DATABASE IF EXISTS campo_directo;

-- Crear base de datos
CREATE DATABASE campo_directo
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_spanish_ci;

USE campo_directo;

-- ============================================================
-- TABLA: usuarios
-- Descripción: Almacena información de usuarios (campesinos y compradores)
-- ============================================================
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    tipo_usuario ENUM('campesino', 'comprador') NOT NULL DEFAULT 'campesino',
    fecha_nacimiento DATE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    estado ENUM('activo', 'inactivo', 'suspendido') NOT NULL DEFAULT 'activo',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ultimo_login TIMESTAMP NULL,
    avatar VARCHAR(255) DEFAULT NULL,
    calificacion_promedio DECIMAL(2,1) DEFAULT 0.0,
    total_calificaciones INT DEFAULT 0,
    
    INDEX idx_email (email),
    INDEX idx_tipo_usuario (tipo_usuario),
    INDEX idx_estado (estado)
);

-- ============================================================
-- TABLA: fincas
-- Descripción: Información específica de las fincas de los campesinos
-- ============================================================
CREATE TABLE fincas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    nombre_finca VARCHAR(150) NOT NULL,
    ubicacion_departamento VARCHAR(100) NOT NULL,
    ubicacion_municipio VARCHAR(100) NOT NULL,
    direccion TEXT,
    area_hectareas DECIMAL(10,2) NOT NULL,
    tipo_cultivo ENUM('organico', 'tradicional', 'hidroponico', 'mixto') NOT NULL DEFAULT 'organico',
    descripcion TEXT,
    latitud DECIMAL(10, 8) NULL,
    longitud DECIMAL(11, 8) NULL,
    estado ENUM('activa', 'inactiva', 'en_revision') NOT NULL DEFAULT 'activa',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_ubicacion (ubicacion_departamento, ubicacion_municipio),
    INDEX idx_estado (estado)
);

-- ============================================================
-- TABLA: certificaciones
-- Descripción: Certificaciones de calidad de las fincas
-- ============================================================
CREATE TABLE certificaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    finca_id INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    entidad_certificadora VARCHAR(150),
    fecha_obtencion DATE NOT NULL,
    fecha_vencimiento DATE,
    estado ENUM('vigente', 'vencida', 'en_proceso') NOT NULL DEFAULT 'vigente',
    archivo_certificado VARCHAR(255),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (finca_id) REFERENCES fincas(id) ON DELETE CASCADE,
    INDEX idx_finca_id (finca_id),
    INDEX idx_estado (estado)
);

-- ============================================================
-- TABLA: categorias_productos
-- Descripción: Categorías de productos agrícolas
-- ============================================================
CREATE TABLE categorias_productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    icono VARCHAR(50) DEFAULT '🌱',
    estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar categorías iniciales
INSERT INTO categorias_productos (nombre, descripcion, icono) VALUES
('vegetales', 'Verduras y hortalizas frescas', '🥬'),
('frutas', 'Frutas de temporada y tropicales', '🍎'),
('granos', 'Cereales y legumbres', '🌾'),
('hierbas', 'Hierbas aromáticas y medicinales', '🌿'),
('tuberculos', 'Papas, yuca, ñame y similares', '🥔'),
('condimentos', 'Especias y condimentos naturales', '🌶️');

-- ============================================================
-- TABLA: productos
-- Descripción: Catálogo de productos de los campesinos
-- ============================================================
CREATE TABLE productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    finca_id INT NOT NULL,
    categoria_id INT NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    precio_por_kg DECIMAL(10,2) NOT NULL,
    stock_disponible INT NOT NULL DEFAULT 0,
    unidad_medida ENUM('kg', 'gramo', 'unidad', 'libra', 'arroba') NOT NULL DEFAULT 'kg',
    estado ENUM('disponible', 'agotado', 'temporada', 'inactivo') NOT NULL DEFAULT 'disponible',
    imagen_principal VARCHAR(255),
    galeria_imagenes JSON,
    tags VARCHAR(500), -- Para búsquedas: orgánico, fresco, etc.
    calidad ENUM('premium', 'primera', 'segunda') NOT NULL DEFAULT 'primera',
    fecha_cosecha DATE,
    fecha_vencimiento DATE,
    peso_minimo_venta DECIMAL(8,2) DEFAULT 0.5,
    peso_maximo_venta DECIMAL(8,2) DEFAULT 100.0,
    disponible_entrega_inmediata BOOLEAN DEFAULT TRUE,
    tiempo_preparacion_dias INT DEFAULT 1,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (finca_id) REFERENCES fincas(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_id) REFERENCES categorias_productos(id),
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_categoria_id (categoria_id),
    INDEX idx_estado (estado),
    INDEX idx_precio (precio_por_kg),
    INDEX idx_stock (stock_disponible),
    FULLTEXT idx_busqueda (nombre, descripcion, tags)
);

-- ============================================================
-- TABLA: pedidos
-- Descripción: Órdenes de compra realizadas por compradores
-- ============================================================
CREATE TABLE pedidos (
    id VARCHAR(20) PRIMARY KEY, -- Format: ORD-XXXXX
    comprador_id INT NOT NULL,
    campesino_id INT NOT NULL,
    total DECIMAL(12,2) NOT NULL,
    estado ENUM('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    metodo_pago ENUM('efectivo', 'transferencia', 'tarjeta', 'otro') DEFAULT 'efectivo',
    notas_comprador TEXT,
    notas_campesino TEXT,
    fecha_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_confirmacion TIMESTAMP NULL,
    fecha_preparacion TIMESTAMP NULL,
    fecha_entrega TIMESTAMP NULL,
    fecha_completado TIMESTAMP NULL,
    
    -- Información de entrega
    direccion_entrega TEXT,
    telefono_contacto VARCHAR(20),
    fecha_entrega_programada DATE,
    hora_entrega_programada TIME,
    
    -- Información de seguimiento
    codigo_seguimiento VARCHAR(50) UNIQUE,
    calificacion_comprador INT CHECK (calificacion_comprador BETWEEN 1 AND 5),
    calificacion_campesino INT CHECK (calificacion_campesino BETWEEN 1 AND 5),
    comentario_calificacion TEXT,
    
    FOREIGN KEY (comprador_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    FOREIGN KEY (campesino_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    INDEX idx_comprador_id (comprador_id),
    INDEX idx_campesino_id (campesino_id),
    INDEX idx_estado (estado),
    INDEX idx_fecha_pedido (fecha_pedido),
    INDEX idx_codigo_seguimiento (codigo_seguimiento)
);

-- ============================================================
-- TABLA: detalle_pedidos
-- Descripción: Detalle de productos en cada pedido
-- ============================================================
CREATE TABLE detalle_pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id VARCHAR(20) NOT NULL,
    producto_id INT NOT NULL,
    cantidad DECIMAL(8,2) NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    notas_producto TEXT,
    
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT,
    INDEX idx_pedido_id (pedido_id),
    INDEX idx_producto_id (producto_id)
);

-- ============================================================
-- TABLA: actividades_recientes
-- Descripción: Log de actividades del usuario para el dashboard
-- ============================================================
CREATE TABLE actividades_recientes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    tipo ENUM('completed', 'contact', 'product', 'order', 'info', 'warning', 'success') NOT NULL,
    descripcion TEXT NOT NULL,
    entidad_tipo ENUM('pedido', 'producto', 'usuario', 'finca') NULL,
    entidad_id VARCHAR(50) NULL, -- ID de la entidad relacionada
    metadata JSON, -- Información adicional en formato JSON
    fecha_actividad TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_tipo (tipo),
    INDEX idx_fecha (fecha_actividad)
);

-- ============================================================
-- TABLA: sesiones
-- Descripción: Control de sesiones de usuario
-- ============================================================
CREATE TABLE sesiones (
    id VARCHAR(128) PRIMARY KEY,
    usuario_id INT NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_ultima_actividad TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    fecha_expiracion TIMESTAMP NOT NULL,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    remember_me BOOLEAN NOT NULL DEFAULT FALSE,
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_activa (activa),
    INDEX idx_fecha_expiracion (fecha_expiracion)
);

-- ============================================================
-- TABLA: estadisticas_usuarios
-- Descripción: Estadísticas de rendimiento de usuarios
-- ============================================================
CREATE TABLE estadisticas_usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    periodo_tipo ENUM('diario', 'semanal', 'mensual', 'anual') NOT NULL,
    periodo_fecha DATE NOT NULL,
    
    -- Estadísticas para campesinos
    productos_activos INT DEFAULT 0,
    productos_vendidos INT DEFAULT 0,
    ingresos_total DECIMAL(15,2) DEFAULT 0.00,
    pedidos_completados INT DEFAULT 0,
    pedidos_cancelados INT DEFAULT 0,
    calificacion_promedio DECIMAL(2,1) DEFAULT 0.0,
    
    -- Estadísticas para compradores
    pedidos_realizados INT DEFAULT 0,
    monto_gastado DECIMAL(15,2) DEFAULT 0.00,
    productos_comprados INT DEFAULT 0,
    campesinos_contactados INT DEFAULT 0,
    
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE KEY unique_periodo (usuario_id, periodo_tipo, periodo_fecha),
    INDEX idx_usuario_periodo (usuario_id, periodo_tipo),
    INDEX idx_fecha (periodo_fecha)
);

-- ============================================================
-- TABLA: configuracion_sistema
-- Descripción: Configuraciones globales del sistema
-- ============================================================
CREATE TABLE configuracion_sistema (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    descripcion TEXT,
    tipo ENUM('string', 'number', 'boolean', 'json') NOT NULL DEFAULT 'string',
    categoria VARCHAR(50) NOT NULL DEFAULT 'general',
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insertar configuraciones iniciales
INSERT INTO configuracion_sistema (clave, valor, descripcion, tipo, categoria) VALUES
('app_name', 'Campo Directo', 'Nombre de la aplicación', 'string', 'general'),
('app_version', '1.0.0', 'Versión de la aplicación', 'string', 'general'),
('max_productos_por_usuario', '50', 'Máximo de productos por usuario', 'number', 'limites'),
('dias_expiracion_sesion', '30', 'Días de expiración de sesión', 'number', 'seguridad'),
('email_notificaciones', 'true', 'Activar notificaciones por email', 'boolean', 'notificaciones'),
('comision_plataforma', '5.0', 'Porcentaje de comisión de la plataforma', 'number', 'pagos');

-- ============================================================
-- VISTAS ÚTILES
-- ============================================================

-- Vista de productos con información completa
CREATE VIEW vista_productos_completa AS
SELECT 
    p.id,
    p.nombre,
    p.descripcion,
    p.precio_por_kg,
    p.stock_disponible,
    p.estado,
    p.unidad_medida,
    c.nombre AS categoria,
    CONCAT(u.nombre, ' ', u.apellido) AS campesino,
    u.calificacion_promedio AS calificacion_campesino,
    f.nombre_finca,
    f.ubicacion_departamento,
    f.ubicacion_municipio,
    p.fecha_creacion,
    p.fecha_actualizacion
FROM productos p
JOIN categorias_productos c ON p.categoria_id = c.id
JOIN usuarios u ON p.usuario_id = u.id
JOIN fincas f ON p.finca_id = f.id
WHERE p.estado != 'inactivo'
ORDER BY p.fecha_actualizacion DESC;

-- Vista de pedidos con información completa
CREATE VIEW vista_pedidos_completa AS
SELECT 
    p.id,
    p.total,
    p.estado,
    p.fecha_pedido,
    p.fecha_entrega_programada,
    CONCAT(comprador.nombre, ' ', comprador.apellido) AS nombre_comprador,
    comprador.telefono AS telefono_comprador,
    comprador.email AS email_comprador,
    CONCAT(campesino.nombre, ' ', campesino.apellido) AS nombre_campesino,
    campesino.telefono AS telefono_campesino,
    f.nombre_finca,
    COUNT(dp.id) AS total_productos,
    SUM(dp.cantidad) AS cantidad_total_productos
FROM pedidos p
JOIN usuarios comprador ON p.comprador_id = comprador.id
JOIN usuarios campesino ON p.campesino_id = campesino.id
JOIN fincas f ON campesino.id = f.usuario_id
LEFT JOIN detalle_pedidos dp ON p.id = dp.pedido_id
GROUP BY p.id
ORDER BY p.fecha_pedido DESC;

-- Vista de estadísticas de dashboard
CREATE VIEW vista_estadisticas_dashboard AS
SELECT 
    u.id AS usuario_id,
    CONCAT(u.nombre, ' ', u.apellido) AS nombre_completo,
    u.tipo_usuario,
    
    -- Productos
    COUNT(DISTINCT CASE WHEN pr.estado = 'disponible' THEN pr.id END) AS productos_activos,
    COUNT(DISTINCT pr.id) AS total_productos,
    
    -- Pedidos (para campesinos)
    COUNT(DISTINCT CASE WHEN pe.estado = 'pending' AND pe.campesino_id = u.id THEN pe.id END) AS pedidos_pendientes,
    COUNT(DISTINCT CASE WHEN pe.estado = 'completed' AND pe.campesino_id = u.id THEN pe.id END) AS pedidos_completados,
    
    -- Ventas del mes actual (para campesinos)
    COALESCE(SUM(CASE 
        WHEN pe.estado = 'completed' 
        AND pe.campesino_id = u.id 
        AND MONTH(pe.fecha_completado) = MONTH(CURRENT_DATE)
        AND YEAR(pe.fecha_completado) = YEAR(CURRENT_DATE)
        THEN pe.total 
        ELSE 0 
    END), 0) AS ventas_mes_actual,
    
    -- Calificación
    u.calificacion_promedio,
    
    -- Información de finca
    f.nombre_finca,
    f.ubicacion_departamento,
    f.ubicacion_municipio,
    f.area_hectareas,
    f.tipo_cultivo
    
FROM usuarios u
LEFT JOIN productos pr ON u.id = pr.usuario_id
LEFT JOIN pedidos pe ON (u.id = pe.campesino_id OR u.id = pe.comprador_id)
LEFT JOIN fincas f ON u.id = f.usuario_id
WHERE u.tipo_usuario = 'campesino'
GROUP BY u.id;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger para actualizar stock después de completar un pedido
DELIMITER //
CREATE TRIGGER actualizar_stock_pedido_completado
    AFTER UPDATE ON pedidos
    FOR EACH ROW
BEGIN
    IF NEW.estado = 'completed' AND OLD.estado != 'completed' THEN
        UPDATE productos p
        JOIN detalle_pedidos dp ON p.id = dp.producto_id
        SET p.stock_disponible = p.stock_disponible - dp.cantidad,
            p.estado = CASE 
                WHEN p.stock_disponible - dp.cantidad <= 0 THEN 'agotado'
                ELSE p.estado
            END
        WHERE dp.pedido_id = NEW.id;
    END IF;
END //
DELIMITER ;

-- Trigger para generar código de seguimiento único
DELIMITER //
CREATE TRIGGER generar_codigo_seguimiento
    BEFORE INSERT ON pedidos
    FOR EACH ROW
BEGIN
    IF NEW.codigo_seguimiento IS NULL THEN
        SET NEW.codigo_seguimiento = CONCAT('TRK-', UPPER(SUBSTRING(MD5(CONCAT(NEW.id, NOW())), 1, 8)));
    END IF;
END //
DELIMITER ;

-- ============================================================
-- ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- ============================================================

-- Índices compuestos para consultas frecuentes
CREATE INDEX idx_productos_usuario_estado ON productos (usuario_id, estado);
CREATE INDEX idx_productos_categoria_estado ON productos (categoria_id, estado);
CREATE INDEX idx_pedidos_campesino_estado ON pedidos (campesino_id, estado);
CREATE INDEX idx_pedidos_comprador_estado ON pedidos (comprador_id, estado);
CREATE INDEX idx_actividades_usuario_fecha ON actividades_recientes (usuario_id, fecha_actividad DESC);

-- ============================================================
-- COMENTARIOS FINALES
-- ============================================================

/*
Esta base de datos está diseñada para soportar todas las funcionalidades
actuales de Campo Directo y preparada para futuras expansiones:

FUNCIONALIDADES SOPORTADAS:
✅ Sistema de autenticación completo
✅ Gestión de usuarios (campesinos y compradores)
✅ Catálogo de productos con categorías
✅ Sistema de pedidos completo
✅ Dashboard con estadísticas en tiempo real
✅ Actividades recientes y notificaciones
✅ Información de fincas y certificaciones
✅ Sistema de calificaciones
✅ Control de sesiones

CARACTERÍSTICAS TÉCNICAS:
- Optimizada para MySQL/MariaDB
- Charset UTF8MB4 para soporte completo de emojis
- Índices optimizados para consultas frecuentes
- Triggers para automatización de procesos
- Vistas para consultas complejas
- Estructura escalable y mantenible

PRÓXIMAS EXPANSIONES POSIBLES:
- Sistema de mensajería interno
- Geolocalización avanzada
- Sistema de pagos integrado
- Marketplace multi-vendedor
- Sistema de logística
- API REST completa
*/