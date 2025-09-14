// Variables globales
let currentUser = null;
let selectedDrive = null;
let currentPath = [];
let authToken = localStorage.getItem('authToken');

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si hay token en la URL (redirección desde callback)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    
    if (tokenFromUrl) {
        // Guardar token y limpiar URL
        localStorage.setItem('authToken', tokenFromUrl);
        authToken = tokenFromUrl;
        // Limpiar la URL sin recargar la página
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (!authToken) {
        window.location.href = '/';
        return;
    }
    
    initializeApp();
});

// === INICIALIZACIÓN ===

async function initializeApp() {
    try {
        await loadUserInfo();
        await loadSharedDrives();

        setupEventListeners();
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            localStorage.removeItem('authToken');
            window.location.href = '/';
        }
    }
}

function setupEventListeners() {
    // Formulario de crear unidad
    document.getElementById('createDriveForm').addEventListener('submit', handleCreateDrive);
    
    // Cerrar modales al hacer clic fuera
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
}

// === AUTENTICACIÓN ===

async function loadUserInfo() {
    try {
        // Simular información del usuario ya que usamos Firestore directamente
        currentUser = {
            name: 'Usuario',
            picture: 'https://via.placeholder.com/40'
        };
        
        // Actualizar UI
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('userAvatar').src = currentUser.picture;
        
    } catch (error) {
        console.error('Error al cargar usuario:', error);
        throw error;
    }
}

async function logout() {
    try {
        await fetch('/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    } finally {
        localStorage.removeItem('authToken');
        window.location.href = '/';
    }
}

// === UNIDADES COMPARTIDAS ===

async function loadSharedDrives() {
    try {
        const response = await fetch('http://localhost:3001/api/firestore/shared-drives');
        
        if (!response.ok) {
            throw new Error('Error al cargar unidades compartidas');
        }
        
        const data = await response.json();
        displaySharedDrives(data.drives);
        
    } catch (error) {
        console.error('Error al cargar unidades:', error);
        document.getElementById('drivesContainer').innerHTML = 
            '<div class="alert alert-error">Error al cargar unidades compartidas</div>';
    }
}

function displaySharedDrives(drives) {
    const container = document.getElementById('drivesContainer');
    
    if (!drives || drives.length === 0) {
        container.innerHTML = '<div class="alert alert-info">No hay unidades compartidas disponibles</div>';
        return;
    }
    
    // Mostrar conteo total de unidades
    const countInfo = document.createElement('div');
    countInfo.className = 'drives-count';
    countInfo.style.cssText = 'margin-bottom: 1rem; padding: 0.5rem; background: #f8f9fa; border-radius: 4px; font-size: 0.9rem; color: #666;';
    countInfo.innerHTML = `<strong>Total de unidades:</strong> ${drives.length}`;
    
    container.innerHTML = '';
    container.appendChild(countInfo);
    
    const treeContainer = document.createElement('div');
    // Renderizar como árbol jerárquico
    renderDriveTree(drives, treeContainer);
    container.appendChild(treeContainer);
}

// Renderizar árbol de unidades compartidas
function renderDriveTree(drives, container) {
    container.innerHTML = '';
    
    if (drives.length === 0) {
        container.innerHTML = '<p class="no-drives">No hay unidades compartidas disponibles</p>';
        return;
    }

    // Organizar drives por jerarquía
    const organizedDrives = organizeDrivesByHierarchy(drives);
    
    if (organizedDrives.length === 0) {
        container.innerHTML = '<p class="no-drives">No hay unidades jerárquicas disponibles</p>';
        return;
    }
    
    // Crear estructura de árbol contraíble
    const treeStructure = buildTreeStructure(organizedDrives);
    renderTreeStructure(treeStructure, container);
}

// Organizar drives por jerarquía basada en el nombre
function organizeDrivesByHierarchy(drives) {
    // Filtrar solo drives que contengan pipe (|) en el nombre para mantener jerarquía
    const hierarchicalDrives = drives.filter(drive => drive.name.includes('|'));
    
    // Ordenar por nombre para mantener jerarquía visual
    return hierarchicalDrives.sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        
        // Contar el número de separadores '|' para determinar el nivel
        const levelA = (nameA.match(/\|/g) || []).length;
        const levelB = (nameB.match(/\|/g) || []).length;
        
        if (levelA !== levelB) {
            return levelA - levelB;
        }
        
        return nameA.localeCompare(nameB);
    });
}

// Construir estructura de árbol jerárquica
function buildTreeStructure(drives) {
    const tree = {};
    
    drives.forEach(drive => {
        // Dividir por pipes y limpiar espacios
        const parts = drive.name.split('|').map(part => part.trim());
        let current = tree;
        
        parts.forEach((part, index) => {
            // Solo procesar partes no vacías
            if (part) {
                if (!current[part]) {
                    current[part] = {
                        children: {},
                        drive: index === parts.length - 1 ? drive : null,
                        path: parts.slice(0, index + 1).filter(p => p).join(' | '),
                        level: index
                    };
                }
                current = current[part].children;
            }
        });
    });
    
    return tree;
}

