#!/usr/bin/env node
require('dotenv').config();

const bcrypt = require('bcrypt');
const path = require('path');
const {
  executeQuery,
  findOne,
  insert,
} = require(path.join('..', 'src', 'config', 'database'));
const Order = require(path.join('..', 'src', 'models', 'Order'));

async function ensureCategory() {
  const cat = await findOne('SELECT id FROM categorias_productos ORDER BY id LIMIT 1');
  if (cat) return cat.id;
  const id = await insert('categorias_productos', {
    nombre: 'vegetales', descripcion: 'Verduras y hortalizas frescas', icono: '🥬', estado: 'activo'
  });
  return id;
}

async function ensureFarmForUser(userId) {
  let farm = await findOne('SELECT id FROM fincas WHERE usuario_id = ? LIMIT 1', [userId]);
  if (farm) return farm.id;
  const id = await insert('fincas', {
    usuario_id: userId,
    nombre_finca: 'Finca Demo',
    ubicacion_departamento: 'Cundinamarca',
    ubicacion_municipio: 'Bogotá',
    area_hectareas: 1,
    tipo_cultivo: 'organico',
    estado: 'activa'
  });
  return id;
}

async function ensureBuyer() {
  let buyer = await findOne("SELECT id FROM usuarios WHERE email = 'comprador.demo@example.com' LIMIT 1");
  if (buyer) return buyer.id;
  const hash = await bcrypt.hash('Demo1234', 10);
  const id = await insert('usuarios', {
    nombre: 'Comprador', apellido: 'Demo', email: 'comprador.demo@example.com', telefono: '3100000000',
    tipo_usuario: 'comprador', fecha_nacimiento: '1990-01-01', password_hash: hash, estado: 'activo'
  });
  return id;
}

async function ensureProduct(userId, farmId, categoryId) {
  const existing = await findOne('SELECT id FROM productos WHERE usuario_id = ? LIMIT 1', [userId]);
  if (existing) return existing.id;
  const id = await insert('productos', {
    usuario_id: userId,
    finca_id: farmId,
    categoria_id: categoryId,
    nombre: 'Tomate Demo',
    descripcion: 'Tomate de prueba para el dashboard',
    precio_por_kg: 5000,
    stock_disponible: 50,
    unidad_medida: 'kg',
    estado: 'disponible',
    peso_minimo_venta: 0.5,
    peso_maximo_venta: 100.0,
    disponible_entrega_inmediata: true,
    tiempo_preparacion_dias: 1
  });
  return id;
}

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Uso: node scripts/seed_user_data.js <email_del_campesino>');
    process.exit(1);
  }

  // Buscar usuario
  const user = await findOne('SELECT id, tipo_usuario FROM usuarios WHERE email = ? LIMIT 1', [email]);
  if (!user) {
    console.error('Usuario no encontrado:', email);
    process.exit(1);
  }
  if (user.tipo_usuario !== 'campesino') {
    console.error('El usuario indicado no es campesino. Debe ser tipo_usuario = campesino');
    process.exit(1);
  }

  const categoryId = await ensureCategory();
  const farmId = await ensureFarmForUser(user.id);
  const productId = await ensureProduct(user.id, farmId, categoryId);
  const buyerId = await ensureBuyer();

  // Crear pedido pendiente y uno completado para mostrar estadísticas
  await Order.create({
    comprador_id: buyerId,
    campesino_id: user.id,
    items: [ { producto_id: productId, cantidad: 2, precio_unitario: 5000 } ],
    direccion_entrega: 'Dirección demo',
    telefono_contacto: '3100000000',
    fecha_entrega_programada: new Date(),
    hora_entrega_programada: '10:00',
    metodo_pago: 'efectivo',
    notas_comprador: null
  });

  // Crear otro pedido y marcarlo como completed para que se vea en "ventas del mes"
  const completed = await Order.create({
    comprador_id: buyerId,
    campesino_id: user.id,
    items: [ { producto_id: productId, cantidad: 3, precio_unitario: 5000 } ],
    direccion_entrega: 'Dirección demo 2',
    telefono_contacto: '3100000000',
    fecha_entrega_programada: new Date(),
    hora_entrega_programada: '11:00',
    metodo_pago: 'efectivo',
    notas_comprador: null
  });

  // Marcar como completed
  await Order.updateStatus(completed.id, 'confirmed', user.id, 'campesino');
  await Order.updateStatus(completed.id, 'preparing', user.id, 'campesino');
  await Order.updateStatus(completed.id, 'ready', user.id, 'campesino');
  await Order.updateStatus(completed.id, 'completed', user.id, 'campesino');

  console.log('✅ Datos de ejemplo creados para:', email);
}

main().catch(err => { console.error(err); process.exit(1); });
