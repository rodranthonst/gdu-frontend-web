const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { PATHS, GOOGLE_DRIVE, AUTH, UTILS } = require('./config');

class GoogleDriveService {
    constructor() {
        this.oauth2Client = null;
        this.impersonationClient = null;
        this.drive = null;
        this.initialized = false;
    }

    // === INICIALIZACIÓN ===

    async initialize() {
        try {
            await this.setupOAuth2Client();
            await this.setupImpersonationClient();
            this.initialized = true;
            UTILS.log('info', 'Google Drive Service inicializado correctamente');
        } catch (error) {
            UTILS.log('error', 'Error al inicializar Google Drive Service', error.message);
            throw error;
        }
    }

    // Configurar cliente OAuth2 para autenticación de usuarios
    async setupOAuth2Client() {
        try {
            // Usar credenciales desde variables de entorno
            const client_id = process.env.GOOGLE_CLIENT_ID;
            const client_secret = process.env.GOOGLE_CLIENT_SECRET;
            const redirect_uri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';
            
            if (!client_id) {
                throw new Error('GOOGLE_CLIENT_ID no está configurado en las variables de entorno');
            }
            
            if (!client_secret) {
                throw new Error('GOOGLE_CLIENT_SECRET no está configurado en las variables de entorno');
            }

            this.oauth2Client = new google.auth.OAuth2(
                client_id,
                client_secret,
                redirect_uri
            );

            UTILS.log('info', 'Cliente OAuth2 configurado correctamente');
        } catch (error) {
            UTILS.log('error', 'Error al configurar cliente OAuth2', error.message);
            throw error;
        }
    }

    // Configurar cliente de impersonación para crear unidades
    async setupImpersonationClient() {
        try {
            console.log('🔐 Configurando cliente de impersonación');
            
            // El frontend no usa impersonación directa, sino que delega al backend
            // Solo configuramos un cliente básico para operaciones que no requieren impersonación
            this.impersonationClient = this.oauth2Client;
            this.drive = google.drive({ version: GOOGLE_DRIVE.API_VERSION, auth: this.oauth2Client });

            UTILS.log('info', 'Cliente de impersonación configurado correctamente - Usando credenciales crearunidadesimm');
        } catch (error) {
            UTILS.log('error', 'Error al configurar cliente de impersonación', error.message);
            throw error;
        }
    }

    // === AUTENTICACIÓN OAUTH ===

