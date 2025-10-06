// Login functionality for Campo Directo

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const rememberCheckbox = document.getElementById('remember');
    
    // Error message elements
    const usernameError = document.getElementById('username-error');
    const passwordError = document.getElementById('password-error');
    
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
    usernameInput.addEventListener('blur', function() {
        validateUsername();
    });
    
    passwordInput.addEventListener('blur', function() {
        validatePassword();
    });
    
    // Clear errors on input
    usernameInput.addEventListener('input', function() {
        clearError(usernameInput, usernameError);
    });
    
    passwordInput.addEventListener('input', function() {
        clearError(passwordInput, passwordError);
    });
    
    // Validation functions
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
            showError(usernameInput, usernameError, 'Por favor ingresa tu usuario o correo electrónico');
            return false;
        }
        
        // Basic email validation if it contains @
        if (username.includes('@')) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(username)) {
                showError(usernameInput, usernameError, 'Por favor ingresa un correo electrónico válido');
                return false;
            }
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
    
    function showError(input, errorElement, message) {
        input.classList.add('error');
        errorElement.textContent = message;
    }
    
    function clearError(input, errorElement) {
        input.classList.remove('error');
        errorElement.textContent = '';
    }
    
    function clearAllErrors() {
        clearError(usernameInput, usernameError);
        clearError(passwordInput, passwordError);
    }
    
    // Login simulation (replace with real authentication)
    function performLogin() {
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        const remember = rememberCheckbox.checked;
        
        // Show loading state
        const loginBtn = document.querySelector('.login-button');
        const originalText = loginBtn.textContent;
        loginBtn.innerHTML = '<span class="button-icon">🌱</span> Ingresando...';
        loginBtn.disabled = true;
        loginBtn.classList.add('loading');
        
        // Simulate login process (replace with actual API call)
        setTimeout(() => {
            // For demo purposes, accept any login with "campesino" in username or password
            const isValidLogin = username.toLowerCase().includes('campesino') || 
                                password.toLowerCase().includes('campesino') ||
                                username === 'admin' || 
                                password === 'admin';
            
            if (isValidLogin) {
                // Save login data
                const loginData = {
                    username: username,
                    loginTime: new Date().toISOString(),
                    userType: 'campesino'
                };
                
                // Save to sessionStorage
                sessionStorage.setItem('loginData', JSON.stringify(loginData));
                
                // Save username for remember me functionality
                if (remember) {
                    localStorage.setItem('rememberedUser', username);
                } else {
                    localStorage.removeItem('rememberedUser');
                }
                
                // Show success message
                showLoginSuccess();
                
                // Redirect to dashboard after short delay
                setTimeout(() => {
                    // For now, redirect to a placeholder dashboard page or back to index
                    // In a real app, this would be the user dashboard
                    window.location.href = 'dashboard.html'; // or create a dashboard
                }, 2000);
                
            } else {
                // Show error for invalid credentials
                loginBtn.textContent = originalText;
                loginBtn.disabled = false;
                
                showError(passwordInput, passwordError, 'Usuario o contraseña incorrectos');
                
                // Shake animation for invalid login
                loginForm.classList.add('shake');
                setTimeout(() => {
                    loginForm.classList.remove('shake');
                }, 500);
            }
        }, 1500); // Simulate network delay
    }
    
    function showLoginSuccess() {
        const loginBtn = document.querySelector('.login-button');
        loginBtn.innerHTML = '<span class="button-icon">✅</span> ¡Bienvenido al Campo!';
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
    
    // Forgot password handler (placeholder)
    document.querySelector('.forgot-password').addEventListener('click', function(e) {
        e.preventDefault();
        alert('Funcionalidad de recuperación de contraseña estará disponible próximamente.\n\nPor ahora, puedes usar:\nUsuario: campesino\nContraseña: campesino');
    });
});

// Add CSS classes for animations
document.head.insertAdjacentHTML('beforeend', `
<style>
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
</style>
`);