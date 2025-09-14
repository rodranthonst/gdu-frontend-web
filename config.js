const path = require('path');

// Configuración de rutas
const PATHS = {
  CREDENTIALS_DIR: path.join(__dirname, 'credenciales')
};

// Configuración de Google Drive API
const GOOGLE_DRIVE = {
  SCOPES: [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ],
  API_VERSION: 'v3'
};

// Configuración del servidor frontend
const SERVER = {
  PORT: process.env.PORT || 3000,
  HTTPS_PORT: process.env.HTTPS_PORT || 3443,
  VERSION: '2.0.0',
  NAME: 'Google Drive Shared Folders Frontend',
  ENABLE_HTTPS: process.env.ENABLE_HTTPS === 'true' || false
};

// Configuración de autenticación
const AUTH = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  ALLOWED_DOMAINS: process.env.ALLOWED_DOMAINS ? process.env.ALLOWED_DOMAINS.split(',') : [],
  JWT_SECRET: process.env.JWT_SECRET || 'default-jwt-secret',
  IMPERSONATE_USER_EMAIL: process.env.IMPERSONATE_USER_EMAIL
};

// Configuración de Firestore
const FIRESTORE = {
  PROJECT_ID: process.env.GCP_PROJECT_ID,
  DATABASE_ID: process.env.FIRESTORE_DATABASE_ID || '(default)'
};

// Mensajes de respuesta
const MESSAGES = {
  ERRORS: {
    FOLDER_NAME_REQUIRED: 'El nombre de la carpeta es requerido',
    FOLDER_NOT_FOUND: 'La carpeta padre especificada no existe',
    AUTHENTICATION_FAILED: 'Error de autenticación',
    DRIVE_API_ERROR: 'Error en la API de Google Drive',
    INVALID_CREDENTIALS: 'Credenciales inválidas',
    UNAUTHORIZED: 'No autorizado',
    INVALID_TOKEN: 'Token inválido'
  },
  SUCCESS: {
    FOLDER_CREATED: 'Carpeta creada exitosamente',
    AUTHENTICATION_SUCCESS: 'Autenticación exitosa',
    IMPERSONATION_SUCCESS: 'Impersonación configurada correctamente',
    LOGOUT_SUCCESS: 'Sesión cerrada exitosamente'
  }
};

// Configuración de logging
const LOGGING = {
  LEVELS: {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
  },
  ENABLE_DEBUG: process.env.NODE_ENV === 'development'
};

// Utilidades
const UTILS = {
  // Función para validar email
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  // Función para formatear fecha
  formatDate: (date) => {
    return new Date(date).toISOString();
  },
  
  // Función para log con timestamp
  log: (level, message, data = null) => {
    if (!LOGGING.ENABLE_DEBUG && level === LOGGING.LEVELS.DEBUG) {
      return;
    }
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }
};

module.exports = {
  PATHS,
  GOOGLE_DRIVE,
  SERVER,
  AUTH,
  FIRESTORE,
  MESSAGES,
  LOGGING,
  UTILS
};