// ============================================================
// SERVIDOR PRINCIPAL - CAMPO DIRECTO
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Importar rutas
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const productRoutes = require('./src/routes/products');
const orderRoutes = require('./src/routes/orders');
const dashboardRoutes = require('./src/routes/dashboard');
const farmRoutes = require('./src/routes/farms');
const antiIntermediaryRoutes = require('./src/routes/anti-intermediarios');
const uploadRoutes = require('./routes/uploads');

// Importar middlewares
const { errorHandler } = require('./src/middleware/errorHandler');
const { authenticateToken } = require('./src/middleware/auth');
const { requestLoggerMiddleware } = require('./config/logger');

// Swagger documentation
const { specs, swaggerUi, swaggerOptions } = require('./config/swagger');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// MIDDLEWARE DE SEGURIDAD
// ============================================================

// Helmet para headers de seguridad
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
        },
    },
}));

// CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // máximo 100 requests por ventana
    message: {
        error: 'Demasiadas solicitudes desde esta IP, intente de nuevo más tarde.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', limiter);

// ============================================================
// MIDDLEWARE GENERAL
// ============================================================

// Logging
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
    app.use(requestLoggerMiddleware);
}

// Compresión
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================================
// RUTAS DE LA API
// ============================================================

// Ruta de health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'success',
        message: 'Campo Directo API está funcionando correctamente',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));

// Rutas públicas
app.use('/api/auth', authRoutes);

// Rutas protegidas
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/products', productRoutes); // Algunos endpoints son públicos, otros requieren auth
app.use('/api/orders', authenticateToken, orderRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);
app.use('/api/farms', farmRoutes); // Algunos endpoints son públicos, otros requieren auth
app.use('/api/anti-intermediarios', antiIntermediaryRoutes); // Funcionalidades anti-intermediarios
app.use('/api/uploads', uploadRoutes); // File upload endpoints

// ============================================================
// RUTAS DEL FRONTEND
// ============================================================

// Ruta principal - redirigir a index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rutas específicas del frontend
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'registro.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Manejar rutas SPA - todas las rutas no API devuelven index.html
app.get('*', (req, res, next) => {
    // Si la ruta comienza con /api, continuar al siguiente middleware (404)
    if (req.path.startsWith('/api')) {
        return next();
    }
    
    // Para todas las demás rutas, servir index.html
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================
// MANEJO DE ERRORES
// ============================================================

// 404 para rutas API no encontradas
app.use('/api/*', (req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Endpoint no encontrado',
        path: req.path
    });
});

// Middleware de manejo de errores global
app.use(errorHandler);

// ============================================================
// INICIALIZACIÓN DEL SERVIDOR
// ============================================================

// Función para iniciar el servidor
const startServer = async () => {
    try {
        // Verificar conexión a la base de datos
        const db = require('./src/config/database');
        await db.testConnection();
        console.log('✅ Conexión a la base de datos establecida');

        // Crear directorio de uploads si no existe
        const fs = require('fs');
        const uploadDir = path.join(__dirname, process.env.UPLOAD_DIR || 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
            console.log('✅ Directorio de uploads creado');
        }

        // Iniciar servidor
        const server = app.listen(PORT, () => {
            console.log(`
🌱 ========================================
   CAMPO DIRECTO - SERVIDOR INICIADO
========================================
🚀 Servidor corriendo en puerto ${PORT}
🌐 URL: http://localhost:${PORT}
📊 Dashboard: http://localhost:${PORT}/dashboard
🔧 API Health: http://localhost:${PORT}/api/health
📚 API Docs: http://localhost:${PORT}/api-docs
🛡️  Entorno: ${process.env.NODE_ENV || 'development'}
========================================
            `);
        });

        // Manejo de cierre graceful
        process.on('SIGTERM', () => {
            console.log('🔄 Recibida señal SIGTERM, cerrando servidor...');
            server.close(() => {
                console.log('✅ Servidor cerrado correctamente');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            console.log('🔄 Recibida señal SIGINT, cerrando servidor...');
            server.close(() => {
                console.log('✅ Servidor cerrado correctamente');
                process.exit(0);
            });
        });

    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
};

// Iniciar servidor solo si no es un test
if (process.env.NODE_ENV !== 'test') {
    startServer();
}

module.exports = app;