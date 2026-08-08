import getDbPoolModule from '../lib/db.js';

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

    const pool = typeof getDbPoolModule === 'function' ? getDbPoolModule() : getDbPoolModule;

    // a) Extiende la vigencia del perfil y actualiza el cliente en TiDB
    let updateSuccess = false;

    // Intentar actualización en la tabla 'suscripciones'
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

      const [subResult] = await pool.execute(subQuery, subParams);
      console.log('[AUDIT SERVIDOR /api/renovar] Resultado TiDB suscripciones UPDATE:', subResult);
      if (subResult && subResult.affectedRows > 0) {
        updateSuccess = true;
      }
    } catch (subErr) {
      console.warn('[AUDIT SERVIDOR /api/renovar] Advertencia al actualizar suscripciones:', subErr.message);
    }

    // Intentar actualización en la tabla 'profiles' (si existe en la base de datos)
    try {
      let profQuery = 'UPDATE profiles SET fecha_vencimiento = DATE_ADD(NOW(), INTERVAL 30 DAY), cliente_nombre = ? WHERE id = ?';
      let profParams = [cliente_nombre, id];

      if (fecha_finalizacion) {
        profQuery = 'UPDATE profiles SET fecha_vencimiento = ?, cliente_nombre = ? WHERE id = ?';
        profParams = [fecha_finalizacion, cliente_nombre, id];
      }

      const [profResult] = await pool.execute(profQuery, profParams);
      console.log('[AUDIT SERVIDOR /api/renovar] Resultado TiDB profiles UPDATE:', profResult);
      if (profResult && profResult.affectedRows > 0) {
        updateSuccess = true;
      }
    } catch (profErr) {
      // Ignorar si la tabla profiles no existe
    }

    // b) Registra la transacción financiera para liquidez y reportes
    const [txResult] = await pool.execute(
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
