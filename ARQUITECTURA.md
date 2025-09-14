# 🏗️ Arquitectura Frontend - Gestor de Unidades Compartidas

## 📋 Visión General

El frontend está diseñado como una **Single Page Application (SPA)** que proporciona una interfaz intuitiva para gestionar unidades compartidas de Google Drive. Utiliza una arquitectura modular y escalable que permite fácil mantenimiento y extensión.

## 🎯 Principios de Diseño

- **Simplicidad**: Interfaz limpia y fácil de usar
- **Modularidad**: Componentes reutilizables y separación de responsabilidades
- **Seguridad**: Autenticación robusta y manejo seguro de tokens
- **Responsividad**: Adaptable a diferentes dispositivos y tamaños de pantalla
- **Performance**: Carga rápida y operaciones eficientes

## 🏛️ Arquitectura de Capas

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   app.html  │  │ login.html  │  │   tree-styles.css   │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    app.js                              │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │ │
│  │  │ UI Manager  │ │Auth Manager │ │   Event Handlers    │ │ │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                     SERVICE LAYER                          │
│  ┌─────────────────┐  ┌─────────────────────────────────────┐ │
│  │  firestore.js   │  │      googleDriveService.js          │ │
│  └─────────────────┘  └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                   CONFIGURATION LAYER                      │
│  ┌─────────────────┐  ┌─────────────────────────────────────┐ │
│  │    config.js    │  │            server.js                │ │
│  └─────────────────┘  └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Estructura de Archivos Detallada

### `/public/` - Capa de Presentación

#### `app.html`
```html
<!-- Página principal de la aplicación -->
<!DOCTYPE html>
<html>
<head>
    <!-- Meta tags, título, estilos -->
</head>
<body>
    <!-- Estructura del DOM para la aplicación -->
    <div id="app-container">
        <header id="app-header"></header>
        <main id="main-content"></main>
        <aside id="sidebar"></aside>
    </div>
</body>
</html>
```

**Responsabilidades**:
- Estructura base del DOM
- Carga de recursos (CSS, JS)
- Contenedores para componentes dinámicos

#### `login.html`
```html
<!-- Página de autenticación -->
<!DOCTYPE html>
<html>
<body>
    <div id="login-container">
        <div id="google-signin"></div>
        <div id="login-status"></div>
    </div>
</body>
</html>
```

**Responsabilidades**:
- Interfaz de autenticación
- Integración con Google OAuth
- Redirección post-login

#### `tree-styles.css`
```css
/* Estilos para visualización en árbol */
.tree-container { /* Contenedor principal */ }
.tree-node { /* Nodos del árbol */ }
.tree-leaf { /* Hojas del árbol */ }
.tree-expanded { /* Estados expandidos */ }
```

**Responsabilidades**:
- Estilos para componentes de árbol
- Animaciones y transiciones
- Responsive design
- Temas y personalización

#### `app.js` - Controlador Principal
```javascript
// Estructura modular del controlador
class AppController {
    constructor() {
        this.authManager = new AuthManager();
        this.uiManager = new UIManager();
        this.driveService = new GoogleDriveService();
        this.firestoreService = new FirestoreService();
    }

    async init() {
        await this.setupAuthentication();
        await this.loadUserInterface();
        this.setupEventListeners();
    }
}
```

**Módulos Principales**:

1. **AuthManager**
   ```javascript
   class AuthManager {
       async signIn() { /* OAuth flow */ }
       async signOut() { /* Cleanup */ }
       getToken() { /* JWT management */ }
       isAuthenticated() { /* Status check */ }
   }
   ```

2. **UIManager**
   ```javascript
   class UIManager {
       renderDriveList(drives) { /* UI rendering */ }
       showLoading() { /* Loading states */ }
       handleError(error) { /* Error display */ }
       updatePermissions(driveId, permissions) { /* UI updates */ }
   }
   ```

3. **EventHandlers**
   ```javascript
   class EventHandlers {
       setupDriveListeners() { /* Drive events */ }
       setupPermissionListeners() { /* Permission events */ }
       setupNavigationListeners() { /* Navigation events */ }
   }
   ```

### Capa de Servicios

