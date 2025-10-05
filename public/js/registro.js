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
    form.addEventListener('submit', function(e) {
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
            nombreFinca: formData.get('nombreFinca') || null
        };

        // Validaciones adicionales
        if (!validateForm(data)) {
            return;
        }

        // Simular envío del formulario
        showLoading();
        
        // Simular tiempo de procesamiento
        setTimeout(() => {
            hideLoading();
            showSuccessMessage(data);
        }, 2000);
    });

    // Función de validación
    function validateForm(data) {
        let isValid = true;
        const errors = [];

        // Validar nombre y apellido
        if (data.nombre.length < 2) {
            errors.push('El nombre debe tener al menos 2 caracteres');
            isValid = false;
        }

        if (data.apellido.length < 2) {
            errors.push('El apellido debe tener al menos 2 caracteres');
            isValid = false;
        }

        // Validar correo
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.correo)) {
            errors.push('Por favor ingresa un correo electrónico válido');
            isValid = false;
        }

        // Validar contacto (número de teléfono)
        const phoneRegex = /^[\d\-\+\(\)\s]+$/;
        if (!phoneRegex.test(data.contacto) || data.contacto.length < 7) {
            errors.push('Por favor ingresa un número de contacto válido');
            isValid = false;
        }

        // Validar fecha de nacimiento (mayor de 18 años)
        const birthDate = new Date(data.fechaNacimiento);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        if (age < 18) {
            errors.push('Debes ser mayor de 18 años para registrarte');
            isValid = false;
        }

        // Validar nombre de finca para campesinos
        if (data.tipoUsuario === 'campesino' && (!data.nombreFinca || data.nombreFinca.length < 2)) {
            errors.push('El nombre de la finca es obligatorio para campesinos');
            isValid = false;
        }

        if (!isValid) {
            showErrors(errors);
        }

        return isValid;
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