// Funcionalidad para la página de registro

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registerForm');
    const campesinRadio = document.getElementById('campesino');
    const compradorRadio = document.getElementById('comprador');
    const campesinField = document.querySelector('.campesino-field');
    const nombreFincaInput = document.getElementById('nombreFinca');

    // Manejar la visibilidad del campo "Nombre de Finca"
    function toggleFincaField() {
        if (campesinRadio.checked) {
            campesinField.classList.remove('hidden');
            nombreFincaInput.required = true;
        } else {
            campesinField.classList.add('hidden');
            nombreFincaInput.required = false;
            nombreFincaInput.value = '';
        }
    }

    // Event listeners para los radio buttons
    campesinRadio.addEventListener('change', toggleFincaField);
    compradorRadio.addEventListener('change', toggleFincaField);

    // Configuración inicial
    toggleFincaField();

    // Validación y envío del formulario
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Obtener los datos del formulario
        const formData = new FormData(form);
        const data = {
            nombre: formData.get('nombre'),
            apellido: formData.get('apellido'),
            contacto: formData.get('contacto'),
            correo: formData.get('correo'),
            tipoUsuario: formData.get('tipoUsuario'),
            fechaNacimiento: formData.get('fechaNacimiento'),
            nombreFinca: formData.get('nombreFinca') || null,
            password: formData.get('password'),
            passwordConfirm: formData.get('passwordConfirm')
        };

        // Validaciones adicionales
        if (!validateForm(data)) {
            return;
        }

        // Envío real a la API
        showLoading();
        try {
            const payload = {
                nombre: data.nombre,
                apellido: data.apellido,
                email: data.correo.trim(),
                telefono: (data.contacto || '').replace(/\s+/g, ''),
                tipo_usuario: data.tipoUsuario,
                fecha_nacimiento: toISODate(data.fechaNacimiento),
                password: data.password,
                ...(data.nombreFinca ? { nombreFinca: data.nombreFinca } : {})
            };

            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(json?.message || 'Error de registro');
            }

            hideLoading();
            // Después de registrarse, redirigir al login
            window.location.href = 'login.html';
        } catch (err) {
            hideLoading();
            alert('Error: ' + err.message);
        }
    });

    // Función de validación
    function validateForm(data) {
        let isValid = true;
        const errors = [];

        // Validar nombre y apellido
        if (!data.nombre || data.nombre.length < 2) {
            errors.push('El nombre debe tener al menos 2 caracteres');
            isValid = false;
        }

        if (!data.apellido || data.apellido.length < 2) {
            errors.push('El apellido debe tener al menos 2 caracteres');
            isValid = false;
        }

        // Validar correo
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.correo || '')) {
            errors.push('Por favor ingresa un correo electrónico válido');
            isValid = false;
        }

        // Validar contacto (número de teléfono Colombia: 10 dígitos)
        const digits = (data.contacto || '').replace(/\D/g, '');
        if (!/^\d{10}$/.test(digits)) {
            errors.push('Por favor ingresa un número de contacto válido de 10 dígitos (ej: 3101234567)');
            isValid = false;
        }

        // Validar fecha de nacimiento (mayor de 18 años)
        const birthDate = new Date(data.fechaNacimiento);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        if (isNaN(age) || age < 18) {
            errors.push('Debes ser mayor de 18 años para registrarte');
            isValid = false;
        }

        // Validar nombre de finca para campesinos
        if (data.tipoUsuario === 'campesino' && (!data.nombreFinca || data.nombreFinca.length < 2)) {
            errors.push('El nombre de la finca es obligatorio para campesinos');
            isValid = false;
        }

        // Validar contraseña
        const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
        if (!pwRegex.test(data.password || '')) {
            errors.push('La contraseña debe tener al menos 6 caracteres e incluir minúscula, mayúscula y número');
            isValid = false;
        }
        if ((data.password || '') !== (data.passwordConfirm || '')) {
            errors.push('Las contraseñas no coinciden');
            isValid = false;
        }

        if (!isValid) {
            showErrors(errors);
        }

        return isValid;
    }

    // Convierte una fecha a formato YYYY-MM-DD
    function toISODate(value) {
        if (!value) return value;
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
        const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (m) return `${m[3]}-${m[2]}-${m[1]}`;
        try {
            const d = new Date(value);
            if (!isNaN(d.getTime())) {
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                return `${d.getFullYear()}-${mm}-${dd}`;
            }
        } catch (_) {}
        return value;
    }

    // Mostrar errores de validación
    function showErrors(errors) {
        alert('Por favor corrige los siguientes errores:\n\n' + errors.join('\n'));
    }

    // Mostrar estado de carga
    function showLoading() {
        const btn = document.querySelector('.btn-register');
        btn.textContent = 'Registrando...';
        btn.disabled = true;
        btn.style.opacity = '0.7';
    }

    // Ocultar estado de carga
    function hideLoading() {
        const btn = document.querySelector('.btn-register');
        btn.textContent = 'Registrarse';
        btn.disabled = false;
        btn.style.opacity = '1';
    }

    // Mostrar mensaje de éxito y redirigir
    function showSuccessMessage(data) {
        // Guardar datos del usuario para mostrar en la página de éxito
        sessionStorage.setItem('registroUsuario', JSON.stringify(data));
        
        // Redirigir a la página de registro exitoso
        window.location.href = 'registro-exitoso.html';
    }

    // Mejorar la experiencia de usuario en campos de fecha
    const fechaNacimientoInput = document.getElementById('fechaNacimiento');
    
    // Manejar el cambio de tipo de input para mostrar el placeholder
    fechaNacimientoInput.addEventListener('focus', function() {
        this.type = 'date';
    });
    
    fechaNacimientoInput.addEventListener('blur', function() {
        if (!this.value) {
            this.type = 'text';
        }
    });
    
    // Cambiar color del texto cuando hay fecha seleccionada
    fechaNacimientoInput.addEventListener('change', function() {
        if (this.value) {
            this.style.color = '#333';
        } else {
            this.style.color = '#6c757d';
        }
    });

    // Formatear automáticamente el número de teléfono
    const contactoInput = document.getElementById('contacto');
    contactoInput.addEventListener('input', function() {
        let value = this.value.replace(/\D/g, ''); // Remover caracteres no numéricos
        
        // Formatear para número colombiano
        if (value.length >= 10) {
            value = value.substring(0, 10);
            if (value.startsWith('3')) {
                // Celular: 300 123 4567
                this.value = `${value.substring(0, 3)} ${value.substring(3, 6)} ${value.substring(6)}`;
            } else if (value.startsWith('60') || value.startsWith('601')) {
                // Fijo Bogotá: 601 123 4567
                this.value = `${value.substring(0, 3)} ${value.substring(3, 6)} ${value.substring(6)}`;
            } else {
                // Otros: 123 456 7890
                this.value = `${value.substring(0, 3)} ${value.substring(3, 6)} ${value.substring(6)}`;
            }
        } else {
            this.value = value;
        }
    });

    // Validación en tiempo real para el correo
    const correoInput = document.getElementById('correo');
    correoInput.addEventListener('blur', function() {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (this.value && !emailRegex.test(this.value)) {
            this.style.borderColor = '#dc3545';
            this.style.boxShadow = '0 0 0 3px rgba(220, 53, 69, 0.1)';
        } else {
            this.style.borderColor = '#2d5016';
            this.style.boxShadow = '0 0 0 3px rgba(45, 80, 22, 0.1)';
        }
    });
});