#### `googleDriveService.js`
```javascript
// Servicio para Google Drive API
class GoogleDriveService {
    constructor(config) {
        this.config = config;
        this.gapi = null;
    }

    async initialize() {
        // Inicialización de Google API
    }

    async listSharedDrives() {
        // Obtener unidades compartidas
    }

    async getDrivePermissions(driveId) {
        // Obtener permisos de unidad
    }

    async updatePermissions(driveId, permissions) {
        // Actualizar permisos
    }
}
```

**Responsabilidades**:
- Comunicación con Google Drive API
- Manejo de autenticación OAuth
- Gestión de permisos
- Cache de datos

#### `firestore.js`
```javascript
// Cliente de Firestore
class FirestoreService {
    constructor(config) {
        this.db = firebase.firestore();
        this.config = config;
    }

    async saveDrive(driveData) {
        // Guardar datos de unidad
    }

    async getDrives() {
        // Obtener unidades guardadas
    }

    async syncWithBackend() {
        // Sincronización con backend
    }
}
```

**Responsabilidades**:
- Persistencia de datos
- Sincronización con backend
- Cache local
- Manejo de offline

### Capa de Configuración

#### `config.js`
```javascript
// Configuración centralizada
const config = {
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        scopes: [
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/drive.metadata.readonly'
        ]
    },
    firestore: {
        projectId: process.env.FIRESTORE_PROJECT_ID,
        collections: {
            drives: 'shared_drives',
            permissions: 'drive_permissions'
        }
    },
    ui: {
        theme: 'light',
        language: 'es',
        pageSize: 50
    }
};
```

#### `server.js`
```javascript
// Servidor Express para desarrollo
const express = require('express');
const path = require('path');

const app = express();

// Servir archivos estáticos
app.use(express.static('public'));

// Rutas de autenticación
app.get('/auth/callback', handleOAuthCallback);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

## 🔄 Flujo de Datos

### 1. Inicialización
```
Usuario accede → server.js → app.html → app.js → config.js
                                      ↓
                              AuthManager.init()
                                      ↓
                              Google OAuth Flow
```

### 2. Autenticación
```
login.html → Google OAuth → Callback → JWT Token → app.html
     ↓              ↓            ↓         ↓          ↓
UI Login    → API Request → Auth Code → Token → Main App
```

### 3. Carga de Datos
```
app.js → GoogleDriveService → Google API → Datos
   ↓            ↓                ↓          ↓
UIManager → FirestoreService → Firestore → Cache Local
   ↓            ↓                ↓          ↓
DOM Update ← Sync Service ← Backend API ← Datos Sync
```

### 4. Gestión de Permisos
```
User Action → EventHandler → GoogleDriveService → API Call
     ↓             ↓              ↓                 ↓
UI Update ← UIManager ← Response ← Permission Update
     ↓             ↓              ↓                 ↓
Firestore ← Sync ← Local Cache ← Data Validation
```

## 🎨 Patrones de Diseño Utilizados

### 1. Module Pattern
```javascript
// Encapsulación de funcionalidad
const DriveModule = (function() {
    let privateData = {};
    
    return {
        publicMethod: function() {
            // Lógica pública
        }
    };
})();
```

### 2. Observer Pattern
```javascript
// Para eventos de UI
class EventEmitter {
    constructor() {
        this.events = {};
    }
    
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }
    
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }
}
```

### 3. Factory Pattern
```javascript
// Para crear servicios
class ServiceFactory {
    static createDriveService(config) {
        return new GoogleDriveService(config);
    }
    
    static createFirestoreService(config) {
        return new FirestoreService(config);
    }
}
```

### 4. Singleton Pattern
```javascript
// Para configuración global
class ConfigManager {
    constructor() {
        if (ConfigManager.instance) {
            return ConfigManager.instance;
        }
        ConfigManager.instance = this;
        this.config = {};
    }
}
```

## 🔐 Arquitectura de Seguridad

### Autenticación
```
Usuario → Google OAuth → JWT Token → Local Storage
   ↓           ↓            ↓            ↓
Login UI → Auth Server → Token Validation → Session
```

### Autorización
```
API Call → Token Check → Permission Validation → Resource Access
    ↓          ↓              ↓                    ↓
