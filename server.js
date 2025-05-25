const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Import existing routes
const authRoutes = require('./src/routes/auth');
const usersRoutes = require('./src/routes/users');
const pipelineRoutes = require('./src/routes/pipeline');

// TODO: Crear estas rutas más tarde
// const clientsRoutes = require('./src/routes/clients');
// const salesRoutes = require('./src/routes/sales');
// const tasksRoutes = require('./src/routes/tasks');
// const hrRoutes = require('./src/routes/hr');

// Middleware de seguridad
app.use(helmet());
app.use(compression());

// CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://tu-dominio.com']
        : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4000'],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // límite de requests por ventana
    message: {
        error: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.'
    }
});
app.use(limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'CRM API funcionando correctamente',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: '🚀 CRM API - Bienvenido',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            auth: '/api/auth/*',
            users: '/api/users/*',
            pipeline: '/api/pipeline/*'
        },
        docs: 'https://documenter.getpostman.com/view/tu-coleccion'
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/pipeline', pipelineRoutes);

// TODO: Agregar estas rutas más tarde
// app.use('/api/clients', clientsRoutes);
// app.use('/api/sales', salesRoutes);
// app.use('/api/tasks', tasksRoutes);
// app.use('/api/hr', hrRoutes);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint no encontrado',
        path: req.originalUrl,
        method: req.method,
        availableEndpoints: [
            'GET /health',
            'GET /',
            'POST /api/auth/register',
            'POST /api/auth/login',
            'GET /api/auth/profile',
            'GET /api/users',
            'GET /api/pipeline'
        ]
    });
});

// Error handler global
app.use((err, req, res, next) => {
    console.error('Error global:', err);

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Error de validación',
            details: err.message
        });
    }

    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Token inválido'
        });
    }

    if (err.code === 'P2002') {
        return res.status(400).json({
            error: 'Ya existe un registro con estos datos únicos'
        });
    }

    res.status(500).json({
        error: 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
🚀 Servidor CRM API iniciado correctamente
📡 Puerto: ${PORT}
🌍 URL: http://localhost:${PORT}
💾 Base de datos: ${process.env.DATABASE_URL?.includes('localhost') ? 'PostgreSQL Local' : 'PostgreSQL Remoto'}
🔧 Entorno: ${process.env.NODE_ENV || 'development'}
⏰ Hora: ${new Date().toLocaleString()}

📋 Endpoints disponibles:
   GET  http://localhost:${PORT}/health
   GET  http://localhost:${PORT}/
   POST http://localhost:${PORT}/api/auth/register
   POST http://localhost:${PORT}/api/auth/login
   GET  http://localhost:${PORT}/api/auth/profile
   GET  http://localhost:${PORT}/api/users
   GET  http://localhost:${PORT}/api/pipeline
    `);
});