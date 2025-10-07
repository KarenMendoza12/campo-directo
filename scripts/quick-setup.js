#!/usr/bin/env node

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

console.log('🌱 Campo Directo - Configuración Rápida\n');

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
};

async function setupDatabase() {
  let connection;
  
  try {
    console.log('📊 Conectando a MySQL...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado exitosamente\n');
    
    // 1. Crear base de datos
    console.log('🗄️ Creando base de datos campo_directo...');
    await connection.query('CREATE DATABASE IF NOT EXISTS campo_directo');
    await connection.query('USE campo_directo');
    console.log('✅ Base de datos creada/seleccionada\n');
    
    // 2. Ejecutar esquema
    console.log('📋 Ejecutando esquema de base de datos...');
    const schemaPath = path.join(__dirname, '..', 'database', 'campo_directo_schema.sql');
    const schemaRaw = fs.readFileSync(schemaPath, 'utf8');
    // Quitar comandos de CREATE DATABASE/USE del esquema para evitar errores si ya existe
    const schema = schemaRaw
      .replace(/^[ \t]*CREATE\s+DATABASE[\s\S]*?;\s*/im, '')
      .replace(/^[ \t]*USE\s+campo_directo\s*;\s*/im, '')
      .replace(/^[ \t]*DELIMITER\s+\/\/\s*/gim, '')
      .replace(/^[ \t]*DELIMITER\s*;\s*/gim, '')
      .replace(/END\s*\/\/\s*/g, 'END;');
    await connection.query(schema);
    console.log('✅ Esquema ejecutado\n');
    
    // 3. Insertar datos de prueba con contraseñas hasheadas
    console.log('👤 Creando usuarios de prueba...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const users = [
      ['Juan Carlos Pérez', 'campesino@test.com', '3001234567', 'campesino', hashedPassword],
      ['María González', 'comprador@test.com', '3007654321', 'comprador', hashedPassword],
      ['Pedro Ramírez', 'campesino2@test.com', '3001111111', 'campesino', hashedPassword],
      ['Ana Torres', 'comprador2@test.com', '3002222222', 'comprador', hashedPassword]
    ];
    
    for (const user of users) {
      await connection.execute(
        'INSERT INTO usuarios (nombre, email, telefono, tipo_usuario, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        user
      );
    }
    console.log('✅ Usuarios creados\n');
    
    // 4. Crear fincas
    console.log('🏡 Creando fincas...');
    await connection.execute(`
      INSERT INTO fincas (nombre, propietario_id, ubicacion, area_hectareas, certificaciones, descripcion, created_at, updated_at) VALUES
      ('Finca San José', 1, 'Vereda El Carmen, Fresno, Tolima', 15.5, JSON_ARRAY('organico', 'bpa'), 'Finca especializada en cultivos orgánicos', NOW(), NOW()),
      ('Granja La Esperanza', 3, 'Vereda La Palma, Ibagué, Tolima', 8.2, JSON_ARRAY('comercio_justo'), 'Producción sostenible de hortalizas', NOW(), NOW())
    `);
    console.log('✅ Fincas creadas\n');
    
    // 5. Crear productos
    console.log('🌿 Creando productos...');
    await connection.execute(`
      INSERT INTO productos (nombre, finca_id, categoria, precio_kg, cantidad_disponible, descripcion, imagen_url, activo, created_at, updated_at) VALUES
      ('Tomate Cherry Orgánico', 1, 'verduras', 5500, 150, 'Tomates cherry cultivados orgánicamente', '/uploads/products/tomate-cherry.jpg', TRUE, NOW(), NOW()),
      ('Lechuga Crespa', 1, 'verduras', 3200, 80, 'Lechuga fresca y crujiente', '/uploads/products/lechuga.jpg', TRUE, NOW(), NOW()),
      ('Mango Tommy', 1, 'frutas', 4800, 200, 'Mangos dulces y jugosos', '/uploads/products/mango.jpg', TRUE, NOW(), NOW()),
      ('Albahaca Fresca', 2, 'hierbas', 8500, 25, 'Albahaca aromática', '/uploads/products/albahaca.jpg', TRUE, NOW(), NOW()),
      ('Zanahoria Criolla', 2, 'verduras', 2800, 120, 'Zanahorias frescas y dulces', '/uploads/products/zanahoria.jpg', TRUE, NOW(), NOW())
    `);
    console.log('✅ Productos creados\n');
    
    // 6. Crear datos para funcionalidades anti-intermediarios
    console.log('💬 Configurando funcionalidades anti-intermediarios...');
    
    // Precios de mercado
    await connection.execute(`
      INSERT INTO precios_mercado (producto_categoria, precio_promedio_kg, fecha_precio, fuente, created_at, updated_at) VALUES
      ('verduras', 6500, CURRENT_DATE, 'SIPSA-DANE', NOW(), NOW()),
      ('frutas', 5800, CURRENT_DATE, 'SIPSA-DANE', NOW(), NOW()),
      ('hierbas', 12000, CURRENT_DATE, 'SIPSA-DANE', NOW(), NOW())
    `);
    
    // Comparaciones de precios
    await connection.execute(`
      INSERT INTO comparaciones_precios (producto_id, precio_directo, precio_mercado_tradicional, ahorro_pesos, ahorro_porcentaje, created_at, updated_at) VALUES
      (1, 5500, 6500, 1000, 15.38, NOW(), NOW()),
      (2, 3200, 4000, 800, 20.00, NOW(), NOW()),
      (3, 4800, 5800, 1000, 17.24, NOW(), NOW()),
      (4, 8500, 12000, 3500, 29.17, NOW(), NOW()),
      (5, 2800, 3500, 700, 20.00, NOW(), NOW())
    `);
    
    // Conversaciones de ejemplo
    await connection.execute(`
      INSERT INTO conversaciones (id, participante1_id, participante2_id, ultimo_mensaje_id, created_at, updated_at) VALUES
      ('conv_1_2', 1, 2, NULL, NOW(), NOW())
    `);
    
    // Mensaje de ejemplo
    await connection.execute(`
      INSERT INTO mensajes (conversacion_id, emisor_id, receptor_id, contenido, tipo_mensaje, leido, created_at, updated_at) VALUES
      ('conv_1_2', 1, 2, '¡Hola! Tengo tomates cherry orgánicos frescos. ¿Te interesan?', 'text', FALSE, NOW(), NOW())
    `);
    
    // Beneficios y ahorros
    await connection.execute(`
      INSERT INTO beneficios_campesinos (campesino_id, total_ingresos_extra, numero_ventas_directas, promedio_ahorro_logistica, created_at, updated_at) VALUES
      (1, 125000, 15, 2500, NOW(), NOW()),
      (3, 85000, 8, 3200, NOW(), NOW())
    `);
    
    await connection.execute(`
      INSERT INTO ahorros_compradores (comprador_id, total_ahorrado, numero_compras_directas, promedio_ahorro_compra, created_at, updated_at) VALUES
      (2, 45000, 12, 3750, NOW(), NOW()),
      (4, 28000, 6, 4667, NOW(), NOW())
    `);
    
    console.log('✅ Funcionalidades anti-intermediarios configuradas\n');
    
    console.log('🎉 ¡Configuración completa!\n');
    console.log('👤 USUARIOS DE PRUEBA CREADOS:');
    console.log('');
    console.log('🌾 CAMPESINO:');
    console.log('   Email: campesino@test.com');
    console.log('   Password: password123');
    console.log('   Nombre: Juan Carlos Pérez');
    console.log('');
    console.log('🛒 COMPRADOR:');
    console.log('   Email: comprador@test.com');
    console.log('   Password: password123');
    console.log('   Nombre: María González');
    console.log('');
    console.log('🚀 PARA PROBAR:');
    console.log('1. Ejecuta: npm run dev');
    console.log('2. Abre: http://localhost:3000/api-test.html');
    console.log('3. Usa Live Server en VS Code para la página de prueba');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error durante la configuración:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();