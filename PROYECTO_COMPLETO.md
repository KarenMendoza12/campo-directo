# Campo Directo - Proyecto Completo

## 🌱 Resumen del Proyecto

**Campo Directo** es una plataforma digital completa que conecta campesinos directamente con compradores, eliminando intermediarios en la cadena de suministro agrícola. El sistema incluye funcionalidades avanzadas para comunicación directa, transparencia de precios, gestión de productos y fincas, y un robusto sistema de testing y documentación.

## 🚀 Funcionalidades Principales Implementadas

### ✅ 1. Arquitectura Base
- **Backend**: Node.js con Express.js
- **Base de datos**: MySQL con esquema completo
- **Autenticación**: JWT con middleware de seguridad
- **Seguridad**: Helmet, CORS, Rate Limiting
- **Middleware**: Compresión, logging avanzado, manejo de errores

### ✅ 2. Modelos y Gestión de Datos
- **User**: Gestión completa de usuarios (campesinos y compradores)
- **Farm**: Administración de fincas con certificaciones
- **Product**: Catálogo de productos agrícolas con categorías
- **Order**: Sistema completo de pedidos con estados
- **Messaging**: Sistema de mensajería directa
- **PriceTransparency**: Comparaciones de precios y ahorros

### ✅ 3. Funcionalidades Anti-Intermediarios
- **Comunicación Directa**: Chat en tiempo real entre campesinos y compradores
- **Transparencia de Precios**: Comparación con precios de mercado (SIPSA-DANE)
- **Calculadora de Ahorros**: Muestra beneficios de compra directa
- **Trazabilidad**: Información completa de origen y certificaciones
- **Negociación Directa**: Ofertas de precios y términos personalizados

### ✅ 4. Sistema de Archivos y Uploads
- **Multer Integration**: Middleware avanzado para subida de archivos
- **Múltiples Tipos**: Imágenes de productos, certificados, fotos de perfil
- **Validaciones**: Tipos de archivo, tamaños máximos, limpieza automática
- **Organización**: Carpetas separadas por tipo de contenido

### ✅ 5. Testing Completo
- **Jest Framework**: Configuración completa de testing
- **Model Tests**: Pruebas unitarias para todos los modelos
- **Route Tests**: Pruebas de integración para todas las APIs
- **Auth Tests**: Validación completa del sistema de autenticación
- **Anti-Intermediarios Tests**: Pruebas específicas de funcionalidades principales

### ✅ 6. Logging Avanzado
- **Winston Logger**: Sistema estructurado de logs con rotación
- **Múltiples Transports**: Archivos, consola, logs por nivel
- **Structured Logging**: Logs categorizados (auth, business, security, etc.)
- **Performance Monitoring**: Seguimiento de tiempos de respuesta
- **Error Tracking**: Captura completa de errores con contexto

### ✅ 7. Migraciones de Base de Datos
- **Sistema Completo**: Creación, ejecución y rollback de migraciones
- **CLI Interface**: Comandos simples para gestión
- **Checksums**: Validación de integridad de migraciones
- **Transacciones**: Ejecución segura con rollback automático

### ✅ 8. Documentación API (Swagger/OpenAPI)
- **Documentación Completa**: Todos los endpoints documentados
- **Esquemas Detallados**: Modelos de datos con ejemplos
- **Interfaz Interactiva**: Swagger UI para testing
- **Autenticación**: Integración con JWT tokens
- **Ejemplos**: Casos de uso detallados para cada endpoint

## 📁 Estructura del Proyecto

```
campo-directo/
├── src/                      # Código fuente principal
│   ├── config/               # Configuraciones
│   ├── middleware/           # Middlewares de Express
│   ├── models/               # Modelos de datos
│   └── routes/               # Rutas de la API
├── config/                   # Configuraciones avanzadas
│   ├── database.js           # Configuración de BD
│   ├── logger.js             # Configuración de logging
│   ├── migrations.js         # Sistema de migraciones
│   └── swagger.js            # Documentación API
├── middleware/               # Middleware adicional
│   └── upload.js             # Sistema de subida de archivos
├── routes/                   # Rutas adicionales
│   └── uploads.js            # Endpoints de archivos
├── migrations/               # Archivos de migración
├── tests/                    # Pruebas automatizadas
│   ├── models/               # Tests de modelos
│   ├── routes/               # Tests de rutas
│   └── setup.js              # Configuración de tests
├── scripts/                  # Scripts utilitarios
│   └── migrate.js            # CLI de migraciones
├── logs/                     # Archivos de log (generados)
├── public/                   # Archivos estáticos
├── database/                 # Scripts de BD
└── docs/                     # Documentación
```

