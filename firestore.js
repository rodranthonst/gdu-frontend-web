const { Firestore } = require('@google-cloud/firestore');
const { FIRESTORE, UTILS } = require('./config');

class FirestoreService {
    constructor() {
        this.db = null;
        this.initialized = false;
    }

    // Inicializar conexión a Firestore
    async initialize() {
        try {
            // Crear credenciales desde variables de entorno
            const serviceAccountCredentials = {
                type: process.env.GOOGLE_SERVICE_ACCOUNT_TYPE,
                project_id: process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID,
                private_key_id: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
                private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
                client_id: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID,
                auth_uri: process.env.GOOGLE_SERVICE_ACCOUNT_AUTH_URI,
                token_uri: process.env.GOOGLE_SERVICE_ACCOUNT_TOKEN_URI,
                auth_provider_x509_cert_url: process.env.GOOGLE_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL,
                client_x509_cert_url: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL,
                universe_domain: process.env.GOOGLE_SERVICE_ACCOUNT_UNIVERSE_DOMAIN
            };

            const firestoreConfig = {
                credentials: serviceAccountCredentials
            };
            
            if (FIRESTORE.PROJECT_ID) {
                firestoreConfig.projectId = FIRESTORE.PROJECT_ID;
            }
            if (FIRESTORE.DATABASE_ID !== '(default)') {
                firestoreConfig.databaseId = FIRESTORE.DATABASE_ID;
            }

            this.db = new Firestore(firestoreConfig);

            // Verificar conexión
            await this.db.collection('_health').doc('test').set({ timestamp: new Date() });
            await this.db.collection('_health').doc('test').delete();
            
            this.initialized = true;
            const logProject = FIRESTORE.PROJECT_ID || 'credenciales de entorno por defecto';
            UTILS.log('info', `Firestore inicializado correctamente - Proyecto: ${logProject}`);
        } catch (error) {
            UTILS.log('error', 'Error al inicializar Firestore', error.message);
            throw error;
        }
    }

    // Verificar si está inicializado
    ensureInitialized() {
        if (!this.initialized || !this.db) {
            throw new Error('Firestore no está inicializado. Llama a initialize() primero.');
        }
    }

    // === FUNCIONES DE LECTURA ===

    // Obtener árbol de carpetas de una unidad específica
    async getFolderTree(driveId) {
        try {
            this.ensureInitialized();
            
            const foldersRef = this.db.collection('folders')
                .where('driveId', '==', driveId)
                .orderBy('full_path');
            
            const snapshot = await foldersRef.get();
            const folders = [];
            
            snapshot.forEach(doc => {
                folders.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return this.buildFolderTree(folders);
        } catch (error) {
            UTILS.log('error', 'Error al obtener árbol de carpetas', error.message);
            throw error;
        }
    }

    // Construir árbol jerárquico de carpetas
    buildFolderTree(folders) {
        const tree = [];
        const folderMap = new Map();
        
        // Crear mapa de carpetas
        folders.forEach(folder => {
            folderMap.set(folder.id, { ...folder, children: [] });
        });
        
        // Construir árbol
        folders.forEach(folder => {
            const folderNode = folderMap.get(folder.id);
            if (folder.parent_id && folderMap.has(folder.parent_id)) {
                folderMap.get(folder.parent_id).children.push(folderNode);
            } else {
                tree.push(folderNode);
            }
        });
        
        return tree;
    }

    // Obtener todas las unidades compartidas
    async getSharedDrivesFromDB() {
        try {
            this.ensureInitialized();
            
            const drivesRef = this.db.collection('shared_drives')
                .orderBy('name');
            
            const snapshot = await drivesRef.get();
            const drives = [];
            
            snapshot.forEach(doc => {
                drives.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return drives;
        } catch (error) {
            UTILS.log('error', 'Error al obtener unidades compartidas', error.message);
            throw error;
        }
    }

    // Obtener managers de una unidad específica
    async getManagers(driveId) {
        try {
            this.ensureInitialized();
            
            const managersRef = this.db.collection('drive_managers')
                .where('driveId', '==', driveId);
            
            const snapshot = await managersRef.get();
            const managers = [];
            
            snapshot.forEach(doc => {
                managers.push(doc.data());
            });
            
            return managers;
        } catch (error) {
            UTILS.log('error', 'Error al obtener managers', error.message);
            throw error;
        }
    }

    // === FUNCIONES DE ESCRITURA (para unidades creadas) ===

    // Insertar nueva unidad compartida creada
    async insertCreatedSharedDrive(drive, managers = []) {
        try {
            this.ensureInitialized();
            
            const batch = this.db.batch();
            
            // Insertar unidad compartida
            const driveRef = this.db.collection('shared_drives').doc(drive.id);
            batch.set(driveRef, {
                ...drive,
                created_by_frontend: true,
                created_at: new Date(),
                updated_at: new Date()
            });
            
            // Insertar managers si existen
            managers.forEach(manager => {
                const managerRef = this.db.collection('drive_managers').doc();
                batch.set(managerRef, {
                    driveId: drive.id,
                    driveName: drive.name,
                    ...manager,
                    created_at: new Date()
                });
            });
            
            await batch.commit();
            UTILS.log('info', `Unidad compartida creada insertada en BD: ${drive.name}`);
            
        } catch (error) {
            UTILS.log('error', 'Error al insertar unidad compartida creada', error.message);
            throw error;
        }
    }

    // Insertar nueva carpeta creada
    async insertCreatedFolder(folderData) {
        try {
            this.ensureInitialized();
            
            const folderRef = this.db.collection('folders').doc(folderData.id);
            await folderRef.set({
                ...folderData,
                created_by_frontend: true,
                created_at: new Date(),
                updated_at: new Date()
            });
            
            UTILS.log('info', `Carpeta creada insertada en BD: ${folderData.name}`);
            
        } catch (error) {
            UTILS.log('error', 'Error al insertar carpeta creada', error.message);
            throw error;
        }
    }

    // Obtener historial de sincronización (últimas 10)
    async getSyncHistory(limit = 10) {
        try {
            this.ensureInitialized();
            
            const syncRef = this.db.collection('sync_history')
                .orderBy('sync_date', 'desc')
                .limit(limit);
            
            const snapshot = await syncRef.get();
            const history = [];
            
            snapshot.forEach(doc => {
                history.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return history;
        } catch (error) {
            UTILS.log('error', 'Error al obtener historial de sincronización', error.message);
            throw error;
        }
    }
}

const firestoreService = new FirestoreService();

module.exports = firestoreService;