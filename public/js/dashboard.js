// Dashboard JavaScript - Campo Directo

document.addEventListener('DOMContentLoaded', async function() {
    // Verificación rápida: si no hay token, ir a login inmediatamente
    const tokenQuick = localStorage.getItem('authToken');
    if (!tokenQuick) {
        window.location.href = 'login.html';
        return;
    }
    // Verificación de autenticación real con token
    const authed = await ensureAuthWithAPI();
    if (!authed) {
        return;
    }

    // Inicialización base
    initializeDashboard();
    initializeRecentActivities();
    setupNavigation();
    setupUserMenu();
    setupModal();
    setupTabs();
    setupEventListeners();

    // Cargar datos reales desde la API
    await loadRealUser();
    await Promise.all([
        loadCategories(),
        loadRealStats(),
        loadRealProducts(),
        loadRealOrders(),
        loadRealActivities()
    ]).catch(console.error);

    // Actualizaciones periódicas
    setInterval(updateRecentActivitiesTime, 30000);

    // Aplicar estados visuales a productos
    applyProductStates();
});

// Cargar actividades reales
async function loadRealActivities() {
    try {
        const res = await api.get('/dashboard/activities');
        const activities = res.data?.activities || res.data?.data?.activities || [];
        dashboardData.recentActivities = activities.map(a => ({
            id: a.id,
            description: a.descripcion,
            type: a.tipo,
            timestamp: a.fecha_actividad
        }));
        updateRecentActivities();
    } catch (e) {
        handleAuthError(e);
        updateRecentActivities();
    }
}

// Datos (se rellenarán con API). Mantengo estructura como fallback
let dashboardData = {
    user: {
        name: 'Juan Pérez',
        farmName: 'Finca San José',
        location: 'Cundinamarca, Colombia',
        area: '5 hectáreas',
        type: 'Orgánico'
    },
    stats: {
        activeProducts: 12,
        pendingOrders: 3,
        monthSales: 1250000,
        rating: 4.8
    },
    products: [
        {
            id: 1,
            name: 'Tomates Cherry',
            category: 'vegetales',
            price: 8000,
            stock: 25,
            status: 'disponible',
            description: 'Tomates cherry orgánicos, cultivados sin químicos'
        },
        {
            id: 2,
            name: 'Lechugas Crespa',
            category: 'vegetales',
            price: 3500,
            stock: 40,
            status: 'disponible',
            description: 'Lechugas frescas hidropónicas'
        },
        {
            id: 3,
            name: 'Zanahorias',
            category: 'vegetales',
            price: 4500,
            stock: 0,
            status: 'agotado',
            description: 'Zanahorias orgánicas grandes'
        },
        {
            id: 4,
            name: 'Fresas',
            category: 'frutas',
            price: 15000,
            stock: 10,
            status: 'disponible',
            description: 'Fresas dulces de invernadero'
        }
    ],
    orders: [
        {
            id: 'ORD-001',
            customer: 'María García',
            items: 'Tomates Cherry (3kg), Lechugas (5 unidades)',
            total: 41500,
            status: 'pending',
            date: '2024-10-06',
            phone: '320 123 4567'
        },
        {
            id: 'ORD-002',
            customer: 'Carlos López',
            items: 'Fresas (2kg)',
            total: 30000,
            status: 'pending',
            date: '2024-10-06',
            phone: '315 987 6543'
        },
        {
            id: 'ORD-003',
            customer: 'Ana Rodríguez',
            items: 'Zanahorias (4kg)',
            total: 18000,
            status: 'completed',
            date: '2024-10-05',
            phone: '301 456 7890'
        }
    ]
};

function initializeDashboard() {
    // Cargar datos del usuario desde sessionStorage si existen
    const loginData = sessionStorage.getItem('loginData');
    if (loginData) {
        const userData = JSON.parse(loginData);
        dashboardData.user.name = userData.username || dashboardData.user.name;
    }

    // Cargar datos de registro si existen
    const registroData = sessionStorage.getItem('registroUsuario');
    if (registroData) {
        const registro = JSON.parse(registroData);
        dashboardData.user.name = `${registro.nombre} ${registro.apellido}`;
        if (registro.nombreFinca) {
            dashboardData.user.farmName = registro.nombreFinca;
        }
    }

    updateUserGreeting();
    updateStats();
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remover clase active de todos los items
            navItems.forEach(nav => nav.classList.remove('active'));
            sections.forEach(section => section.classList.remove('active'));
            
            // Agregar clase active al item clickeado
            this.classList.add('active');
            
            // Mostrar la sección correspondiente
            const targetSection = this.getAttribute('data-section');
            const section = document.getElementById(targetSection);
            if (section) {
                section.classList.add('active');
                
                // Cargar contenido específico de la sección
                loadSectionContent(targetSection);
            }
        });
    });
}

