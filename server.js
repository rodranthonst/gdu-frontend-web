require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const jwt = require('jsonwebtoken');
const { SERVER, AUTH, MESSAGES, UTILS } = require('./config');
const firestoreService = require('./firestore');
const googleDriveService = require('./googleDriveService');

const app = express();

// === MIDDLEWARE ===
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware de logging
app.use((req, res, next) => {
    UTILS.log('info', `${req.method} ${req.path}`);
    next();
});

// === MIDDLEWARE DE AUTENTICACIÓN ===

// Verificar token JWT
function verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: MESSAGES.ERRORS.UNAUTHORIZED });
    }
    
    try {
        const decoded = jwt.verify(token, AUTH.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        UTILS.log('error', 'Token inválido', error.message);
        return res.status(401).json({ error: MESSAGES.ERRORS.INVALID_TOKEN });
    }
}

// === RUTAS DE AUTENTICACIÓN ===

// Página de login
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Iniciar autenticación OAuth
app.get('/auth/google', (req, res) => {
    try {
        const authUrl = googleDriveService.generateAuthUrl();
        res.redirect(authUrl);
    } catch (error) {
        UTILS.log('error', 'Error al generar URL de autenticación', error.message);
        res.status(500).json({ error: MESSAGES.ERRORS.AUTHENTICATION_FAILED });
    }
});

// Callback de OAuth
app.get('/auth/google/callback', async (req, res) => {
    try {
        const { code } = req.query;
        
        if (!code) {
            return res.status(400).json({ error: 'Código de autorización no recibido' });
        }

        // Intercambiar código por tokens
        const { tokens, userInfo } = await googleDriveService.getTokensFromCode(code);
        
        // Validar dominio del usuario
        if (!googleDriveService.validateUserDomain(userInfo.email)) {
            return res.status(403).json({ 
                error: `Dominio no autorizado: ${userInfo.email.split('@')[1]}` 
            });
        }

        // Crear JWT
        const jwtPayload = {
            id: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture
        };
        
        const jwtToken = jwt.sign(jwtPayload, AUTH.JWT_SECRET, { expiresIn: '24h' });
        
        UTILS.log('info', `Usuario autenticado: ${userInfo.email}`);
        
        // Redirigir a la aplicación principal con el token
        res.redirect(`/app?token=${jwtToken}`);
        
    } catch (error) {
        UTILS.log('error', 'Error en callback de OAuth', error.message);
        res.status(500).json({ error: MESSAGES.ERRORS.AUTHENTICATION_FAILED });
    }
});

// Cerrar sesión
app.post('/auth/logout', verifyToken, (req, res) => {
    try {
        googleDriveService.clearOAuthCredentials();
        UTILS.log('info', `Usuario desconectado: ${req.user.email}`);
        res.json({ message: MESSAGES.SUCCESS.LOGOUT_SUCCESS });
    } catch (error) {
        UTILS.log('error', 'Error al cerrar sesión', error.message);
        res.status(500).json({ error: 'Error al cerrar sesión' });
    }
});

// === RUTAS DE LA APLICACIÓN ===

// Página principal de la aplicación
app.get('/app', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

// Obtener información del usuario actual
app.get('/api/user', verifyToken, (req, res) => {
    res.json({
        user: req.user,
        server: {
            name: SERVER.NAME,
            version: SERVER.VERSION
        }
    });
});

// === RUTAS DE UNIDADES COMPARTIDAS ===

// Obtener todas las unidades compartidas
app.get('/api/shared-drives', verifyToken, async (req, res) => {
    try {
        const drives = await firestoreService.getSharedDrivesFromDB();
        res.json({ drives });
    } catch (error) {
        UTILS.log('error', 'Error al obtener unidades compartidas', error.message);
        res.status(500).json({ error: 'Error al obtener unidades compartidas' });
    }
});

// Crear nueva unidad compartida
app.post('/api/shared-drives', verifyToken, async (req, res) => {
    try {
        const { name, managers = [] } = req.body;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: MESSAGES.ERRORS.FOLDER_NAME_REQUIRED });
        }

        UTILS.log('info', `Creando unidad compartida: ${name} por ${req.user.email}`);
        
        // Delegar la creación al backend que tiene permisos de impersonación
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
        const response = await fetch(`${backendUrl}/api/shared-drives`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: name.trim(), managers })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al crear unidad en el backend');
        }
        
        const result = await response.json();
        
        UTILS.log('info', `Unidad compartida creada exitosamente: ${result.drive.name}`);
        
        res.json({
            message: MESSAGES.SUCCESS.FOLDER_CREATED,
            drive: result.drive,
            managers: result.managers || []
        });
        
    } catch (error) {
        UTILS.log('error', 'Error al crear unidad compartida', error.message);
        res.status(500).json({ 
            error: 'Error al crear unidad compartida',
            details: error.message 
        });
    }
});

