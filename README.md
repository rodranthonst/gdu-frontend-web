# 📱 Frontend App - Gestor de Unidades Compartidas

## 🎯 Propósito

Esta aplicación frontend proporciona una interfaz web para gestionar unidades compartidas de Google Drive. Permite a los usuarios autenticarse, visualizar y administrar las unidades compartidas de su organización de forma intuitiva.

## ⚡ Características Principales

- **Autenticación OAuth 2.0**: Login seguro con Google Workspace
- **Visualización de Unidades**: Lista completa de unidades compartidas
- **Gestión de Permisos**: Administración de accesos y roles
- **Interfaz Responsiva**: Diseño adaptable a diferentes dispositivos
- **Sincronización en Tiempo Real**: Actualización automática de datos

## 🏗️ Arquitectura

```
frontend-app/
├── public/
│   ├── app.html          # Página principal de la aplicación
│   ├── app.js            # Lógica del frontend y manejo del DOM
│   ├── login.html        # Página de autenticación
│   └── tree-styles.css   # Estilos para la visualización en árbol
├── config.js             # Configuración de la aplicación
├── firestore.js          # Cliente de Firestore para datos
├── googleDriveService.js # Servicio para interactuar con Google Drive
├── server.js             # Servidor Express para servir archivos estáticos
└── .env                  # Variables de entorno (no incluido en repo)
```

## 🔧 Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Servidor**: Node.js + Express
- **Autenticación**: Google OAuth 2.0
- **Base de Datos**: Google Firestore
- **APIs**: Google Drive API, Google Admin SDK

## 🚀 Instalación y Configuración

### 1. Prerrequisitos

- Node.js 16+ instalado
- Cuenta de Google Workspace con permisos de administrador
- Proyecto en Google Cloud Platform configurado

### 2. Configuración

```bash
# Clonar e instalar dependencias
npm install

# Copiar template de configuración
cp .env.template .env

# Editar .env con tus credenciales
# (Ver sección de Variables de Entorno)
```

### 3. Ejecutar en Desarrollo

```bash
npm run dev
# La aplicación estará disponible en http://localhost:3000
```

### 4. Ejecutar en Producción

```bash
npm start
```

## 🔐 Variables de Entorno

Copia `.env.template` a `.env` y configura:

```env
# OAuth 2.0 Configuration
GOOGLE_CLIENT_ID=tu_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu_client_secret
REDIRECT_URI=http://localhost:3000/auth/callback

# JWT Configuration
JWT_SECRET=tu_jwt_secret_muy_seguro

# Service Account (para APIs)
GOOGLE_SERVICE_ACCOUNT_EMAIL=tu-service@proyecto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_PROJECT_ID=tu-proyecto-id

# Firestore
FIRESTORE_PROJECT_ID=tu-proyecto-firestore

# Application Settings
PORT=3000
NODE_ENV=development
```

## 🔗 Integración con Backend

Esta aplicación puede funcionar de forma independiente o integrada con el backend de sincronización:

### Modo Independiente
- Acceso directo a Google Drive API
- Autenticación OAuth propia
- Datos almacenados en Firestore

### Modo Integrado
- Comunicación con backend-sync via API REST
- Sincronización automática de datos
- Gestión centralizada de permisos

## 📡 APIs Utilizadas

### Google Drive API
```javascript
// Obtener unidades compartidas
const drives = await gapi.client.drive.drives.list({
  pageSize: 100
});
```

### Firestore
```javascript
// Guardar datos de unidad
const docRef = await db.collection('shared_drives').add({
  name: drive.name,
  id: drive.id,
  createdTime: new Date()
});
```

## 🎨 Personalización de UI

### Estilos
Modifica `public/tree-styles.css` para personalizar:
- Colores del tema
- Tipografía
- Layout de componentes
- Animaciones

### Componentes
Edita `public/app.js` para:
- Agregar nuevas funcionalidades
- Modificar comportamientos
- Integrar nuevos servicios

## 🔒 Seguridad

- **OAuth 2.0**: Autenticación segura con Google
- **JWT**: Tokens seguros para sesiones
- **HTTPS**: Requerido en producción
- **Variables de Entorno**: Credenciales nunca hardcodeadas
- **Validación**: Verificación de permisos en cada operación

## 🐛 Solución de Problemas

### Error de Autenticación
```
Error: invalid_client
```
**Solución**: Verificar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET

### Error de Permisos
```
Error: insufficient permissions
```
**Solución**: Verificar Domain-Wide Delegation y scopes

### Error de Conexión a Firestore
```
Error: permission denied
```
**Solución**: Verificar reglas de Firestore y credenciales

## 📚 Recursos Adicionales

- [Google Drive API Documentation](https://developers.google.com/drive/api)
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Express.js Guide](https://expressjs.com/)

## 🤝 Uso Independiente

Esta aplicación frontend puede usarse completamente independiente del backend:

1. **Configura tu propio proyecto de Google Cloud**
2. **Habilita las APIs necesarias** (Drive, Admin SDK)
3. **Configura OAuth 2.0** para tu dominio
4. **Personaliza la lógica** según tus necesidades
5. **Despliega** en tu infraestructura preferida

**Ideal para**: Desarrolladores que quieren una interfaz lista para gestionar Google Drive pero con su propia lógica de backend.