function setupUserMenu() {
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    const logoutBtn = document.getElementById('logoutBtn');

    userMenuBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
    });

    // Cerrar dropdown al hacer click fuera
    document.addEventListener('click', function() {
        userDropdown.classList.remove('show');
    });

    // Logout functionality
    logoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        handleLogout();
    });
}

function setupModal() {
    const modal = document.getElementById('addProductModal');
    const addProductBtn = document.getElementById('addProductBtn');
    const closeModal = document.getElementById('closeModal');
    const cancelProduct = document.getElementById('cancelProduct');
    const addProductForm = document.getElementById('addProductForm');

    // Abrir modal
    addProductBtn.addEventListener('click', function() {
        modal.classList.add('show');
        resetForm();
    });

    // Cerrar modal
    closeModal.addEventListener('click', function() {
        modal.classList.remove('show');
    });

    cancelProduct.addEventListener('click', function() {
        modal.classList.remove('show');
    });

    // Cerrar modal al hacer click en el overlay
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });

    // Manejar submit del formulario
    addProductForm.addEventListener('submit', function(e) {
        e.preventDefault();
        handleAddProduct();
    });
}

function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remover active de todos los tabs
            tabBtns.forEach(tab => tab.classList.remove('active'));
            
            // Agregar active al tab clickeado
            this.classList.add('active');
            
            // Cargar contenido del tab
            const tabType = this.getAttribute('data-tab');
            loadOrdersTab(tabType);
        });
    });
}

async function loadRealUser() {
    try {
        const res = await authApi.getMe();
        const u = res.data.user;
        dashboardData.user.name = `${u.nombre} ${u.apellido}`;
        if (u.finca) {
            dashboardData.user.farmName = u.finca.nombre || dashboardData.user.farmName;
            dashboardData.user.location = `${u.finca.departamento || 'Por definir'}, ${u.finca.municipio || ''}`.trim();
            dashboardData.user.area = u.finca.area ? `${u.finca.area} hectáreas` : dashboardData.user.area;
            dashboardData.user.type = (u.finca.tipo_cultivo || 'Orgánico');
            dashboardData.user.fincaId = u.finca.id || null;
        }
        // Calificación desde el usuario
        if (!dashboardData.stats) dashboardData.stats = {};
        dashboardData.stats.rating = u.calificacion_promedio || 0;
        updateUserGreeting();
        loadUserStaticInfo();
    } catch (e) {
        handleAuthError(e);
    }
}

function loadUserStaticInfo() {
    // Actualizar nombre de usuario en el header
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = dashboardData.user.name;
    }

    // Actualizar información de la finca
    document.getElementById('farmName').textContent = dashboardData.user.farmName;
    document.getElementById('farmLocation').textContent = dashboardData.user.location;
    document.getElementById('farmArea').textContent = dashboardData.user.area;
    document.getElementById('farmType').textContent = dashboardData.user.type;
}

function updateUserGreeting() {
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = dashboardData.user.name;
    }
}

async function loadRealStats() {
    try {
        const res = await api.get('/dashboard/stats');
        const s = res.data.stats || res.data?.data?.stats || res.data; // por compatibilidad
        if (!dashboardData.stats) dashboardData.stats = {};
        dashboardData.stats.activeProducts = s.productos_activos || 0;
        dashboardData.stats.pendingOrders = s.pedidos_pendientes || 0;
        dashboardData.stats.monthSales = Number(s.ventas_mes_actual || 0);
        updateStats();
    } catch (e) {
        handleAuthError(e);
    }
}

function updateStats() {
    document.getElementById('activeProducts').textContent = dashboardData.stats.activeProducts;
    document.getElementById('pendingOrders').textContent = dashboardData.stats.pendingOrders;
    document.getElementById('monthSales').textContent = dashboardData.stats.monthSales.toLocaleString();
    document.getElementById('rating').textContent = dashboardData.stats.rating;
}