// Renderizar estructura de árbol contraíble
function renderTreeStructure(tree, container, level = 0) {
    Object.keys(tree).forEach(key => {
        const node = tree[key];
        const hasChildren = Object.keys(node.children).length > 0;
        
        // Crear elemento contenedor
        const nodeContainer = document.createElement('div');
        nodeContainer.className = 'tree-node';
        
        // Crear elemento del nodo
        const nodeElement = document.createElement('div');
        nodeElement.className = `tree-item clickable ${node.drive ? 'drive' : 'folder'} level-${level}`;
        nodeElement.style.marginLeft = `${level * 20}px`;
        
        // Agregar icono de expansión si tiene hijos
        if (hasChildren) {
            const expandIcon = document.createElement('span');
            expandIcon.className = 'expand-icon';
            expandIcon.textContent = '▶';
            nodeElement.appendChild(expandIcon);
        }
        
        // Agregar texto del nodo
        const textSpan = document.createElement('span');
        textSpan.textContent = key;
        nodeElement.appendChild(textSpan);
        
        // Configurar datos del nodo
        if (node.drive) {
            nodeElement.dataset.driveId = node.drive.id;
            nodeElement.dataset.driveName = node.drive.name;
            nodeElement.dataset.path = node.path;
        } else {
            nodeElement.dataset.path = node.path;
        }
        
        // Agregar event listener
        nodeElement.addEventListener('click', (e) => {
            e.stopPropagation();
            if (hasChildren) {
                toggleTreeNode(nodeContainer, nodeElement);
            }
            if (node.drive || !hasChildren) {
                selectTreeNode(node, nodeElement);
            }
        });
        
        nodeContainer.appendChild(nodeElement);
        
        // Crear contenedor para hijos
        if (hasChildren) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'tree-children collapsed';
            renderTreeStructure(node.children, childrenContainer, level + 1);
            nodeContainer.appendChild(childrenContainer);
        }
        
        container.appendChild(nodeContainer);
    });
}

// Alternar expansión de nodo del árbol
function toggleTreeNode(container, element) {
    const childrenContainer = container.querySelector('.tree-children');
    const expandIcon = element.querySelector('.expand-icon');
    
    if (childrenContainer) {
        const isCollapsed = childrenContainer.classList.contains('collapsed');
        childrenContainer.classList.toggle('collapsed', !isCollapsed);
        expandIcon.textContent = isCollapsed ? '▼' : '▶';
    }
}

// Seleccionar nodo del árbol
function selectTreeNode(node, element) {
    // Remover selección anterior
    document.querySelectorAll('.tree-item.selected').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Agregar selección al elemento actual
    element.classList.add('selected');
    
    // Si es una unidad, seleccionarla
    if (node.drive) {
        selectDrive(node.drive);
    }
}

function selectDrive(drive) {
    selectedDrive = drive;
    
    // Actualizar UI
    document.querySelectorAll('.tree-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Marcar como seleccionado en el árbol
    const treeItems = document.querySelectorAll('.tree-item');
    treeItems.forEach(item => {
        if (item.dataset.driveId === drive.id) {
            item.classList.add('selected');
        }
    });
    
    // Mostrar información de la unidad seleccionada
    showDriveInfo(drive);
}

// === INFORMACIÓN DE UNIDAD ===

function showDriveInfo(drive) {
    // Mostrar información de la unidad seleccionada
    const driveInfoSection = document.getElementById('driveInfoSection');
    const driveInfo = document.getElementById('driveInfo');
    
    if (driveInfoSection && driveInfo) {
        driveInfoSection.style.display = 'block';
        driveInfo.innerHTML = `
            <div class="drive-info">
                <h3>Unidad Seleccionada: ${drive.name}</h3>
                <p><strong>ID:</strong> ${drive.id}</p>
                <p><strong>Última sincronización:</strong> ${drive.lastSync || 'No disponible'}</p>
                <p><strong>Estado:</strong> ${drive.status || 'Activa'}</p>
            </div>
        `;
    }
}

// === CREACIÓN DE UNIDADES ===

function openCreateDriveModal() {
    document.getElementById('createDriveModal').style.display = 'block';
    document.getElementById('driveName').focus();
}

async function handleCreateDrive(event) {
    event.preventDefault();
    
    const name = document.getElementById('driveName').value.trim();
    const managersInput = document.getElementById('driveManagers').value.trim();
    
    if (!name) {
        showAlert('El nombre de la unidad es requerido', 'error');
        return;
    }
    
    // Obtener la ruta del nodo seleccionado
    const selectedElement = document.querySelector('.tree-item.selected');
    let fullName = name;
    
    if (selectedElement && selectedElement.dataset.path) {
        const currentPath = selectedElement.dataset.path;
        if (currentPath && currentPath !== '') {
            fullName = `${currentPath} | ${name}`;
        }
    }
    
    // Procesar managers
    const managers = managersInput ? 
        managersInput.split(',').map(email => email.trim()).filter(email => email) : [];
    
    try {
        const submitBtn = event.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creando...';
        
        const response = await fetch('/api/shared-drives', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ name: fullName, managers })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al crear unidad');
        }
        
        const data = await response.json();
        
        showAlert(`Unidad "${data.drive.name}" creada exitosamente`, 'success');
        closeModal('createDriveModal');
        
        // Recargar unidades
        await loadSharedDrives();
        
        // Limpiar formulario
        document.getElementById('createDriveForm').reset();
        
    } catch (error) {
        console.error('Error al crear unidad:', error);
        showAlert(error.message, 'error');
    } finally {
        const submitBtn = event.target.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Crear Unidad';
    }
}



// === UTILIDADES ===

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function showAlert(message, type = 'info') {
    // Crear elemento de alerta
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    // Insertar al inicio del container
    const container = document.querySelector('.container');
    container.insertBefore(alert, container.firstChild);
    
    // Remover después de 5 segundos
    setTimeout(() => {
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
        }
    }, 5000);
    
    // Scroll hacia arriba para mostrar la alerta
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// === MANEJO DE ERRORES GLOBALES ===

window.addEventListener('unhandledrejection', function(event) {
    console.error('Error no manejado:', event.reason);
    if (event.reason.message && event.reason.message.includes('401')) {
        localStorage.removeItem('authToken');
        window.location.href = '/';
    }
});

window.addEventListener('error', function(event) {
    console.error('Error de JavaScript:', event.error);
});