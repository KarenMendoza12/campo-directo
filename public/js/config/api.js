// ============================================================
// CONFIGURACIÓN DE API - CAMPO DIRECTO FRONTEND
// ============================================================

// Configuración de la API
const API_CONFIG = {
    BASE_URL: 'http://localhost:3000/api',
    TIMEOUT: 10000,
    RETRY_ATTEMPTS: 3
};

// Token de autenticación
let authToken = localStorage.getItem('authToken') || null;

/**
 * Clase para manejar las llamadas a la API
 */
class ApiClient {
    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
        this.timeout = API_CONFIG.TIMEOUT;
        this.retryAttempts = API_CONFIG.RETRY_ATTEMPTS;
    }

    /**
     * Configurar token de autenticación
     */
    setAuthToken(token) {
        authToken = token;
        if (token) {
            localStorage.setItem('authToken', token);
        } else {
            localStorage.removeItem('authToken');
        }
    }

    /**
     * Obtener token de autenticación
     */
    getAuthToken() {
        return authToken;
    }

    /**
     * Construir headers para las peticiones
     */
    buildHeaders(additionalHeaders = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...additionalHeaders
        };

        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        return headers;
    }

    /**
     * Realizar petición HTTP
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            method: options.method || 'GET',
            headers: this.buildHeaders(options.headers),
            ...options
        };

        // Agregar body si es necesario
        if (options.data && config.method !== 'GET') {
            config.body = JSON.stringify(options.data);
        }

        try {
            const response = await this.fetchWithTimeout(url, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new ApiError(
                    errorData.message || 'Error en la petición',
                    response.status,
                    errorData
                );
            }

            return await response.json();

        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }

            // Error de red o timeout
            throw new ApiError(
                'Error de conexión. Verifica tu conexión a internet.',
                0,
                { originalError: error.message }
            );
        }
    }

    /**
     * Fetch con timeout
     */
    async fetchWithTimeout(url, options) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    /**
     * Métodos HTTP convenientes
     */
    get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    }

    post(endpoint, data, options = {}) {
        return this.request(endpoint, { ...options, method: 'POST', data });
    }

    put(endpoint, data, options = {}) {
        return this.request(endpoint, { ...options, method: 'PUT', data });
    }

    delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }
}

/**
 * Clase para manejar errores de API
 */
class ApiError extends Error {
    constructor(message, status = 0, details = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.details = details;
    }

    isAuthError() {
        return this.status === 401;
    }

    isValidationError() {
        return this.status === 400;
    }

    isNotFoundError() {
        return this.status === 404;
    }

    isServerError() {
        return this.status >= 500;
    }
}

// Instancia global del cliente API
const api = new ApiClient();

// ============================================================
// ENDPOINTS ESPECÍFICOS
// ============================================================

/**
 * APIs de Autenticación
 */
const authApi = {
    async login(credentials) {
        const response = await api.post('/auth/login', credentials);
        if (response.status === 'success' && response.data.token) {
            api.setAuthToken(response.data.token);
        }
        return response;
    },

    async register(userData) {
        const response = await api.post('/auth/register', userData);
        if (response.status === 'success' && response.data.token) {
            api.setAuthToken(response.data.token);
        }
        return response;
    },

    async logout() {
        const response = await api.post('/auth/logout');
        api.setAuthToken(null);
        return response;
    },

    async getMe() {
        return await api.get('/auth/me');
    },

    async verifyToken(token) {
        return await api.post('/auth/verify-token', { token });
    },

    async changePassword(passwordData) {
        return await api.put('/auth/change-password', passwordData);
    }
};

/**
 * APIs de Usuarios
 */
const userApi = {
    async getProfile() {
        return await api.get('/users/profile');
    },

    async updateProfile(profileData) {
        return await api.put('/users/profile', profileData);
    },

    async getStats() {
        return await api.get('/users/stats');
    },

    async getFarmers(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await api.get(`/users/farmers?${queryString}`);
    }
};

/**
 * APIs de Productos
 */
const productApi = {
    async getProducts(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await api.get(`/products?${queryString}`);
    },

    async getProduct(id) {
        return await api.get(`/products/${id}`);
    },

    async createProduct(productData) {
        return await api.post('/products', productData);
    },

    async updateProduct(id, productData) {
        return await api.put(`/products/${id}`, productData);
    },

    async deleteProduct(id) {
        return await api.delete(`/products/${id}`);
    },

    async getCategories() {
        return await api.get('/products/categories');
    }
};

/**
 * APIs de Dashboard
 */
const dashboardApi = {
    async getStats() {
        return await api.get('/dashboard/stats');
    },

    async getActivities() {
        return await api.get('/dashboard/activities');
    },

    async addActivity(activityData) {
        return await api.post('/dashboard/activities', activityData);
    }
};

/**
 * APIs de Pedidos
 */
const orderApi = {
    async getOrders(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await api.get(`/orders?${queryString}`);
    },

    async updateOrderStatus(orderId, status) {
        return await api.put(`/orders/${orderId}/status`, { estado: status });
    }
};

/**
 * APIs de Fincas
 */
const farmApi = {
    async getMyFarm() {
        return await api.get('/farms/my-farm');
    },

    async updateMyFarm(farmData) {
        return await api.put('/farms/my-farm', farmData);
    }
};

// ============================================================
// UTILIDADES
// ============================================================

/**
 * Verificar si el usuario está autenticado
 */
function isAuthenticated() {
    return !!api.getAuthToken();
}

/**
 * Manejar errores de autenticación
 */
function handleAuthError() {
    api.setAuthToken(null);
    // Redirigir al login si no estamos ya ahí
    if (!window.location.pathname.includes('login')) {
        window.location.href = '/login';
    }
}

/**
 * Interceptor global para errores de autenticación
 */
const originalRequest = api.request;
api.request = async function(endpoint, options) {
    try {
        return await originalRequest.call(this, endpoint, options);
    } catch (error) {
        if (error instanceof ApiError && error.isAuthError()) {
            handleAuthError();
        }
        throw error;
    }
};

// Exportar para uso global
window.api = api;
window.authApi = authApi;
window.userApi = userApi;
window.productApi = productApi;
window.dashboardApi = dashboardApi;
window.orderApi = orderApi;
window.farmApi = farmApi;
window.ApiError = ApiError;
window.isAuthenticated = isAuthenticated;