async function loadRealProducts() {
    try {
        // Obtener usuario para su id
        const me = await authApi.getMe();
        const userId = me.data.user.id;
        const result = await productApi.getProducts({ usuario_id: userId, limit: 12 });
        const products = (result.data?.products) || (result.data?.data?.products) || result.data?.data?.result?.products || result.data?.data || [];
        // Mapear a estructura de UI
        dashboardData.products = (products || []).map(p => ({
            id: p.id,
            name: p.nombre,
            category: p.categoria || '—',
            price: Number(p.precio_por_kg || 0),
            stock: Number(p.stock_disponible || 0),
            status: p.estado || 'disponible',
            description: p.descripcion || ''
        }));
        loadProducts();
    } catch (e) {
        handleAuthError(e);
        loadProducts(); // mostrar lo que haya (posible vacío)
    }
}

function loadProducts() {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;

    productsGrid.innerHTML = '';

    dashboardData.products.forEach(product => {
        const productCard = createProductCard(product);
        productsGrid.appendChild(productCard);
    });
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
        <div class="product-header">
            <div class="product-name">${product.name}</div>
            <div class="product-category">${product.category}</div>
        </div>
        <div class="product-body">
            <div class="product-price">$${product.price.toLocaleString()} /kg</div>
            <div class="product-stock">
                Stock: ${product.stock} ${product.stock === 0 ? '(Agotado)' : 'disponibles'}
            </div>
            <p>${product.description}</p>
            <div class="product-actions">
                <button class="btn btn-small btn-primary" onclick="editProduct(${product.id})">
                    Editar
                </button>
                <button class="btn btn-small btn-warning" onclick="updateStock(${product.id})">
                    Stock
                </button>
                <button class="btn btn-small btn-danger" onclick="deleteProduct(${product.id})">
                    Eliminar
                </button>
            </div>
        </div>
    `;
    return card;
}

async function loadRealOrders() {
    try {
        const res = await api.get('/orders?estado=pending&limit=10');
        const orders = res.data?.orders || res.data?.data?.orders || res.data?.data?.result?.orders || res.data?.data || [];
        const me = await authApi.getMe();
        const isFarmer = me.data.user.tipo_usuario === 'campesino';
        dashboardData.orders = (orders || []).map(o => ({
            id: o.id,
            customer: isFarmer ? (o.nombre_comprador || 'Cliente') : (o.nombre_campesino || 'Campesino'),
            items: `${o.cantidad_total || 0} productos`,
            total: Number(o.total || 0),
            status: o.estado,
            date: o.fecha_pedido,
            phone: isFarmer ? (o.telefono_comprador || '') : (o.telefono_campesino || '')
        }));
        loadOrders();
    } catch (e) {
        handleAuthError(e);
        loadOrders();
    }
}

function loadOrders() {
    loadOrdersTab('pending');
}

function loadOrdersTab(tabType) {
    const ordersList = document.getElementById('ordersList');
    if (!ordersList) return;

    let filteredOrders = dashboardData.orders;
    if (tabType !== 'all') {
        filteredOrders = dashboardData.orders.filter(order => order.status === tabType);
    }

    ordersList.innerHTML = '';

    if (filteredOrders.length === 0) {
        ordersList.innerHTML = '<p>No hay pedidos para mostrar.</p>';
        return;
    }

    filteredOrders.forEach(order => {
        const orderCard = createOrderCard(order);
        ordersList.appendChild(orderCard);
    });
}

function createOrderCard(order) {
    const card = document.createElement('div');
    card.className = 'order-card';
    
    const statusClass = order.status === 'pending' ? 'status-pending' : 'status-completed';
    const statusText = order.status === 'pending' ? 'Pendiente' : 'Completado';
    
    card.innerHTML = `
        <div class="order-header">
            <div class="order-info">
                <h4>Pedido ${order.id}</h4>
                <p><strong>Cliente:</strong> ${order.customer}</p>
                <p><strong>Teléfono:</strong> ${order.phone}</p>
                <p><strong>Fecha:</strong> ${formatDate(order.date)}</p>
            </div>
            <span class="order-status ${statusClass}">${statusText}</span>
        </div>
        <div class="order-details">
            <p><strong>Productos:</strong> ${order.items}</p>
            <p><strong>Total:</strong> $${order.total.toLocaleString()}</p>
        </div>
        ${order.status === 'pending' ? `
            <div class="order-actions">
                <button class="btn btn-small btn-success" onclick="completeOrder('${order.id}')">
                    Marcar como Completado
                </button>
                <button class="btn btn-small btn-secondary" onclick="contactCustomer('${order.phone}')">
                    Contactar Cliente
                </button>
            </div>
        ` : ''}
    `;
    return card;
}

function loadSectionContent(sectionName) {
    switch(sectionName) {
        case 'products':
            loadProducts();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'overview':
            updateStats();
            break;
    }
}

function setupEventListeners() {
    // Filtros de productos
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');

    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterProducts);
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', filterProducts);
    }
}

function filterProducts() {
    const category = document.getElementById('categoryFilter').value;
    const status = document.getElementById('statusFilter').value;

    let filteredProducts = dashboardData.products;

    if (category) {
        filteredProducts = filteredProducts.filter(product => product.category === category);
    }

    if (status) {
        filteredProducts = filteredProducts.filter(product => product.status === status);
    }

    // Actualizar la grilla
    const productsGrid = document.getElementById('productsGrid');
    productsGrid.innerHTML = '';
    
    filteredProducts.forEach(product => {
        const productCard = createProductCard(product);
        productsGrid.appendChild(productCard);
    });
}

function handleAddProduct() {
    const formData = new FormData(document.getElementById('addProductForm'));
    
    const name = formData.get('productName').trim();
    const categoryId = parseInt(formData.get('productCategory')); // ahora contiene id real
    const price = parseInt(formData.get('productPrice'));
    const stock = parseInt(formData.get('productStock'));
    const description = formData.get('productDescription') || '';

    try {
        const fincaId = dashboardData.user.fincaId;
        if (!fincaId) throw new Error('No se encontró la finca del usuario');
        const payload = {
            nombre: name,
            descripcion: description,
            categoria_id: categoryId,
            finca_id: fincaId,
            precio_por_kg: price,
            stock_disponible: stock,
            unidad_medida: 'kg'
        };
        await productApi.createProduct(payload);
        // Refrescar datos reales
        await Promise.all([loadRealProducts(), loadRealStats()]);
        // Cerrar modal
        document.getElementById('addProductModal').classList.remove('show');
        showNotification('Producto agregado exitosamente', 'success');
    } catch (e) {
        handleAuthError(e);
        showNotification('No se pudo crear el producto', 'error');
    }
}

function resetForm() {
    document.getElementById('addProductForm').reset();
}

// Funciones de acciones de productos
function editProduct(productId) {
    const product = dashboardData.products.find(p => p.id === productId);
    if (product) {
        showEditProductModal(product);
    }
}

// Modal para editar producto
function showEditProductModal(product) {
    const modal = document.createElement('div');
    modal.className = 'modal show edit-product-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Editar Producto</h3>
                <button class="modal-close" onclick="closeEditProductModal()">&times;</button>
            </div>
            <form id="editProductForm" class="modal-form">
                <input type="hidden" id="editProductId" value="${product.id}">
                <div class="form-group">
                    <label for="editProductName">Nombre del Producto</label>
                    <input type="text" id="editProductName" name="productName" value="${product.name}" required>
                </div>
                <div class="form-group">
                    <label for="editProductCategory">Categoría</label>
                    <select id="editProductCategory" name="productCategory" required>
                        <option value="vegetales" ${product.category === 'vegetales' ? 'selected' : ''}>Vegetales</option>
                        <option value="frutas" ${product.category === 'frutas' ? 'selected' : ''}>Frutas</option>
                        <option value="granos" ${product.category === 'granos' ? 'selected' : ''}>Granos</option>
                        <option value="hierbas" ${product.category === 'hierbas' ? 'selected' : ''}>Hierbas</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="editProductPrice">Precio por kg/unidad</label>
                    <input type="number" id="editProductPrice" name="productPrice" value="${product.price}" min="0" step="100" required>
                </div>
                <div class="form-group">
                    <label for="editProductStock">Cantidad disponible</label>
                    <input type="number" id="editProductStock" name="productStock" value="${product.stock}" min="0" required>
                </div>
                <div class="form-group">
                    <label for="editProductDescription">Descripción</label>
                    <textarea id="editProductDescription" name="productDescription" rows="3">${product.description}</textarea>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeEditProductModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Configurar el formulario
    const form = document.getElementById('editProductForm');
    form.addEventListener('submit', handleEditProduct);
}

function closeEditProductModal() {
    const modal = document.querySelector('.edit-product-modal');
    if (modal) {
        modal.remove();
    }
}

function handleEditProduct(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const productId = parseInt(document.getElementById('editProductId').value);
    const product = dashboardData.products.find(p => p.id === productId);
    
    if (product) {
        // Mostrar estado de carga
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Guardando...';
        submitBtn.disabled = true;
        
        setTimeout(() => {
            // Actualizar producto
            product.name = formData.get('productName');
            product.category = formData.get('productCategory');
            product.price = parseInt(formData.get('productPrice'));
            product.stock = parseInt(formData.get('productStock'));
            product.status = product.stock > 0 ? 'disponible' : 'agotado';
            product.description = formData.get('productDescription') || 'Sin descripción';
            product.lastModified = new Date().toISOString();
            
            // Actualizar estadísticas
            dashboardData.stats.activeProducts = dashboardData.products.filter(p => p.status === 'disponible').length;
            updateStats();
            
            // Recargar productos
            loadProducts();
            
            // Cerrar modal
            closeEditProductModal();
            
            // Mostrar notificación y registrar actividad
            showNotification('Producto actualizado exitosamente', 'success');
            addRecentActivity(`Producto editado - ${product.name}`, 'product');
        }, 1000);
    }
}

function updateStock(productId) {
    const product = dashboardData.products.find(p => p.id === productId);
    if (product) {
        const newStock = prompt(`Stock actual: ${product.stock}\nIngrese el nuevo stock:`, product.stock);
        if (newStock !== null && !isNaN(newStock)) {
            product.stock = parseInt(newStock);
            product.status = product.stock > 0 ? 'disponible' : 'agotado';
            
            // Actualizar estadísticas
            dashboardData.stats.activeProducts = dashboardData.products.filter(p => p.status === 'disponible').length;
            updateStats();
            
            loadProducts();
            showNotification('Stock actualizado correctamente', 'success');
        }
    }
}

function deleteProduct(productId) {
    const product = dashboardData.products.find(p => p.id === productId);
    if (product && confirm(`¿Estás seguro de que quieres eliminar "${product.name}"?`)) {
        dashboardData.products = dashboardData.products.filter(p => p.id !== productId);
        
        // Actualizar estadísticas
        dashboardData.stats.activeProducts = dashboardData.products.filter(p => p.status === 'disponible').length;
        updateStats();
        
        loadProducts();
        showNotification('Producto eliminado correctamente', 'success');
    }
}

// Funciones de acciones de pedidos
function completeOrder(orderId) {
    const order = dashboardData.orders.find(o => o.id === orderId);
    if (order && confirm(`¿Marcar como completado el pedido ${orderId}?`)) {
        // Mostrar estado de carga
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = 'Procesando...';
        btn.disabled = true;
        
        setTimeout(() => {
            order.status = 'completed';
            order.completedDate = new Date().toISOString();
            
            // Actualizar estadísticas
            dashboardData.stats.pendingOrders = dashboardData.orders.filter(o => o.status === 'pending').length;
            updateStats();
            
            loadOrdersTab('pending'); // Recargar tab actual
            showNotification('Pedido marcado como completado', 'success');
            
            // Registrar actividad
            addRecentActivity(`Pedido ${orderId} completado`, 'completed');
        }, 800);
    }
}

function contactCustomer(phone, customerName, orderId) {
    const contactOptions = [
        {
            name: 'WhatsApp',
            action: () => {
                const message = `Hola ${customerName}, me comunico desde Campo Directo sobre su pedido ${orderId}. ¿En qué le puedo ayudar?`;
                const whatsappUrl = `https://wa.me/57${phone.replace(/\s/g, '')}?text=${encodeURIComponent(message)}`;
                window.open(whatsappUrl, '_blank');
                
                // Registrar actividad de contacto
                addRecentActivity(`Contacto vía WhatsApp con ${customerName}`, 'contact');
                showNotification('Abriendo WhatsApp...', 'info');
            }
        },
        {
            name: 'Llamar',
            action: () => {
                window.open(`tel:${phone.replace(/\s/g, '')}`, '_self');
                addRecentActivity(`Llamada a ${customerName}`, 'contact');
                showNotification('Iniciando llamada...', 'info');
            }
        },
        {
            name: 'SMS',
            action: () => {
                const message = `Hola ${customerName}, Campo Directo: Su pedido ${orderId} está listo. ¡Gracias por su compra!`;
                window.open(`sms:${phone.replace(/\s/g, '')}?body=${encodeURIComponent(message)}`, '_self');
                addRecentActivity(`SMS enviado a ${customerName}`, 'contact');
                showNotification('Abriendo SMS...', 'info');
            }
        }
    ];
    
    showContactModal(contactOptions, customerName, phone);
}

