const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Campo Directo API',
      version: '1.0.0',
      description: `
        API para la plataforma Campo Directo - Conectando campesinos directamente con compradores.
        
        Esta API facilita la eliminación de intermediarios en la cadena de suministro agrícola,
        proporcionando herramientas para:
        - Comunicación directa entre campesinos y compradores
        - Transparencia de precios y comparaciones de mercado
        - Gestión de productos, fincas y pedidos
        - Sistema de trazabilidad y certificaciones
      `,
      termsOfService: 'https://campodirecoto.com/terms',
      contact: {
        name: 'Campo Directo Support',
        url: 'https://campodirecto.com/support',
        email: 'support@campodirecto.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.campodirecto.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtenido del endpoint de login'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          required: ['success', 'message'],
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Error message'
            },
            error: {
              type: 'string',
              example: 'ERROR_CODE'
            }
          }
        },
        User: {
          type: 'object',
          required: ['nombre', 'email', 'telefono', 'tipo_usuario'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID único del usuario',
              example: 1
            },
            nombre: {
              type: 'string',
              description: 'Nombre completo del usuario',
              example: 'Juan Pérez'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email del usuario',
              example: 'juan@example.com'
            },
            telefono: {
              type: 'string',
              description: 'Número de teléfono',
              example: '3001234567'
            },
            tipo_usuario: {
              type: 'string',
              enum: ['campesino', 'comprador'],
              description: 'Tipo de usuario',
              example: 'campesino'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de última actualización'
            }
          }
        },
        Farm: {
          type: 'object',
          required: ['nombre', 'propietario_id', 'ubicacion', 'area_hectareas'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID único de la finca',
              example: 1
            },
            nombre: {
              type: 'string',
              description: 'Nombre de la finca',
              example: 'Finca San José'
            },
            propietario_id: {
              type: 'integer',
              description: 'ID del propietario (usuario campesino)',
              example: 1
            },
            ubicacion: {
              type: 'string',
              description: 'Ubicación de la finca',
              example: 'Vereda El Carmen, Municipio de Fresno, Tolima'
            },
            area_hectareas: {
              type: 'number',
              format: 'decimal',
              description: 'Área total en hectáreas',
              example: 15.5
            },
            certificaciones: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['organico', 'comercio_justo', 'rain_forest', 'bpa']
              },
              description: 'Certificaciones de la finca',
              example: ['organico', 'bpa']
            },
            descripcion: {
              type: 'string',
              description: 'Descripción de la finca',
              example: 'Finca especializada en cultivos orgánicos'
            }
          }
        },
        Product: {
          type: 'object',
          required: ['nombre', 'finca_id', 'categoria', 'precio_kg', 'cantidad_disponible'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID único del producto',
              example: 1
            },
            nombre: {
              type: 'string',
              description: 'Nombre del producto',
              example: 'Tomate Cherry Orgánico'
            },
            finca_id: {
              type: 'integer',
              description: 'ID de la finca donde se produce',
              example: 1
            },
            categoria: {
              type: 'string',
              enum: ['frutas', 'verduras', 'hortalizas', 'cereales', 'legumbres', 'tuberculos', 'hierbas'],
              description: 'Categoría del producto',
              example: 'verduras'
            },
            precio_kg: {
              type: 'number',
              format: 'decimal',
              description: 'Precio por kilogramo en COP',
              example: 5500
            },
            cantidad_disponible: {
              type: 'number',
              format: 'decimal',
              description: 'Cantidad disponible en kg',
              example: 150.5
            },
            descripcion: {
              type: 'string',
              description: 'Descripción del producto',
              example: 'Tomates cherry cultivados orgánicamente, perfectos para ensaladas'
            },
            imagen_url: {
              type: 'string',
              format: 'uri',
              description: 'URL de la imagen del producto',
              example: '/uploads/products/tomate-cherry.jpg'
            },
            activo: {
              type: 'boolean',
              description: 'Estado del producto',
              example: true
            }
          }
        },
        Order: {
          type: 'object',
          required: ['comprador_id', 'producto_id', 'cantidad_kg', 'precio_total'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID único del pedido',
              example: 1
            },
            comprador_id: {
              type: 'integer',
              description: 'ID del comprador',
              example: 2
            },
            producto_id: {
              type: 'integer',
              description: 'ID del producto',
              example: 1
            },
            cantidad_kg: {
              type: 'number',
              format: 'decimal',
              description: 'Cantidad en kilogramos',
              example: 25.0
            },
            precio_total: {
              type: 'number',
              format: 'decimal',
              description: 'Precio total del pedido en COP',
              example: 137500
            },
            estado: {
              type: 'string',
              enum: ['pendiente', 'confirmado', 'en_preparacion', 'listo', 'entregado', 'cancelado'],
              description: 'Estado del pedido',
              example: 'pendiente'
            },
            fecha_entrega: {
              type: 'string',
              format: 'date',
              description: 'Fecha estimada de entrega',
              example: '2023-12-15'
            },
            notas: {
              type: 'string',
              description: 'Notas adicionales del pedido',
              example: 'Entregar en la mañana'
            }
          }
        },
        Message: {
          type: 'object',
          required: ['emisor_id', 'receptor_id', 'contenido', 'tipo_mensaje'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID único del mensaje',
              example: 1
            },
            conversacion_id: {
              type: 'string',
              description: 'ID de la conversación',
              example: 'conv_1_2'
            },
            emisor_id: {
              type: 'integer',
              description: 'ID del usuario que envía el mensaje',
              example: 1
            },
            receptor_id: {
              type: 'integer',
              description: 'ID del usuario que recibe el mensaje',
              example: 2
            },
            contenido: {
              type: 'string',
              description: 'Contenido del mensaje',
              example: 'Hola, tengo tomates frescos disponibles'
            },
            tipo_mensaje: {
              type: 'string',
              enum: ['text', 'price_offer', 'location', 'image'],
              description: 'Tipo de mensaje',
              example: 'text'
            },
            metadata: {
              type: 'object',
              description: 'Metadatos adicionales según el tipo de mensaje'
            },
            leido: {
              type: 'boolean',
              description: 'Estado de lectura del mensaje',
              example: false
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Auth',
        description: 'Autenticación y gestión de usuarios'
      },
      {
        name: 'Products',
        description: 'Gestión de productos agrícolas'
      },
      {
        name: 'Farms',
        description: 'Gestión de fincas'
      },
      {
        name: 'Orders',
        description: 'Gestión de pedidos'
      },
      {
        name: 'Anti-Intermediarios',
        description: 'Funcionalidades para eliminar intermediarios: mensajería, transparencia de precios, etc.'
      },
      {
        name: 'Files',
        description: 'Subida y gestión de archivos'
      }
    ]
  },
  apis: [
    './routes/*.js',
    './models/*.js',
    './middleware/*.js'
  ]
};

const specs = swaggerJsdoc(options);

const swaggerOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info hgroup.main h2 { color: #2E7D32; }
    .swagger-ui .scheme-container { background: #E8F5E8; }
  `,
  customSiteTitle: 'Campo Directo API Documentation'
};

module.exports = {
  specs,
  swaggerUi,
  swaggerOptions
};