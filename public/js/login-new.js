// Login JavaScript - Campo Directo (Versión con API)

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const rememberCheckbox = document.getElementById('remember');
    
    // Error message elements
    const usernameError = document.getElementById('username-error');
    const passwordError = document.getElementById('password-error');
    
    // Verificar si ya está autenticado
    checkAuthenticationStatus();
    
    // Load remembered username if exists
    loadRememberedUser();
    
    // Form submission handler
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (validateForm()) {
            performLogin();
        }
    });
    
    // Real-time validation
    usernameInput.addEventListener('blur', validateUsername);
    passwordInput.addEventListener('blur', validatePassword);
    
    // Clear errors on input
    usernameInput.addEventListener('input', () => clearError(usernameInput, usernameError));
    passwordInput.addEventListener('input', () => clearError(passwordInput, passwordError));
    
    // ============================================================
    // FUNCIONES DE AUTENTICACIÓN
    // ============================================================
    
    async function checkAuthenticationStatus() {
        if (isAuthenticated()) {
            try {
                const response = await authApi.getMe();
                if (response.status === 'success') {
                    // Usuario ya autenticado, redirigir al dashboard
                    window.location.href = '/dashboard';
                    return;
                }
            } catch (error) {
                // Token inválido, continuar con el login
                console.log('Token inválido, requiere nuevo login');
            }
        }
    }
    
    async function performLogin() {
        const email = usernameInput.value.trim();
        const password = passwordInput.value;
        const remember = rememberCheckbox.checked;
        
        // Show loading state
        const loginBtn = document.querySelector('.login-button');
        const originalText = loginBtn.textContent;
        loginBtn.innerHTML = '<span class="button-icon">🌱</span> Ingresando...';
        loginBtn.disabled = true;
        loginBtn.classList.add('loading');
        
        try {
            const response = await authApi.login({ email, password });
            
            if (response.status === 'success') {
                // Save username for remember me functionality
                if (remember) {
                    localStorage.setItem('rememberedUser', email);
                } else {
                    localStorage.removeItem('rememberedUser');
                }
                
                // Show success message
                showLoginSuccess(response.data.user);
                
                // Redirect to dashboard after short delay
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 2000);
            }
            
        } catch (error) {
            console.error('Error en login:', error);
            
            // Restore button state
            loginBtn.innerHTML = originalText;
            loginBtn.disabled = false;
            loginBtn.classList.remove('loading');
            
            // Show appropriate error message
            if (error instanceof ApiError) {
                if (error.status === 401) {
                    showError(passwordInput, passwordError, 'Usuario o contraseña incorrectos');
                } else if (error.status === 403) {
                    showError(passwordInput, passwordError, 'Usuario inactivo o suspendido');
                } else if (error.isValidationError()) {
                    // Show validation errors if available
                    if (error.details && error.details.errors) {
                        error.details.errors.forEach(err => {
                            if (err.path === 'email') {
                                showError(usernameInput, usernameError, err.msg);
                            } else if (err.path === 'password') {
                                showError(passwordInput, passwordError, err.msg);
                            }
                        });
                    } else {
                        showError(passwordInput, passwordError, error.message);
                    }
                } else {
                    showError(passwordInput, passwordError, 'Error en el servidor. Intenta de nuevo.');
                }
            } else {
                showError(passwordInput, passwordError, 'Error de conexión. Verifica tu internet.');
            }
            
            // Shake animation for invalid login
            loginForm.classList.add('shake');
            setTimeout(() => loginForm.classList.remove('shake'), 500);
        }
    }
    
    // ============================================================
    // FUNCIONES DE VALIDACIÓN
    // ============================================================
    
    function validateForm() {
        let isValid = true;
        
        if (!validateUsername()) {
            isValid = false;
        }
        
        if (!validatePassword()) {
            isValid = false;
        }
        
        return isValid;
    }
    
    function validateUsername() {
        const username = usernameInput.value.trim();
        
        if (!username) {
            showError(usernameInput, usernameError, 'Por favor ingresa tu correo electrónico');
            return false;
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(username)) {
            showError(usernameInput, usernameError, 'Por favor ingresa un correo electrónico válido');
            return false;
        }
        
        clearError(usernameInput, usernameError);
        return true;
    }
    
    function validatePassword() {
        const password = passwordInput.value;
        
        if (!password) {
            showError(passwordInput, passwordError, 'Por favor ingresa tu contraseña');
            return false;
        }
        
        if (password.length < 6) {
            showError(passwordInput, passwordError, 'La contraseña debe tener al menos 6 caracteres');
            return false;
        }
        
        clearError(passwordInput, passwordError);
        return true;
    }
    
    // ============================================================
    // FUNCIONES DE UI
    // ============================================================
    
    function showError(input, errorElement, message) {
        input.classList.add('error');
        errorElement.textContent = message;
    }
    
    function clearError(input, errorElement) {
        input.classList.remove('error');
        errorElement.textContent = '';
    }
    
    function showLoginSuccess(user) {
        const loginBtn = document.querySelector('.login-button');
        loginBtn.innerHTML = `<span class="button-icon">✅</span> ¡Bienvenido ${user.nombre}!`;
        loginBtn.style.background = 'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)';
        loginBtn.classList.remove('loading');
        
        // Show success animation
        const formContainer = document.querySelector('.login-right-section');
        if (formContainer) {
            formContainer.classList.add('login-success');
        }
    }
    
    function loadRememberedUser() {
        const rememberedUser = localStorage.getItem('rememberedUser');
        if (rememberedUser) {
            usernameInput.value = rememberedUser;
            rememberCheckbox.checked = true;
        }
    }
    
    // ============================================================
    // EVENT LISTENERS ADICIONALES
    // ============================================================
    
    // Forgot password handler
    document.querySelector('.forgot-password').addEventListener('click', function(e) {
        e.preventDefault();
        
        // Show modal or redirect to password reset
        showNotification('Funcionalidad de recuperación de contraseña estará disponible próximamente.\n\nPuedes usar los usuarios de prueba del sistema.', 'info');
    });
    
    // ============================================================
    // UTILIDADES
    // ============================================================
    
    function showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '6px',
            color: 'white',
            fontWeight: '600',
            zIndex: '9999',
            maxWidth: '400px',
            backgroundColor: type === 'error' ? '#dc3545' : 
                           type === 'success' ? '#28a745' : '#2d5016',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 5000);
    }
});

// Add CSS for animations (if not already present)
if (!document.querySelector('#login-styles')) {
    document.head.insertAdjacentHTML('beforeend', `
    <style id="login-styles">
    .shake {
        animation: shake 0.5s;
    }

    @keyframes shake {
        0%, 20%, 40%, 60%, 80% {
            transform: translateX(-5px);
        }
        10%, 30%, 50%, 70%, 90% {
            transform: translateX(5px);
        }
        100% {
            transform: translateX(0);
        }
    }

    .login-success {
        animation: successPulse 0.5s ease-in-out;
    }

    @keyframes successPulse {
        0% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.02);
        }
        100% {
            transform: scale(1);
        }
    }

    .login-button:disabled {
        cursor: not-allowed;
        opacity: 0.8;
    }

    .login-button.loading {
        pointer-events: none;
        opacity: 0.8;
    }

    .form-input.error {
        border-color: #dc3545;
        box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
    }

    .error-message {
        color: #dc3545;
        font-size: 0.875rem;
        margin-top: 0.25rem;
        display: block;
    }
    </style>
    `);
}