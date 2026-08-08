import mysql from 'mysql2/promise';

let pool;
function getDbPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'gateway01.us-east-1.prod.aws.tidbcloud.com',
      port: parseInt(process.env.DB_PORT || '4000', 10),
      user: process.env.DB_USER || '4Gd4wQkV7fDju6r.root',
      password: process.env.DB_PASSWORD || 'iaUJxe0wyfdOEI4o',
      database: process.env.DB_NAME || 'test',
      ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000
    });
  }
  return pool;
}

export default async function handler(req, res) {
  // Configuración de cabeceras CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({
      success: false,
      message: 'Método no permitido. Utilice POST o PUT.'
    });
  }

  try {
    const body = req.body || {};
    const id = body.id || req.query?.id;
    const monto = body.monto !== undefined ? Number(body.monto) : 0;
    const cliente_nombre = (body.cliente_nombre || body.nombre_cliente || body.nombre || '').trim();
    const plataforma = (body.plataforma || body.servicio || 'Streaming').trim();

    console.log('[AUDIT SERVIDOR /api/renovar] Payload recibido:', {
      id,
      monto,
      cliente_nombre,
      plataforma
    });

    if (!id) {
      console.error('[AUDIT SERVIDOR /api/renovar] Error: ID de perfil ausente.');
      return res.status(400).json({
        success: false,
        message: 'Falta el ID del perfil para procesar la renovación.'
      });
    }

    const fecha_finalizacion = body.fecha_finalizacion || body.fecha_fin || body.fecha_vencimiento;
    const fecha_inicio = body.fecha_inicio;

    const dbPool = getDbPool();

    // Actualización de profiles
    try {
      let profQuery = 'UPDATE profiles SET fecha_vencimiento = DATE_ADD(NOW(), INTERVAL 30 DAY), cliente_nombre = ? WHERE id = ?';
      let profParams = [cliente_nombre, id];

      if (fecha_finalizacion) {
        profQuery = 'UPDATE profiles SET fecha_vencimiento = ?, cliente_nombre = ? WHERE id = ?';
        profParams = [fecha_finalizacion, cliente_nombre, id];
      }

      const [profResult] = await dbPool.execute(profQuery, profParams);
      console.log('[AUDIT SERVIDOR /api/renovar] Resultado TiDB profiles UPDATE:', profResult);
    } catch (profErr) {
      console.warn('[AUDIT SERVIDOR /api/renovar] Advertencia al actualizar profiles:', profErr.message);
    }

    // Actualización de suscripciones
    try {
      let subQuery = 'UPDATE suscripciones SET fecha_finalizacion = DATE_ADD(NOW(), INTERVAL 30 DAY), vence = DATE_ADD(NOW(), INTERVAL 30 DAY), nombre_cliente = ? WHERE id = ?';
      let subParams = [cliente_nombre, id];

      if (fecha_finalizacion && fecha_inicio) {
        subQuery = 'UPDATE suscripciones SET fecha_finalizacion = ?, vence = ?, fecha_inicio = ?, nombre_cliente = ? WHERE id = ?';
        subParams = [fecha_finalizacion, fecha_finalizacion, fecha_inicio, cliente_nombre, id];
      } else if (fecha_finalizacion) {
        subQuery = 'UPDATE suscripciones SET fecha_finalizacion = ?, vence = ?, nombre_cliente = ? WHERE id = ?';
        subParams = [fecha_finalizacion, fecha_finalizacion, cliente_nombre, id];
      }

      const [subResult] = await dbPool.execute(subQuery, subParams);
      console.log('[AUDIT SERVIDOR /api/renovar] Resultado TiDB suscripciones UPDATE:', subResult);
    } catch (subErr) {
      console.warn('[AUDIT SERVIDOR /api/renovar] Advertencia al actualizar suscripciones:', subErr.message);
    }

    // Insertar la transacción en el libro de liquidez/reportes
    const [txResult] = await dbPool.execute(
      "INSERT INTO transactions (type, amount, platform, client_name, profile_id, description, date) VALUES ('RENOVACION', ?, ?, ?, ?, 'Renovación de perfil', NOW())",
      [monto, plataforma, cliente_nombre, id]
    );

    console.log('[AUDIT SERVIDOR /api/renovar] Resultado TiDB transactions INSERT:', txResult);

    return res.status(200).json({
      success: true,
      message: 'Perfil renovado exitosamente'
    });
  } catch (error) {
    console.error('[AUDIT SERVIDOR /api/renovar] Error inesperado en el servidor:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al procesar la renovación',
      error: error.message
    });
  }
}