Request → JWT Verify → Role Check → Allow/Deny
```

### Manejo de Tokens
```javascript
class TokenManager {
    storeToken(token) {
        // Almacenamiento seguro
        localStorage.setItem('auth_token', token);
    }
    
    getToken() {
        // Recuperación y validación
        const token = localStorage.getItem('auth_token');
        return this.validateToken(token) ? token : null;
    }
    
    refreshToken() {
        // Renovación automática
    }
}
```

## 📱 Diseño Responsivo

### Breakpoints
```css
/* Mobile First Approach */
.container {
    width: 100%;
    padding: 1rem;
}

/* Tablet */
@media (min-width: 768px) {
    .container {
        max-width: 750px;
        margin: 0 auto;
    }
}

/* Desktop */
@media (min-width: 1024px) {
    .container {
        max-width: 1200px;
        display: grid;
        grid-template-columns: 250px 1fr;
    }
}
```

### Componentes Adaptativos
```javascript
class ResponsiveManager {
    constructor() {
        this.breakpoints = {
            mobile: 768,
            tablet: 1024,
            desktop: 1200
        };
    }
    
    getCurrentBreakpoint() {
        const width = window.innerWidth;
        if (width < this.breakpoints.mobile) return 'mobile';
        if (width < this.breakpoints.tablet) return 'tablet';
        return 'desktop';
    }
    
    adaptUI() {
        const breakpoint = this.getCurrentBreakpoint();
        this.applyBreakpointStyles(breakpoint);
    }
}
```

## ⚡ Optimización de Performance

### Lazy Loading
```javascript
// Carga diferida de componentes
class LazyLoader {
    static async loadComponent(componentName) {
        const module = await import(`./components/${componentName}.js`);
        return module.default;
    }
}
```

### Caching Strategy
```javascript
class CacheManager {
    constructor() {
        this.cache = new Map();
        this.ttl = 5 * 60 * 1000; // 5 minutos
    }
    
    set(key, value) {
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }
    
    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }
        
        return item.value;
    }
}
```

### Debouncing
```javascript
// Para búsquedas y filtros
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Uso en búsqueda
const searchHandler = debounce((query) => {
    performSearch(query);
}, 300);
```

## 🧪 Testing Strategy

### Unit Tests
```javascript
// Ejemplo de test para AuthManager
describe('AuthManager', () => {
    let authManager;
    
    beforeEach(() => {
        authManager = new AuthManager();
    });
    
    test('should authenticate user successfully', async () => {
        const mockToken = 'mock-jwt-token';
        jest.spyOn(authManager, 'signIn').mockResolvedValue(mockToken);
        
        const result = await authManager.signIn();
        expect(result).toBe(mockToken);
    });
});
```

### Integration Tests
```javascript
// Test de integración con Google API
describe('GoogleDriveService Integration', () => {
    test('should fetch shared drives', async () => {
        const driveService = new GoogleDriveService(testConfig);
        const drives = await driveService.listSharedDrives();
        
        expect(drives).toBeInstanceOf(Array);
        expect(drives.length).toBeGreaterThan(0);
    });
});
```

## 🚀 Deployment Architecture

### Development
```
Local Machine → npm run dev → Express Server → http://localhost:3000
```

### Production
```
Build Process → Static Files → CDN/Web Server → https://domain.com
```

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy Frontend
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Build
        run: npm run build
      - name: Deploy
        run: npm run deploy
```

## 📈 Métricas y Monitoreo

### Performance Metrics
```javascript
class PerformanceMonitor {
    static measurePageLoad() {
        window.addEventListener('load', () => {
            const loadTime = performance.timing.loadEventEnd - 
                           performance.timing.navigationStart;
            console.log(`Page load time: ${loadTime}ms`);
        });
    }
    
    static measureAPICall(apiName, startTime) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.log(`${apiName} took ${duration}ms`);
    }
}
```

### Error Tracking
```javascript
class ErrorTracker {
    static trackError(error, context) {
        const errorData = {
            message: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };
        
        // Enviar a servicio de logging
        this.sendToLoggingService(errorData);
    }
}
```

Esta arquitectura proporciona una base sólida y escalable para el frontend, permitiendo fácil mantenimiento, testing y extensión de funcionalidades.