## 🛠️ Comandos Disponibles

### Desarrollo
```bash
npm start              # Iniciar servidor
npm run dev            # Desarrollo con nodemon
npm run test           # Ejecutar tests
npm run test:watch     # Tests en modo watch
npm run test:coverage  # Tests con cobertura
```

### Base de Datos
```bash
npm run db:setup       # Configurar BD inicial
npm run db:seed        # Cargar datos de prueba
npm run migrate:run    # Ejecutar migraciones
npm run migrate:status # Estado de migraciones
npm run migrate:create <name>  # Crear migración
```

## 🌐 Endpoints Principales

### Autenticación
- `POST /api/auth/register` - Registro de usuarios
- `POST /api/auth/login` - Inicio de sesión
- `GET /api/auth/profile` - Perfil de usuario
- `PUT /api/auth/profile` - Actualizar perfil

### Anti-Intermediarios
- `POST /api/anti-intermediarios/message/send` - Enviar mensajes
- `GET /api/anti-intermediarios/conversations` - Listar conversaciones
- `GET /api/anti-intermediarios/price-comparison/:productId` - Comparar precios
- `GET /api/anti-intermediarios/savings-calculator` - Calcular ahorros
- `GET /api/anti-intermediarios/impact-report` - Reporte de impacto

### Archivos
- `POST /api/uploads/product/:productId` - Subir imagen de producto
- `POST /api/uploads/farm/:farmId/documents` - Subir documentos de finca
- `POST /api/uploads/profile` - Subir imagen de perfil
- `DELETE /api/uploads/delete` - Eliminar archivo

### Productos, Fincas y Pedidos
- Endpoints completos para CRUD de productos, fincas y pedidos
- Filtros avanzados y búsquedas
- Gestión de estados y categorías

## 📚 Documentación

- **API Documentation**: Disponible en `/api-docs` cuando el servidor esté corriendo
- **Anti-Intermediarios**: Documentación específica en `ANTI-INTERMEDIARIOS.md`
- **Base de Datos**: Esquema completo en `database/campo_directo_schema.sql`

## 🔧 Configuración

El proyecto utiliza variables de entorno para configuración:

```env
# Base de datos
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=campo_directo

# JWT
JWT_SECRET=your_jwt_secret

# Configuración del servidor
PORT=3000
NODE_ENV=development

# Logging
LOG_LEVEL=info

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🎯 Impacto y Objetivos Cumplidos

### Eliminación de Intermediarios
✅ **Comunicación Directa**: Los campesinos pueden contactar directamente a compradores
✅ **Transparencia de Precios**: Comparación clara con precios de mercado tradicional
✅ **Trazabilidad Completa**: Información de origen, certificaciones y proceso productivo
✅ **Negociación Directa**: Ofertas personalizadas y términos flexibles

### Beneficios Medibles
✅ **Para Campesinos**: Mayor margen de ganancia, relación directa con compradores
✅ **Para Compradores**: Precios más bajos, productos frescos, trazabilidad garantizada
✅ **Para el Mercado**: Reducción de costos logísticos, mayor eficiencia

### Tecnología
✅ **Escalabilidad**: Arquitectura preparada para crecimiento
✅ **Mantenibilidad**: Código bien documentado y testeado
✅ **Seguridad**: Múltiples capas de protección
✅ **Monitoreo**: Logging completo y métricas de rendimiento

## 🚀 Próximos Pasos Recomendados

1. **Despliegue**: Configurar entorno de producción
2. **Frontend**: Desarrollar interfaz de usuario completa
3. **Móvil**: Aplicación móvil para campesinos
4. **Integraciones**: APIs de pago y logística
5. **Analytics**: Dashboard de métricas de impacto
6. **Notificaciones**: Sistema de alertas en tiempo real

## 🤝 Contribución

El proyecto está completamente estructurado y documentado para facilitar el desarrollo colaborativo:

- Tests automatizados para validar cambios
- Documentación API interactiva
- Sistema de migraciones para evolución de BD
- Logging detallado para debugging
- Arquitectura modular y escalable

---

**Campo Directo** es ahora una plataforma completa y robusta lista para conectar campesinos directamente con compradores, cumpliendo plenamente su objetivo de eliminar intermediarios en la cadena de suministro agrícola. 🌱