    // Generar URL de autorización
    generateAuthUrl() {
        if (!this.oauth2Client) {
            throw new Error('Cliente OAuth2 no inicializado');
        }

        const authUrl = this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: GOOGLE_DRIVE.SCOPES,
            prompt: 'consent'
        });

        return authUrl;
    }

    // Intercambiar código por tokens
    async getTokensFromCode(code) {
        try {
            if (!this.oauth2Client) {
                throw new Error('Cliente OAuth2 no inicializado');
            }

            const { tokens } = await this.oauth2Client.getToken(code);
            
            // Establecer credenciales ANTES de obtener información del usuario
            this.oauth2Client.setCredentials(tokens);

            // Obtener información del usuario
            const userInfo = await this.getUserInfo();
            
            return {
                tokens,
                userInfo
            };
        } catch (error) {
            UTILS.log('error', 'Error al obtener tokens', error.message);
            throw error;
        }
    }

    // Obtener información del usuario autenticado
    async getUserInfo() {
        try {
            const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
            const { data } = await oauth2.userinfo.get();
            
            return {
                id: data.id,
                email: data.email,
                name: data.name,
                picture: data.picture,
                verified_email: data.verified_email
            };
        } catch (error) {
            UTILS.log('error', 'Error al obtener información del usuario', error.message);
            throw error;
        }
    }

    // Validar dominio del usuario
    validateUserDomain(email) {
        if (!AUTH.ALLOWED_DOMAINS || AUTH.ALLOWED_DOMAINS.length === 0) {
            return true; // Si no hay dominios configurados, permitir todos
        }

        const domain = email.split('@')[1];
        return AUTH.ALLOWED_DOMAINS.includes(domain);
    }

    // === CREACIÓN DE UNIDADES COMPARTIDAS (CON IMPERSONACIÓN) ===

    // Crear unidad compartida
    async createSharedDrive(name, managers = []) {
        try {
            if (!this.drive) {
                throw new Error('Cliente de Drive no inicializado');
            }

            UTILS.log('info', `Creando unidad compartida: ${name}`);

            // Crear la unidad compartida
            const driveResponse = await this.drive.drives.create({
                requestId: `create-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                resource: {
                    name: name
                }
            });

            const newDrive = driveResponse.data;
            UTILS.log('info', `Unidad compartida creada: ${newDrive.name} (ID: ${newDrive.id})`);

            // Agregar managers si se especificaron
            const addedManagers = [];
            for (const managerEmail of managers) {
                try {
                    const permission = await this.addManagerToSharedDrive(newDrive.id, managerEmail);
                    addedManagers.push({
                        email: managerEmail,
                        role: 'organizer',
                        type: 'user',
                        permissionId: permission.id
                    });
                    UTILS.log('info', `Manager agregado: ${managerEmail}`);
                } catch (error) {
                    UTILS.log('error', `Error al agregar manager ${managerEmail}`, error.message);
                }
            }

            return {
                drive: {
                    id: newDrive.id,
                    name: newDrive.name,
                    kind: newDrive.kind,
                    colorRgb: newDrive.colorRgb,
                    backgroundImageFile: newDrive.backgroundImageFile,
                    capabilities: newDrive.capabilities,
                    createdTime: newDrive.createdTime,
                    hidden: newDrive.hidden || false,
                    restrictions: newDrive.restrictions
                },
                managers: addedManagers
            };
        } catch (error) {
            UTILS.log('error', 'Error al crear unidad compartida', error.message);
            throw error;
        }
    }

    // Agregar manager a unidad compartida
    async addManagerToSharedDrive(driveId, email) {
        try {
            const permission = await this.drive.permissions.create({
                fileId: driveId,
                supportsAllDrives: true,
                resource: {
                    role: 'organizer',
                    type: 'user',
                    emailAddress: email
                }
            });

            return permission.data;
        } catch (error) {
            UTILS.log('error', `Error al agregar manager ${email} a unidad ${driveId}`, error.message);
            throw error;
        }
    }

    // === CREACIÓN DE CARPETAS ===

    // Crear carpeta en unidad compartida
    async createFolderInSharedDrive(name, driveId, parentId = null) {
        try {
            if (!this.drive) {
                throw new Error('Cliente de Drive no inicializado');
            }

            const folderMetadata = {
                name: name,
                mimeType: 'application/vnd.google-apps.folder',
                parents: parentId ? [parentId] : [driveId],
                driveId: driveId
            };

            const response = await this.drive.files.create({
                resource: folderMetadata,
                supportsAllDrives: true
            });

            const folder = response.data;
            UTILS.log('info', `Carpeta creada: ${folder.name} (ID: ${folder.id})`);

            return {
                id: folder.id,
                name: folder.name,
                mimeType: folder.mimeType,
                parents: folder.parents,
                driveId: driveId,
                parent_id: parentId,
                full_path: await this.buildFolderPath(folder.id, driveId),
                createdTime: folder.createdTime || new Date().toISOString()
            };
        } catch (error) {
            UTILS.log('error', 'Error al crear carpeta', error.message);
            throw error;
        }
    }

    // Construir ruta completa de carpeta
    async buildFolderPath(folderId, driveId) {
        try {
            const pathParts = [];
            let currentId = folderId;

            while (currentId && currentId !== driveId) {
                const response = await this.drive.files.get({
                    fileId: currentId,
                    fields: 'name,parents',
                    supportsAllDrives: true
                });

                const file = response.data;
                pathParts.unshift(file.name);
                currentId = file.parents && file.parents[0];
            }

            return '/' + pathParts.join('/');
        } catch (error) {
            UTILS.log('error', 'Error al construir ruta de carpeta', error.message);
            return '/unknown';
        }
    }

    // === UTILIDADES ===

    // Verificar si está inicializado
    ensureInitialized() {
        if (!this.initialized) {
            throw new Error('Google Drive Service no está inicializado. Llama a initialize() primero.');
        }
    }

    // Limpiar credenciales OAuth
    clearOAuthCredentials() {
        if (this.oauth2Client) {
            this.oauth2Client.setCredentials({});
        }
    }
}

const googleDriveService = new GoogleDriveService();

module.exports = googleDriveService;