// === RUTAS DE CARPETAS ===

// Obtener árbol de carpetas de una unidad
app.get('/api/shared-drives/:driveId/folders', verifyToken, async (req, res) => {
    try {
        const { driveId } = req.params;
        const folderTree = await firestoreService.getFolderTree(driveId);
        res.json({ folders: folderTree });
    } catch (error) {
        UTILS.log('error', 'Error al obtener carpetas', error.message);
        res.status(500).json({ error: 'Error al obtener carpetas' });
    }
});

// Crear carpeta en unidad compartida
app.post('/api/shared-drives/:driveId/folders', verifyToken, async (req, res) => {
    try {
        const { driveId } = req.params;
        const { name, parentId } = req.body;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: MESSAGES.ERRORS.FOLDER_NAME_REQUIRED });
        }

        UTILS.log('info', `Creando carpeta: ${name} en unidad ${driveId} por ${req.user.email}`);
        
        // Crear carpeta usando impersonación
        const folder = await googleDriveService.createFolderInSharedDrive(
            name.trim(), 
            driveId, 
            parentId
        );
        
        // Guardar en Firestore
        await firestoreService.insertCreatedFolder(folder);
        
        UTILS.log('info', `Carpeta creada exitosamente: ${folder.name}`);
        
        res.json({
            message: MESSAGES.SUCCESS.FOLDER_CREATED,
            folder
        });
        
    } catch (error) {
        UTILS.log('error', 'Error al crear carpeta', error.message);
        res.status(500).json({ 
            error: 'Error al crear carpeta',
            details: error.message 
        });
    }
});

// Obtener managers de una unidad
app.get('/api/shared-drives/:driveId/managers', verifyToken, async (req, res) => {
    try {
        const { driveId } = req.params;
        const managers = await firestoreService.getManagers(driveId);
        res.json({ managers });
    } catch (error) {
        UTILS.log('error', 'Error al obtener managers', error.message);
        res.status(500).json({ error: 'Error al obtener managers' });
    }
});

// === RUTAS DE INFORMACIÓN ===

// Obtener historial de sincronización
app.get('/api/sync-history', verifyToken, async (req, res) => {
    try {
        const history = await firestoreService.getSyncHistory(10);
        res.json({ history });
    } catch (error) {
        UTILS.log('error', 'Error al obtener historial de sincronización', error.message);
        res.status(500).json({ error: 'Error al obtener historial de sincronización' });
    }
});

// Información del servidor
app.get('/api/info', (req, res) => {
    res.json({
        server: {
            name: SERVER.NAME,
            version: SERVER.VERSION,
            port: SERVER.PORT,
            https_enabled: SERVER.ENABLE_HTTPS
        },
        auth: {
            allowed_domains: AUTH.ALLOWED_DOMAINS,
            impersonate_user: AUTH.IMPERSONATE_USER_EMAIL
        }
    });
});

// === MANEJO DE ERRORES ===

// Ruta no encontrada
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo global de errores
app.use((error, req, res, next) => {
    UTILS.log('error', 'Error no manejado', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// === INICIALIZACIÓN DEL SERVIDOR ===

async function startServer() {
    try {
        // Inicializar servicios
        await firestoreService.initialize();
        await googleDriveService.initialize();
        
        // Iniciar servidor HTTP
        app.listen(SERVER.PORT, () => {
            UTILS.log('info', `🚀 Servidor HTTP iniciado en puerto ${SERVER.PORT}`);
            UTILS.log('info', `📱 Aplicación disponible en: http://localhost:${SERVER.PORT}`);
        });
        
        // Iniciar servidor HTTPS si está habilitado
        if (SERVER.ENABLE_HTTPS) {
            try {
                const httpsOptions = {
                    key: fs.readFileSync(path.join(__dirname, 'credenciales', 'server.key')),
                    cert: fs.readFileSync(path.join(__dirname, 'credenciales', 'server.crt'))
                };
                
                https.createServer(httpsOptions, app).listen(SERVER.HTTPS_PORT, () => {
                    UTILS.log('info', `🔒 Servidor HTTPS iniciado en puerto ${SERVER.HTTPS_PORT}`);
                    UTILS.log('info', `📱 Aplicación HTTPS disponible en: https://localhost:${SERVER.HTTPS_PORT}`);
                });
            } catch (httpsError) {
                UTILS.log('warn', 'No se pudo iniciar servidor HTTPS', httpsError.message);
            }
        }
        
    } catch (error) {
        UTILS.log('error', 'Error al iniciar servidor', error.message);
        process.exit(1);
    }
}

// Manejo de señales de terminación
process.on('SIGINT', () => {
    UTILS.log('info', 'Cerrando servidor...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    UTILS.log('info', 'Cerrando servidor...');
    process.exit(0);
});

// Iniciar servidor
if (require.main === module) {
    startServer();
}

module.exports = app;