// Modal de opciones de contacto
function showContactModal(options, customerName, phone) {
    const modal = document.createElement('div');
    modal.className = 'modal show contact-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Contactar Cliente</h3>
                <button class="modal-close" onclick="closeContactModal()">&times;</button>
            </div>
            <div class="contact-modal-body">
                <div class="customer-info">
                    <h4>${customerName}</h4>
                    <p>${phone}</p>
                </div>
                <div class="contact-options">
                    ${options.map(option => `
                        <button class="contact-option-btn" onclick="${option.action.toString().slice(6, -1)}; closeContactModal();">
                            <span class="contact-icon">${getContactIcon(option.name)}</span>
                            <span>${option.name}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Auto-cerrar después de 10 segundos
    setTimeout(() => {
        if (document.body.contains(modal)) {
            closeContactModal();
        }
    }, 10000);
}

function closeContactModal() {
    const modal = document.querySelector('.contact-modal');
    if (modal) {
        modal.remove();
    }
}

function getContactIcon(type) {
    const icons = {
        'WhatsApp': '📱',
        'Llamar': '📞',
        'SMS': '💬'
    };
    return icons[type] || '📞';
}

function handleLogout() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        // Limpiar token y sesión
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('loginData');
        sessionStorage.removeItem('registroUsuario');
        window.location.href = 'login.html';
    }
}

// Función auxiliar para formatear fechas
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Función para formatear tiempo relativo
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);
    
    if (diffInMins < 1) {
        return 'Hace menos de un minuto';
    } else if (diffInMins < 60) {
        return `Hace ${diffInMins} minuto${diffInMins > 1 ? 's' : ''}`;
    } else if (diffInHours < 24) {
        return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    } else if (diffInDays < 7) {
        return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
    } else {
        return formatDate(dateString);
    }
}

// Función para agregar actividad reciente
function addRecentActivity(description, type = 'info') {
    const newActivity = {
        id: Date.now(),
        description: description,
        type: type,
        timestamp: new Date().toISOString()
    };
    
    // Agregar al inicio del array
    if (!dashboardData.recentActivities) {
        dashboardData.recentActivities = [];
    }
    
    dashboardData.recentActivities.unshift(newActivity);
    
    // Mantener solo los últimos 10
    dashboardData.recentActivities = dashboardData.recentActivities.slice(0, 10);
    
    // Actualizar la vista si estamos en overview
    const overviewSection = document.getElementById('overview');
    if (overviewSection && overviewSection.classList.contains('active')) {
        updateRecentActivities();
    }
}

// Función para actualizar actividades recientes
function updateRecentActivities() {
    const activityList = document.querySelector('.activity-list');
    if (!activityList || !dashboardData.recentActivities) return;
    
    const activities = dashboardData.recentActivities.slice(0, 5); // Mostrar solo los últimos 5
    
    activityList.innerHTML = activities.map(activity => {
        const icon = getActivityIcon(activity.type);
        return `
            <div class="activity-item">
                <span class="activity-icon">${icon}</span>
                <div class="activity-content">
                    <p>${activity.description}</p>
                    <small title="${new Date(activity.timestamp).toLocaleString('es-CO')}">
                        ${formatRelativeTime(activity.timestamp)}
                    </small>
                </div>
            </div>
        `;
    }).join('');
}

// Función para obtener icono de actividad
function getActivityIcon(type) {
    const icons = {
        'completed': '✅',
        'contact': '💬',
        'product': '🆕',
        'order': '📦',
        'info': 'ℹ️',
        'warning': '⚠️',
        'success': '✅'
    };
    return icons[type] || 'ℹ️';
}

// Función para inicializar actividades con datos de ejemplo
function initializeRecentActivities() {
    if (!dashboardData.recentActivities) {
        dashboardData.recentActivities = [
            {
                id: 1,
                description: 'Pedido completado - Tomates orgánicos (5kg)',
                type: 'completed',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 horas atrás
            },
            {
                id: 2,
                description: 'Nuevo producto agregado - Lechugas hidropónicas',
                type: 'product',
                timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() // 5 horas atrás
            },
            {
                id: 3,
                description: 'Contacto vía WhatsApp con María García',
                type: 'contact',
                timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 día atrás
            }
        ];
    }
}

// Función para mostrar notificaciones
function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Estilos básicos
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '1rem 1.5rem',
        borderRadius: '6px',
        color: 'white',
        fontWeight: '600',
        zIndex: '9999',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease'
    });

    // Color según tipo
    switch(type) {
        case 'success':
            notification.style.backgroundColor = '#28a745';
            break;
        case 'error':
            notification.style.backgroundColor = '#dc3545';
            break;
        case 'warning':
            notification.style.backgroundColor = '#ffc107';
            notification.style.color = '#212529';
            break;
        default:
            notification.style.backgroundColor = '#2d5016';
    }

    document.body.appendChild(notification);

    // Animar entrada
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    // Remover después de 3 segundos
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function handleAuthError(e) {
    if (e && (e.status === 401 || e.status === 403)) {
        showNotification('Tu sesión expiró. Inicia sesión nuevamente.', 'warning');
        setTimeout(() => forceLogout(), 600);
    } else {
        console.error(e);
    }
}

function forceLogout() {
    try {
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('loginData');
        sessionStorage.removeItem('registroUsuario');
    } catch (_) {}
    window.location.replace('login.html');
}

async function loadCategories() {
    try {
        const res = await api.get('/products/categories');
        const opts = res.data?.data?.categories || res.data?.categories || [];
        const select = document.getElementById('productCategory');
        if (select) {
            select.innerHTML = '<option value="">Seleccionar categoría</option>' +
                opts.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
        }
    } catch (e) { console.warn('No se pudieron cargar categorías', e); }
}

// Verificar autenticación al cargar la página
async function ensureAuthWithAPI() {
    const gate = document.getElementById('authGate');
    const app = document.getElementById('appContainer');

    // 1) Solo verificamos que exista token (la expiración la decide el backend)
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.replace('login.html');
        return false;
    }

    // 2) Validación directa con fetch para evitar cualquier problema de cliente
    try {
        const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            throw new Error('AUTH_FAIL_' + res.status);
        }
        console.log('[Dashboard] auth ok');
        // Asegurar que el cliente API interno también tenga el token para siguientes llamadas
        try { if (typeof api !== 'undefined' && typeof api.setAuthToken === 'function') api.setAuthToken(token); } catch(err) { console.warn('[Dashboard] setAuthToken warn', err); }
        // Mostrar app (forzar visibilidad)
        try {
            if (gate) { gate.style.display = 'none'; gate.setAttribute('aria-hidden', 'true'); }
            if (app) {
                app.style.display = 'block';
                // Si el estilo inline aún oculta, remover atributo style
                const cs = window.getComputedStyle(app);
                if (cs && cs.display === 'none') {
                    app.removeAttribute('style');
                }
            }
        } catch (toggleErr) {
            console.error('[Dashboard] toggle err', toggleErr);
        }
        // Como respaldo, intentar mostrar después de un pequeño delay
        setTimeout(() => {
            const appEl = document.getElementById('appContainer');
            if (appEl && window.getComputedStyle(appEl).display === 'none') {
                appEl.style.display = 'block';
                appEl.removeAttribute('style');
            }
            const gateEl = document.getElementById('authGate');
            if (gateEl) gateEl.style.display = 'none';
        }, 100);
        setupInactivityTimeout();
        return true;
    } catch (e) {
        showNotification('Sesión inválida. Por favor inicia sesión.', 'warning');
        setTimeout(() => forceLogout(), 600);
        return false;
    }
}

function parseJwt(token) {
    try {
        const base = token.split('.')[1];
        const base64 = base.replace(/-/g, '+').replace(/_/g, '/');
        // JWT payload es ASCII: parse directo
        const json = atob(base64);
        return JSON.parse(json);
    } catch (e) { return null; }
}

function isTokenExpired(token) {
    const payload = parseJwt(token);
    if (!payload || !payload.exp) return true;
    const nowSec = Math.floor(Date.now() / 1000);
    return payload.exp <= nowSec;
}

function setupInactivityTimeout() {
    const LIMIT_MS = 30 * 60 * 1000; // 30 minutos
    let timer;
    const reset = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            showNotification('Sesión cerrada por inactividad', 'warning');
            setTimeout(() => handleLogout(), 800);
        }, LIMIT_MS);
    };
    ['click','keydown','mousemove','scroll','touchstart'].forEach(evt => {
        window.addEventListener(evt, reset, { passive: true });
    });
    reset();
}

function checkAuthentication() {
    const loginData = sessionStorage.getItem('loginData');
    if (!loginData) {
        // Redirigir al login si no hay datos de sesión
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Función para actualizar tiempos de actividades recientes
function updateRecentActivitiesTime() {
    const activityItems = document.querySelectorAll('.activity-item small');
    if (!dashboardData.recentActivities) return;
    
    activityItems.forEach((item, index) => {
        if (dashboardData.recentActivities[index]) {
            const activity = dashboardData.recentActivities[index];
            item.textContent = formatRelativeTime(activity.timestamp);
            item.title = new Date(activity.timestamp).toLocaleString('es-CO');
        }
    });
}

// Función para aplicar estados visuales a productos
function applyProductStates() {
    setTimeout(() => {
        const productCards = document.querySelectorAll('.product-card');
        productCards.forEach(card => {
            const stockText = card.querySelector('.product-stock');
            if (stockText) {
                const stockMatch = stockText.textContent.match(/\d+/);
                if (stockMatch) {
                    const stock = parseInt(stockMatch[0]);
                    
                    // Remover clases existentes
                    card.classList.remove('out-of-stock', 'low-stock', 'in-stock');
                    
                    // Aplicar clase según stock
                    if (stock === 0) {
                        card.classList.add('out-of-stock');
                    } else if (stock <= 5) {
                        card.classList.add('low-stock');
                    } else {
                        card.classList.add('in-stock');
                    }
                }
            }
        });
    }, 500);
}

// Mejorar la función de creación de tarjetas de pedido para incluir mejor información
function createOrderCard(order) {
    const card = document.createElement('div');
    card.className = 'order-card';
    
    const statusClass = order.status === 'pending' ? 'status-pending' : 'status-completed';
    const statusText = order.status === 'pending' ? 'Pendiente' : 'Completado';
    
    card.innerHTML = `
        <div class="order-header">
            <div class="order-info">
                <h4>Pedido ${order.id}</h4>
                <p><strong>Cliente:</strong> ${order.customer}</p>
                <p><strong>Teléfono:</strong> ${order.phone}</p>
                <p><strong>Fecha:</strong> ${formatDate(order.date)}</p>
                ${order.completedDate ? `<p><strong>Completado:</strong> ${formatRelativeTime(order.completedDate)}</p>` : ''}
            </div>
            <span class="order-status ${statusClass}">${statusText}</span>
        </div>
        <div class="order-details">
            <p><strong>Productos:</strong> ${order.items}</p>
            <p><strong>Total:</strong> $${order.total.toLocaleString()}</p>
        </div>
        ${order.status === 'pending' ? `
            <div class="order-actions">
                <button class="btn btn-small btn-success" onclick="completeOrder('${order.id}')">
                    Marcar como Completado
                </button>
                <button class="btn btn-small btn-secondary" onclick="contactCustomer('${order.phone}', '${order.customer}', '${order.id}')">
                    Contactar Cliente
                </button>
            </div>
        ` : ''}
    `;
    return card;
}

// Función mejorada para agregar productos con validación
async function handleAddProduct() {
    const formData = new FormData(document.getElementById('addProductForm'));
    
    // Validación adicional
    const name = formData.get('productName').trim();
    const price = parseInt(formData.get('productPrice'));
    const stock = parseInt(formData.get('productStock'));
    
    if (name.length < 2) {
        showNotification('El nombre del producto debe tener al menos 2 caracteres', 'error');
        return;
    }
    
    if (price <= 0) {
        showNotification('El precio debe ser mayor a 0', 'error');
        return;
    }
    
    const newProduct = {
        id: Date.now(),
        name: name,
        category: formData.get('productCategory'),
        price: price,
        stock: stock,
        status: stock > 0 ? 'disponible' : 'agotado',
        description: formData.get('productDescription') || 'Sin descripción',
        createdDate: new Date().toISOString()
    };

    // Agregar producto a los datos
    dashboardData.products.push(newProduct);
    
    // Actualizar estadísticas
    dashboardData.stats.activeProducts = dashboardData.products.filter(p => p.status === 'disponible').length;
    updateStats();
    
    // Recargar productos si estamos en esa sección
    const productsSection = document.getElementById('products');
    if (productsSection && productsSection.classList.contains('active')) {
        loadProducts();
        // Aplicar estados después de cargar
        setTimeout(applyProductStates, 100);
    }

    // Cerrar modal
    document.getElementById('addProductModal').classList.remove('show');

    // Registrar actividad y mostrar notificación
    addRecentActivity(`Nuevo producto agregado - ${name}`, 'product');
    showNotification('Producto agregado exitosamente', 'success');
}

// Verificación de autenticación mejorada
function checkAuthentication() {
    const loginData = sessionStorage.getItem('loginData');
    const registroData = sessionStorage.getItem('registroUsuario');
    
    if (!loginData && !registroData) {
        // Mostrar mensaje amigable antes de redirigir
        if (window.location.pathname.includes('dashboard.html')) {
            showNotification('Por favor inicia sesión para acceder al dashboard', 'warning');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        }
        return false;
    }
    return true;
}
