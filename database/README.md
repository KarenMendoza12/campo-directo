# Base de Datos Campo Directo

Esta carpeta contiene el esquema completo de la base de datos para la plataforma Campo Directo, diseñada para soportar todas las funcionalidades del proyecto.

## 📁 Archivos Incluidos

- **`campo_directo_schema.sql`** - Esquema completo de la base de datos con todas las tablas, índices, vistas y triggers
- **`datos_prueba.sql`** - Datos de ejemplo para testing y desarrollo
- **`README.md`** - Esta guía de instalación

## 🗄️ Estructura de la Base de Datos

### Tablas Principales

1. **`usuarios`** - Campesinos y compradores
2. **`fincas`** - Información de fincas agrícolas
3. **`certificaciones`** - Certificaciones de calidad
4. **`categorias_productos`** - Categorías de productos agrícolas
5. **`productos`** - Catálogo de productos
6. **`pedidos`** - Órdenes de compra
7. **`detalle_pedidos`** - Items específicos de cada pedido
8. **`actividades_recientes`** - Log de actividades para el dashboard
9. **`sesiones`** - Control de autenticación
10. **`estadisticas_usuarios`** - Métricas de rendimiento
11. **`configuracion_sistema`** - Configuraciones globales

### Vistas Útiles

- **`vista_productos_completa`** - Productos con información de campesino y finca
- **`vista_pedidos_completa`** - Pedidos con datos completos de compradores y campesinos
- **`vista_estadisticas_dashboard`** - Estadísticas agregadas para el dashboard

## 🚀 Instalación

### Prerrequisitos

- MySQL 8.0+ o MariaDB 10.5+
- Acceso a un servidor de base de datos
- Cliente MySQL (mysql-client, phpMyAdmin, o similar)

### Pasos de Instalación

1. **Conectar al servidor MySQL**
   ```bash
   mysql -u root -p
   ```

2. **Ejecutar el esquema principal**
   ```sql
   source C:/Users/srona/Documents/Projects/campo-directo/database/campo_directo_schema.sql
   ```

3. **Cargar datos de prueba (opcional)**
   ```sql
   source C:/Users/srona/Documents/Projects/campo-directo/database/datos_prueba.sql
   ```

### Instalación Alternativa (por partes)

Si prefieres ejecutar los archivos manualmente:

```sql
-- 1. Crear la base de datos
CREATE DATABASE campo_directo CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci;
USE campo_directo;

-- 2. Copiar y pegar el contenido de campo_directo_schema.sql

-- 3. Copiar y pegar el contenido de datos_prueba.sql (opcional)
```

## 👥 Usuarios de Prueba

### Campesinos
- **Email**: juan.perez@campo.com | **Contraseña**: 123456
- **Email**: maria.garcia@campo.com | **Contraseña**: 123456  
- **Email**: carlos.lopez@campo.com | **Contraseña**: 123456
- **Email**: ana.rodriguez@campo.com | **Contraseña**: 123456
- **Email**: pedro.martinez@campo.com | **Contraseña**: 123456

### Compradores
- **Email**: laura.hernandez@email.com | **Contraseña**: 123456
- **Email**: diego.torres@email.com | **Contraseña**: 123456
- **Email**: sandra.gomez@email.com | **Contraseña**: 123456
- **Email**: roberto.jimenez@email.com | **Contraseña**: 123456
- **Email**: carmen.vargas@email.com | **Contraseña**: 123456

## 📊 Datos de Ejemplo Incluidos

- **5 campesinos** con perfiles completos
- **5 compradores** para testing
- **5 fincas** con ubicaciones reales de Colombia
- **7 certificaciones** distribuidas entre las fincas
- **20 productos** en diferentes categorías
- **6 pedidos** (3 pendientes, 3 completados)
- **20+ actividades recientes**
- **Estadísticas mensuales** para todos los usuarios

## 🔧 Configuración de la Aplicación

Una vez instalada la base de datos, actualiza la configuración de conexión en tu aplicación:

```javascript
// Ejemplo de configuración (ajustar según tu stack tecnológico)
const dbConfig = {
  host: 'localhost',
  user: 'campo_directo_user',
  password: 'tu_password_seguro',
  database: 'campo_directo',
  charset: 'utf8mb4',
  timezone: 'local'
};
```

## 📋 Verificación de la Instalación

Ejecuta estas consultas para verificar que todo esté funcionando:

```sql
-- Verificar usuarios
SELECT COUNT(*) as total_usuarios FROM usuarios;

-- Verificar productos
SELECT COUNT(*) as total_productos FROM productos;

-- Verificar pedidos
SELECT COUNT(*) as total_pedidos FROM pedidos;

-- Probar vista completa
SELECT * FROM vista_productos_completa LIMIT 5;
```

**Resultado esperado:**
- total_usuarios: 10
- total_productos: 20  
- total_pedidos: 6

## 🔐 Consideraciones de Seguridad

### Para Desarrollo
- Las contraseñas están hasheadas de forma simple para facilitar testing
- Usa las credenciales de ejemplo para pruebas rápidas

### Para Producción
- **Cambia todas las contraseñas**
- **Genera hashes seguros** usando bcrypt o similar
- **Configura SSL/TLS** para conexiones de base de datos
- **Restringe permisos** de usuario de base de datos
- **Implementa backup automático**

## 🚨 Troubleshooting

### Error de charset/collation
```sql
-- Verificar configuración de MySQL
SHOW VARIABLES LIKE 'character_set%';
SHOW VARIABLES LIKE 'collation%';

-- Si es necesario, ajustar
SET NAMES utf8mb4;
```

### Error de permisos
```sql
-- Crear usuario específico para la aplicación
CREATE USER 'campo_directo'@'localhost' IDENTIFIED BY 'password_seguro';
GRANT ALL PRIVILEGES ON campo_directo.* TO 'campo_directo'@'localhost';
FLUSH PRIVILEGES;
```

### Error de versión MySQL
- Verificar que usas MySQL 8.0+ o MariaDB 10.5+
- Algunos triggers pueden requerir ajustes en versiones antiguas

## 🎯 Próximos Pasos

1. **Integrar con la aplicación** - Conectar el backend con esta base de datos
2. **Implementar autenticación** - Sistema completo de login/registro
3. **APIs REST** - Endpoints para todas las funcionalidades
4. **Sistema de archivos** - Para imágenes de productos y certificados
5. **Notificaciones** - Sistema de emails y push notifications
6. **Pagos** - Integración con pasarelas de pago
7. **Geolocalización** - Funcionalidades de ubicación avanzadas

## 📞 Soporte

Si encuentras problemas durante la instalación:

1. Verifica la versión de MySQL/MariaDB
2. Revisa los permisos de usuario
3. Consulta los logs de error de MySQL
4. Asegúrate de que el charset sea utf8mb4

## 🎉 ¡Listo para usar!

Una vez completada la instalación, tu base de datos Campo Directo estará lista para soportar todas las funcionalidades del proyecto, desde el registro de usuarios hasta el sistema completo de pedidos y dashboard con estadísticas en tiempo real.