const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

const app = express();

app.use(cors());
app.use(express.json());

// ==========================================
//  🕵️‍♂️ MODO DETECTIVE (LOGGING)
// ==========================================
// Esto nos avisará en la terminal si la App realmente está conectando
app.use((req, res, next) => {
    console.log(`📡 Petición entrante desde la App: ${req.method} ${req.path}`);
    next();
});

// ==========================================
//  CONFIGURACIÓN DE LA BASE DE DATOS (NUBE - TiDB)
// ==========================================
const db = mysql.createPool({
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

// Manejo de eventos de error en el pool para mitigar ECONNRESET / PROTOCOL_CONNECTION_LOST (Cold Start de TiDB)
db.on('error', (err) => {
    console.error('⚠️ Error en el Pool de MySQL/TiDB:', err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
        console.log('🔄 Conexión perdida con TiDB Cloud. El pool reemplazará la conexión automáticamente.');
    }
});

// ==========================================
//  SISTEMA DE AUTO-REPARACIÓN DE BASE DE DATOS
// ==========================================
function inicializarBaseDeDatos() {
    console.log("🔧 Verificando estado de la Base de Datos...");

    // 1. Tabla Ventas
    const sqlVentas = `CREATE TABLE IF NOT EXISTS registro_ventas (id INT AUTO_INCREMENT PRIMARY KEY, producto_id INT, nombre_producto VARCHAR(255), cantidad INT NOT NULL, precio_venta DECIMAL(10, 2), ganancia DECIMAL(10, 2), fecha_venta DATE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`;
    db.query(sqlVentas, (err) => { if (err) console.error("❌ Error ventas:", err.message); });

    // 2. Columna Costo
    const sqlCosto = "ALTER TABLE productos ADD COLUMN costo DECIMAL(10, 2) DEFAULT 0";
    db.query(sqlCosto, (err) => { if (err && err.code !== 'ER_DUP_FIELDNAME') console.error("⚠️ Nota costo:", err.message); });

    // 3. Columna Visible
    const sqlVisible = "ALTER TABLE productos ADD COLUMN visible TINYINT DEFAULT 1";
    db.query(sqlVisible, (err) => { if (err && err.code !== 'ER_DUP_FIELDNAME') console.error("⚠️ Nota visible:", err.message); });

    // 4. Columna Rol
    const sqlRol = "ALTER TABLE usuarios ADD COLUMN rol VARCHAR(20) DEFAULT 'cliente'";
    db.query(sqlRol, (err) => {
        if (err && err.code !== 'ER_DUP_FIELDNAME') console.error("⚠️ Nota rol:", err.message);
        else console.log("✅ Columna 'rol' verificada (Sistema de Jerarquía listo).");
    });
    // 5. Tabla de Gastos
    const sqlGastos = `CREATE TABLE IF NOT EXISTS gastos (
        id INT AUTO_INCREMENT PRIMARY KEY, 
        descripcion VARCHAR(255), 
        monto DECIMAL(10, 2), 
        fecha DATE, 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    db.query(sqlGastos, (err) => { 
        if (err) console.error("❌ Error tabla gastos:", err.message); 
        else console.log("✅ Tabla 'gastos' verificada.");
    });

    // 6. Columnas de Soft Delete (Perfiles Eliminados)
    const sqlEliminado = "ALTER TABLE suscripciones ADD COLUMN eliminado TINYINT DEFAULT 0";
    db.query(sqlEliminado, (err) => { 
        if (err) {
            if (err.code !== 'ER_DUP_FIELDNAME' && err.errno !== 1060) console.error("⚠️ Error columna eliminado:", err.message); 
            else console.log("✅ Columna 'eliminado' verificada en la tabla suscripciones.");
        } else {
            console.log("✅ Columna 'eliminado' creada exitosamente.");
        }
    });

    const sqlFechaEliminado = "ALTER TABLE suscripciones ADD COLUMN fecha_eliminacion DATETIME DEFAULT NULL";
    db.query(sqlFechaEliminado, (err) => { 
        if (err) {
            if (err.code !== 'ER_DUP_FIELDNAME' && err.errno !== 1060) console.error("⚠️ Error columna fecha_eliminacion:", err.message); 
            else console.log("✅ Columna 'fecha_eliminacion' verificada en la tabla suscripciones.");
        } else {
            console.log("✅ Columna 'fecha_eliminacion' creada exitosamente.");
        }
    });

    // 7. Tabla Transactions (Reportes Financieros)
    const sqlTransactions = `CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(50) DEFAULT 'VENTA',
        amount DOUBLE DEFAULT 0,
        description VARCHAR(255) DEFAULT '',
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        platform VARCHAR(100) DEFAULT '',
        client_name VARCHAR(255) DEFAULT '',
        profile_id INT DEFAULT NULL
    )`;
    db.query(sqlTransactions, (err) => { 
        if (err) console.error("❌ Error creando tabla transactions:", err.message); 
        else console.log("✅ Tabla 'transactions' verificada en TiDB Cloud.");
    });
}
inicializarBaseDeDatos();

// ==========================================
//  CONFIGURACIÓN DE CORREO (NODEMAILER)
// ==========================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'leotechpuc@gmail.com',
        pass: 'pfty pnff ozes kaow' 
    },
    tls: {
        rejectUnauthorized: false 
    }
});

// Función Inteligente de Envío de Correo
const enviarCorreoBienvenida = async (emailDestino, nombreUsuario) => {
    try {
        await transporter.sendMail({
            from: '"LeoTech Soporte 🚀" <leotechpuc@gmail.com>',
            to: emailDestino,
            subject: '¡Bienvenido a la familia LeoTech!',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #f9f9f9;">
          <div style="text-align: center; padding-bottom: 20px;">
            <h1 style="color: #2c3e50; margin: 0;">LeoTech</h1>
            <p style="color: #7f8c8d; font-size: 14px;">Tecnología y Servicios</p>
          </div>
          <div style="background-color: #ffffff; padding: 20px; border-radius: 5px;">
            <h2 style="color: #34495e;">¡Hola, ${nombreUsuario}! 👋</h2>
            <p style="font-size: 16px; color: #555; line-height: 1.6;">
              Gracias por registrarte en nuestra plataforma. Tu cuenta ha sido creada exitosamente.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://leotech-streaming.onrender.com" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Ir a la Plataforma
              </a>
            </div>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>© 2025 LeoTech. Pucallpa, Perú.</p>
          </div>
        </div>
      `
        });
        console.log("✅ Correo de bienvenida enviado a: " + emailDestino);
    } catch (error) {
        console.error("❌ Error enviando correo:", error);
    }
};

// ==========================================
//           RUTAS DE AUTENTICACIÓN
// ==========================================

// 1. REGISTRO
app.post('/registro', async (req, res) => {
    try {
        const { nombre, correo, password } = req.body;
        
        if (!nombre || !correo || !password) {
            return res.status(400).json({ error: "Todos los campos son obligatorios" });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const esJefe = nombre.toLowerCase().includes('leonardo rodriguez') || correo.toLowerCase().startsWith('admin');
        const rolAsignado = esJefe ? 'admin' : 'cliente';

        const sql = "INSERT INTO usuarios (nombre, correo, password, rol) VALUES (?, ?, ?, ?)";

        db.query(sql, [nombre, correo, hashedPassword, rolAsignado], (err, result) => {
            if (err) return res.status(500).json({ error: "El correo ya existe o error en DB" });
            
            // Enviamos correo
            enviarCorreoBienvenida(correo, nombre);

            return res.json({ message: "Usuario registrado con éxito" });
        });
    } catch (error) {
        console.error("Error en registro:", error);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
});

// 2. LOGIN
app.post('/login', async (req, res) => {
    try {
        const { correo, password } = req.body;

        if (!correo || !password) {
            return res.status(400).json({ status: "Error", message: "Correo y contraseña son obligatorios" });
        }

        const sql = "SELECT * FROM usuarios WHERE correo = ?";

        db.query(sql, [correo], async (err, data) => {
            if (err) return res.status(500).json(err);
            if (data.length > 0) {
                const match = await bcrypt.compare(password, data[0].password);
                if (match) {
                    return res.json({
                        status: "Success",
                        user: data[0].nombre,
                        rol: data[0].rol
                    });
                } else {
                    return res.json({ status: "Error", message: "Contraseña incorrecta" });
                }
            } else {
                return res.json({ status: "Error", message: "Usuario no encontrado" });
            }
        });
    } catch (error) {
        console.error("Error en login:", error);
        return res.status(500).json({ status: "Error", message: "Error interno del servidor" });
    }
});

// ==========================================
//        OTRAS RUTAS
// ==========================================

app.get('/clientes', (req, res) => { 
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const sql = "SELECT * FROM suscripciones WHERE (eliminado = 0 OR eliminado IS NULL OR eliminado IS FALSE)"; 
    db.query(sql, (err, data) => {
        if (err) {
            console.error("❌ Error en TiDB al consultar /clientes:", err.message);
            return res.status(500).json({ success: false, error: err.message, data: [] });
        }
        const normalizedData = Array.isArray(data) ? data.map(item => ({
            ...item,
            eliminado: (item.eliminado == 1 || item.eliminado === true || item.eliminado === '1' || item.eliminado === 'true') ? 1 : 0
        })) : [];
        return res.json(normalizedData);
    }); 
});

// ==========================================
//  ⚡ REQUERIMIENTO 1: ENDPOINT DE PING (KEEP-ALIVE)
// ==========================================
// Mantiene despierto el servidor Express y TiDB Serverless al recibir pings periódicos
app.get('/ping', (req, res) => {
    db.query("SELECT 1", (err, result) => {
        if (err) {
            console.error("❌ Error de ping a la BD:", err.message);
            return res.status(500).json({ status: "Error", message: "Error al comunicar con la base de datos", error: err.message });
        }
        console.log("⚡ Ping exitoso a la base de datos.");
        return res.json({ status: "OK", message: "Servidor y base de datos activos" });
    });
});

// ==========================================
//  🛒 REQUERIMIENTO 3: REGISTRO INTELIGENTE (STOCK AUTOMÁTICO)
// ==========================================
app.post('/clientes', (req, res) => {
    const { nombre, celular, servicio, fecha_inicio, fecha_fin, monto, correo, contrasena, perfil, pin } = req.body;
    
    // Si se proporciona un correo manual, se mantiene el flujo de asignación tradicional
    if (correo && correo.trim() !== "") {
        const values = [nombre, celular, servicio, perfil, fecha_inicio, fecha_fin, monto, correo, contrasena, pin];
        db.query("INSERT INTO suscripciones (nombre_cliente, numero_celular, servicio, perfil, fecha_inicio, fecha_finalizacion, monto, correo, contrasena, pin_perfil) VALUES (?)", [values], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            
            const profileId = result ? result.insertId : null;
            const montoVal = Number(monto) || 0;
            if (montoVal > 0) {
                db.query(
                    "INSERT INTO transactions (type, amount, platform, client_name, profile_id, description, date) VALUES ('VENTA', ?, ?, ?, ?, 'Venta de perfil', NOW())",
                    [montoVal, servicio || 'Streaming', nombre || 'Cliente', profileId],
                    (errTx) => {
                        if (errTx) console.error("⚠️ Error registrando en transactions:", errTx.message);
                        else console.log(`💸 Transacción VENTA registrada en transactions para ${nombre}`);
                    }
                );
            }

            return res.json("Cliente creado");
        });
        return;
    }

    // Flujo inteligente: Buscar y asignar cuenta y perfil disponible de forma automática
    db.getConnection((err, connection) => {
        if (err) return res.status(500).json({ error: "Error de conexión a la base de datos: " + err.message });

        const query = (sql, values) => new Promise((resolve, reject) => {
            connection.query(sql, values, (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        connection.beginTransaction(async (transactionErr) => {
            if (transactionErr) {
                connection.release();
                return res.status(500).json({ error: "Error al iniciar transacción: " + transactionErr.message });
            }

            try {
                // 1. Encontrar una cuenta del servicio solicitado con menos de 5 perfiles ocupados
                // Ordenar por ocupados (de menor a mayor para balancear) y vencimiento más cercano.
                // Se utiliza FOR UPDATE para evitar colisiones concurrentes (sobreventa).
                const selectAccountSql = `
                    SELECT i.id, i.correo, i.contrasena, COUNT(s.id) as ocupados
                    FROM inventario i
                    LEFT JOIN suscripciones s ON i.correo = s.correo AND s.servicio = i.servicio AND s.fecha_finalizacion >= CURDATE() AND (s.eliminado = 0 OR s.eliminado IS NULL)
                    WHERE i.servicio = ?
                    GROUP BY i.id, i.correo, i.contrasena
                    HAVING ocupados < 5
                    ORDER BY ocupados ASC, i.fecha_vencimiento ASC
                    LIMIT 1
                    FOR UPDATE
                `;
                
                const accounts = await query(selectAccountSql, [servicio]);
                
                if (accounts.length === 0) {
                    throw new Error(`No hay cuentas de ${servicio} en stock con perfiles disponibles (menos de 5 ocupados). Por favor, agregue una nueva cuenta vacía al stock.`);
                }

                const cuentaAsignada = accounts[0];
                const correoAsignado = cuentaAsignada.correo;
                const contrasenaAsignada = cuentaAsignada.contrasena;

                // 2. Buscar perfiles ocupados para esta cuenta en suscripciones activas
                const occupiedProfilesRows = await query(
                    "SELECT perfil FROM suscripciones WHERE correo = ? AND servicio = ? AND fecha_finalizacion >= CURDATE() AND (eliminado = 0 OR eliminado IS NULL)",
                    [correoAsignado, servicio]
                );
                
                const occupiedProfilesList = occupiedProfilesRows.map(row => (row.perfil || '').trim().toLowerCase());

                // 3. Determinar el primer slot de perfil libre ("Perfil 1" a "Perfil 5")
                let perfilAsignado = "";
                const perfilesPosibles = ["Perfil 1", "Perfil 2", "Perfil 3", "Perfil 4", "Perfil 5"];
                for (let p of perfilesPosibles) {
                    if (!occupiedProfilesList.includes(p.toLowerCase())) {
                        perfilAsignado = p;
                        break;
                    }
                }
                
                // Si hay nombres de perfil personalizados y no coincide con la lista, ponemos uno correlativo
                if (!perfilAsignado) {
                    perfilAsignado = `Perfil ${cuentaAsignada.ocupados + 1}`;
                }

                // Usar pin ingresado en la solicitud o dejarlo vacío por defecto
                const pinAsignado = pin || '';

                // 4. Registrar el nuevo cliente asignándole los datos automáticos
                const insertSql = `
                    INSERT INTO suscripciones (nombre_cliente, numero_celular, servicio, perfil, fecha_inicio, fecha_finalizacion, monto, correo, contrasena, pin_perfil)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                const insertValues = [
                    nombre, 
                    celular, 
                    servicio, 
                    perfilAsignado, 
                    fecha_inicio, 
                    fecha_fin, 
                    monto === '' || monto === undefined ? 0 : monto, 
                    correoAsignado, 
                    contrasenaAsignada, 
                    pinAsignado
                ];

                const insertRes = await query(insertSql, insertValues);
                const profileId = insertRes ? insertRes.insertId : null;
                const montoVal = Number(monto) || 0;
                if (montoVal > 0) {
                    await query(
                        "INSERT INTO transactions (type, amount, platform, client_name, profile_id, description, date) VALUES ('VENTA', ?, ?, ?, ?, 'Venta de perfil', NOW())",
                        [montoVal, servicio || 'Streaming', nombre || 'Cliente', profileId]
                    );
                    console.log(`💸 Transacción VENTA en stock automático registrada para ${nombre}`);
                }

                // Consolidamos la transacción
                await query("COMMIT");
                connection.release();
                
                console.log(`✅ Cliente registrado automáticamente en la cuenta ${correoAsignado} (${perfilAsignado})`);
                return res.json("Cliente creado");

            } catch (error) {
                console.error("❌ Error en la transacción de creación de cliente:", error.message);
                await query("ROLLBACK");
                connection.release();
                // Mandamos un código identificable para que la UI alerte el mensaje
                return res.json({ code: "TRANS_ERROR", sqlMessage: error.message });
            }
        });
    });
});

// ==========================================
//  🔄 REQUERIMIENTO 3 (EXT): RENOVACIÓN RÁPIDA (+30 DÍAS)
// ==========================================
app.post('/clientes/renovar/:id', (req, res) => {
    const clienteId = req.params.id;
    const { nombre_cliente, servicio, monto, fecha_finalizacion } = req.body || {};

    db.getConnection((err, connection) => {
        if (err) return res.status(500).json({ error: "Error de conexión a la base de datos: " + err.message });

        const query = (sql, values) => new Promise((resolve, reject) => {
            connection.query(sql, values, (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        connection.beginTransaction(async (transactionErr) => {
            if (transactionErr) {
                connection.release();
                return res.status(500).json({ error: "Error al iniciar la transacción: " + transactionErr.message });
            }

            try {
                // 1. Obtener la suscripción actual y bloquear la fila
                const rows = await query("SELECT * FROM suscripciones WHERE id = ? FOR UPDATE", [clienteId]);
                if (rows.length === 0) {
                    throw new Error("Cliente no encontrado.");
                }

                const cliente = rows[0];
                
                // Nombre final
                const finalNombre = (nombre_cliente !== undefined && String(nombre_cliente).trim() !== '') 
                    ? String(nombre_cliente).trim() 
                    : (cliente.nombre_cliente || cliente.nombre || 'Cliente');

                // Servicio/Plataforma final
                const finalServicio = (servicio !== undefined && String(servicio).trim() !== '') 
                    ? String(servicio).trim() 
                    : (cliente.servicio || 'Streaming');
                
                // Calculamos el precio de esta mensualidad/renovación
                let precioMensual = (monto !== undefined && monto !== '' && !isNaN(Number(monto))) 
                    ? Number(monto) 
                    : (Number(cliente.monto) || 0);

                if (precioMensual < 0) {
                    throw new Error("El monto de renovación no puede ser negativo.");
                }

                // 2. Calcular la nueva fecha de vencimiento
                const hoy = new Date();
                let fechaFinStr = '';

                if (fecha_finalizacion && String(fecha_finalizacion).trim() !== '') {
                    fechaFinStr = String(fecha_finalizacion).trim();
                } else {
                    let fechaBase = new Date();
                    if (cliente.fecha_finalizacion) {
                        const fechaFinalizacion = new Date(cliente.fecha_finalizacion);
                        if (fechaFinalizacion > hoy) {
                            fechaBase = fechaFinalizacion;
                        }
                    }
                    const nuevaFechaFin = new Date(fechaBase);
                    nuevaFechaFin.setDate(nuevaFechaFin.getDate() + 30);
                    fechaFinStr = nuevaFechaFin.toISOString().split('T')[0];
                }
                
                const fechaInicioStr = hoy.toISOString().split('T')[0];

                // 3. Actualizar la suscripción extendiendo la fecha, ajustando nombre_cliente y acumulando el monto pagado.
                const nuevoMontoAcumulado = Number(cliente.monto || 0) + precioMensual;
                
                await query(
                    "UPDATE suscripciones SET nombre_cliente = ?, fecha_inicio = ?, fecha_finalizacion = ?, monto = ?, estado = 'activo' WHERE id = ?",
                    [finalNombre, fechaInicioStr, fechaFinStr, nuevoMontoAcumulado, clienteId]
                );

                // Insertar transacción de renovación en 'transactions'
                await query(
                    "INSERT INTO transactions (type, amount, platform, client_name, profile_id, description, date) VALUES ('RENOVACION', ?, ?, ?, ?, 'Renovación mensual de perfil', NOW())",
                    [precioMensual, finalServicio, finalNombre, clienteId]
                );
                console.log(`💸 Transacción RENOVACION registrada en transactions para ${finalNombre} por S/ ${precioMensual}`);

                // 4. Insertar registro de venta en 'registro_ventas' para llevar un historial limpio
                const insertVentaSql = `
                    INSERT INTO registro_ventas (producto_id, nombre_producto, cantidad, precio_venta, ganancia, fecha_venta)
                    VALUES (?, ?, 1, ?, ?, ?)
                `;
                const nombreProductoVenta = `Renovación: ${finalServicio} - ${finalNombre}`;
                await query(insertVentaSql, [clienteId, nombreProductoVenta, precioMensual, precioMensual, fechaInicioStr]);

                await query("COMMIT");
                connection.release();
                
                console.log(`✅ Suscripción de ${finalNombre} renovada hasta ${fechaFinStr}. Nuevo monto total acumulado: S/ ${nuevoMontoAcumulado}`);
                return res.json({ 
                    status: "Success", 
                    message: "Suscripción renovada con éxito",
                    nuevaFecha: fechaFinStr,
                    monto: precioMensual 
                });

            } catch (error) {
                console.error("❌ Error en la transacción de renovación:", error.message);
                await query("ROLLBACK");
                connection.release();
                return res.status(500).json({ error: error.message });
            }
        });
    });
});

// ==========================================
//  📅 REQUERIMIENTO 2: AUTOMATIZACIÓN DE NOTIFICACIONES
// ==========================================
// Endpoint que busca vencimientos en las próximas 48 horas y envía alertas por WhatsApp
app.get('/api/cron/notificaciones-vencimiento', async (req, res) => {
    try {
        console.log("⏰ Iniciando revisión de vencimientos (<= 48 horas)...");
        
        // Buscamos clientes que vencen entre hoy y los próximos 2 días
        const sql = `
            SELECT id, nombre_cliente, numero_celular, servicio, perfil, fecha_finalizacion, monto
            FROM suscripciones
            WHERE fecha_finalizacion BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 2 DAY)
              AND (estado = 'activo' OR estado IS NULL)
              AND (eliminado = 0 OR eliminado IS NULL)
        `;
        
        db.query(sql, async (err, clientes) => {
            if (err) {
                console.error("❌ Error al consultar vencimientos:", err);
                return res.status(500).json({ error: err.message });
            }
            
            console.log(`🔍 Se encontraron ${clientes.length} clientes por vencer en las próximas 48 horas.`);
            
            const envios = [];
            
            for (let cliente of clientes) {
                const celular = cliente.numero_celular || '';
                if (!celular) {
                    console.log(`⚠️ El cliente ${cliente.nombre_cliente} no tiene celular registrado. Saltando.`);
                    continue;
                }

                // Formateamos la fecha a formato legible local DD/MM/YYYY
                const fechaFin = new Date(cliente.fecha_finalizacion);
                const fechaFormateada = `${String(fechaFin.getDate()).padStart(2, '0')}/${String(fechaFin.getMonth() + 1).padStart(2, '0')}/${fechaFin.getFullYear()}`;
                
                // Redactar el texto de renovación
                const mensaje = `Hola *${cliente.nombre_cliente}*, te saluda LeoTech. 👋 Tu cuenta de *${cliente.servicio}* (Perfil: *${cliente.perfil}*) vence el *${fechaFormateada}*. ¿Desearías renovarla para continuar con el servicio sin interrupciones? 🚀`;
                
                // Configuración de API de WhatsApp (Modificar con tus datos de Evolution API o Baileys)
                const WSP_API_URL = process.env.WSP_API_URL || 'http://localhost:8080'; // Endpoint Evolution API
                const WSP_API_KEY = process.env.WSP_API_KEY || 'YOUR_GLOBAL_API_KEY';  // ApiKey
                const WSP_INSTANCE = process.env.WSP_INSTANCE || 'leotech_instance';  // Nombre de Instancia
                
                let enviado = false;
                let errorEnvio = null;

                try {
                    // Limpieza y formateo del celular para el envío
                    const numeroLimpio = celular.replace(/\D/g, '');
                    const numeroDestino = numeroLimpio.startsWith('51') ? numeroLimpio : `51${numeroLimpio}`;
                    
                    // Endpoint estándar para Evolution API: /message/sendText/{instance}
                    const response = await fetch(`${WSP_API_URL}/message/sendText/${WSP_INSTANCE}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': WSP_API_KEY
                        },
                        body: JSON.stringify({
                            number: numeroDestino,
                            text: mensaje
                        }),
                        signal: AbortSignal.timeout(8000) // Timeout de 8 segundos por mensaje
                    });

                    if (response.ok) {
                        enviado = true;
                        console.log(`✉️ WhatsApp enviado con éxito a ${cliente.nombre_cliente} (${numeroDestino})`);
                    } else {
                        const errorText = await response.text();
                        errorEnvio = `Status: ${response.status} - ${errorText}`;
                        console.error(`❌ Falló WhatsApp a ${cliente.nombre_cliente}. HTTP ${response.status}: ${errorText}`);
                    }
                } catch (wspError) {
                    errorEnvio = wspError.message;
                    console.error(`❌ Error al conectar con la API de WhatsApp para ${cliente.nombre_cliente}:`, wspError.message);
                }

                envios.push({
                    cliente: cliente.nombre_cliente,
                    celular: celular,
                    servicio: cliente.servicio,
                    enviado: enviado,
                    error: errorEnvio
                });
            }

            return res.json({
                message: `Revisión de vencimientos finalizada. Clientes notificados: ${envios.filter(e => e.enviado).length}`,
                resultados: envios
            });
        });
    } catch (err) {
        console.error("❌ Error crítico en cron notificaciones:", err);
        return res.status(500).json({ error: err.message });
    }
});

app.put('/update/:id', (req, res) => { const values = [req.body.nombre, req.body.celular, req.body.servicio, req.body.perfil, req.body.fecha_inicio, req.body.fecha_fin, req.body.monto, req.body.correo, req.body.contrasena, req.body.pin, req.params.id]; db.query("UPDATE suscripciones SET nombre_cliente=?, numero_celular=?, servicio=?, perfil=?, fecha_inicio=?, fecha_finalizacion=?, monto=?, correo=?, contrasena=?, pin_perfil=? WHERE id=?", values, (err) => res.json(err ? err : "Actualizado")); });
// ==========================================
//  🗑️ CONTROLADORES DE SOFT DELETE Y RESTAURACIÓN (PERFILES / CLIENTES)
// ==========================================

// Helper para Soft Delete (Eliminar perfil a la Papelera)
const softDeleteProfile = (req, res) => {
    const rawId = req.params.id;
    const profileId = parseInt(rawId, 10);
    const targetId = isNaN(profileId) ? rawId : profileId;

    if (!targetId) {
        console.error("❌ Error Soft Delete: ID de perfil no proporcionado o inválido.");
        return res.status(400).json({ success: false, error: "ID de perfil no proporcionado o inválido" });
    }

    console.log(`🗑️ Iniciando Soft Delete para Perfil ID: ${targetId}`);
    const sql = "UPDATE suscripciones SET eliminado = TRUE, fecha_eliminacion = NOW() WHERE id = ?";
    
    db.query(sql, [targetId], (err, result) => {
        if (err) {
            console.error(`❌ Error en TiDB al realizar Soft Delete en perfil ID ${targetId}:`, err.message);
            return res.status(500).json({ success: false, error: "Error de BD TiDB: " + err.message });
        }
        
        if (result.affectedRows === 0) {
            console.warn(`⚠️ Soft Delete: No se encontró ningún perfil activo con ID ${targetId}`);
            return res.status(404).json({ success: false, error: "Perfil no encontrado" });
        }

        console.log(`✅ Soft Delete exitoso. Perfil ID ${targetId} movido a la Papelera.`);
        return res.json({ success: true, message: "Perfil movido a la Papelera con éxito", affectedRows: result.affectedRows });
    });
};

// Helper para Restauración de Perfil
const restoreProfile = (req, res) => {
    const rawId = req.params.id;
    const profileId = parseInt(rawId, 10);
    const targetId = isNaN(profileId) ? rawId : profileId;

    if (!targetId) {
        console.error("❌ Error Restaurar: ID de perfil no proporcionado o inválido.");
        return res.status(400).json({ success: false, error: "ID de perfil no proporcionado o inválido" });
    }

    console.log(`🔄 Iniciando Restauración para Perfil ID: ${targetId}`);
    const sql = "UPDATE suscripciones SET eliminado = FALSE, fecha_eliminacion = NULL WHERE id = ?";
    
    db.query(sql, [targetId], (err, result) => {
        if (err) {
            console.error(`❌ Error en TiDB al restaurar perfil ID ${targetId}:`, err.message);
            return res.status(500).json({ success: false, error: "Error de BD TiDB: " + err.message });
        }

        if (result.affectedRows === 0) {
            console.warn(`⚠️ Restauración: No se encontró ningún perfil con ID ${targetId}`);
            return res.status(404).json({ success: false, error: "Perfil no encontrado" });
        }

        console.log(`✅ Restauración exitosa. Perfil ID ${targetId} restaurado a la lista principal.`);
        return res.json({ success: true, message: "Perfil restaurado con éxito", affectedRows: result.affectedRows });
    });
};

// Helper para Hard Delete (Eliminación Definitiva)
const hardDeleteProfile = (req, res) => {
    const rawId = req.params.id;
    const profileId = parseInt(rawId, 10);
    const targetId = isNaN(profileId) ? rawId : profileId;

    if (!targetId) {
        console.error("❌ Error Destruir: ID de perfil no proporcionado o inválido.");
        return res.status(400).json({ success: false, error: "ID de perfil no proporcionado o inválido" });
    }

    console.log(`💥 Iniciando Hard Delete (Eliminación permanente) para Perfil ID: ${targetId}`);
    const sql = "DELETE FROM suscripciones WHERE id = ?";
    
    db.query(sql, [targetId], (err, result) => {
        if (err) {
            console.error(`❌ Error en TiDB al eliminar permanentemente perfil ID ${targetId}:`, err.message);
            return res.status(500).json({ success: false, error: "Error de BD TiDB: " + err.message });
        }

        if (result.affectedRows === 0) {
            console.warn(`⚠️ Hard Delete: No se encontró ningún perfil con ID ${targetId}`);
            return res.status(404).json({ success: false, error: "Perfil no encontrado" });
        }

        console.log(`✅ Perfil ID ${targetId} eliminado permanentemente.`);
        return res.json({ success: true, message: "Perfil eliminado permanentemente", affectedRows: result.affectedRows });
    });
};

// Helper para Obtener Perfiles Eliminados
const getDeletedProfiles = (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Consulta SQL a TiDB filtrando por eliminado = 1 o eliminado IS TRUE
    const sql = "SELECT * FROM suscripciones WHERE (eliminado = 1 OR eliminado IS TRUE) ORDER BY fecha_eliminacion DESC";
    db.query(sql, (err, data) => {
        if (err) {
            console.error("❌ Error en TiDB al consultar perfiles eliminados:", err.message);
            return res.status(500).json({ success: false, error: err.message, data: [] });
        }

        // Normalización de valores booleanos/números de `eliminado`
        const normalizedData = Array.isArray(data) ? data.map(item => ({
            ...item,
            eliminado: (item.eliminado == 1 || item.eliminado === true || item.eliminado === '1' || item.eliminado === 'true') ? 1 : 0
        })) : [];

        console.log(`[API /clientes/eliminados] Se enviaron ${normalizedData.length} registros de la papelera desde TiDB.`);
        return res.json(normalizedData);
    });
};

// --- RUTAS CLIENTES ---
app.delete('/delete/:id', softDeleteProfile);
app.get('/clientes/eliminados', getDeletedProfiles);
app.put('/clientes/restaurar/:id', restoreProfile);
app.delete('/clientes/destruir/:id', hardDeleteProfile);

// --- RUTAS ALIAS COMPATIBILIDAD PERFILES (/profiles) ---
app.get('/profiles', (req, res) => { 
    const sql = "SELECT * FROM suscripciones WHERE (eliminado = 0 OR eliminado IS NULL)";
    db.query(sql, (err, data) => {
        if (err) {
            console.error("❌ Error en TiDB al consultar /profiles:", err.message);
            return res.status(500).json({ success: false, error: err.message, data: [] });
        }
        return res.json(data);
    });
});
app.get('/profiles/eliminados', getDeletedProfiles);
app.delete('/profiles/:id', softDeleteProfile);
app.put('/profiles/restaurar/:id', restoreProfile);
app.delete('/profiles/destruir/:id', hardDeleteProfile);


app.get('/productos', (req, res) => { db.query("SELECT * FROM productos", (err, data) => res.json(err ? err : data)); });
app.post('/productos/registrar', (req, res) => { const { nombre, precio, costo, categoria, imagen_url, descripcion, stock, oferta, visible } = req.body; db.query('INSERT INTO productos (nombre, precio, costo, categoria, imagen_url, descripcion, stock, oferta, visible) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [nombre, precio, costo || 0, categoria, imagen_url, descripcion || '', stock || 10, oferta ? 1 : 0, visible ? 1 : 0], (err) => { if (err) return res.status(500).send(err); res.send('Registrado'); }); });
app.put('/productos/actualizar/:id', (req, res) => { const { nombre, precio, costo, categoria, imagen_url, descripcion, stock, oferta, visible } = req.body; db.query(`UPDATE productos SET nombre=?, precio=?, costo=?, categoria=?, imagen_url=?, descripcion=?, stock=?, oferta=?, visible=? WHERE id=?`, [nombre, precio, costo || 0, categoria, imagen_url, descripcion, stock, oferta ? 1 : 0, visible ? 1 : 0, req.params.id], (err) => { if (err) return res.status(500).send(err); res.send('Actualizado'); }); });
app.delete('/productos/eliminar/:id', (req, res) => { db.query("DELETE FROM productos WHERE id = ?", [req.params.id], (err) => res.json(err ? err : "Eliminado")); });

app.get('/inventario', (req, res) => { db.query("SELECT * FROM inventario", (err, data) => res.json(err ? err : data)); });
app.post('/inventario', (req, res) => { const values = [req.body.correo, req.body.contrasena, req.body.servicio, req.body.costo || 0, req.body.fecha_entrada, req.body.fecha_vencimiento]; db.query("INSERT INTO inventario (correo, contrasena, servicio, costo, fecha_entrada, fecha_vencimiento) VALUES (?)", [values], (err) => res.json(err ? err : "Agregado")); });
app.put('/inventario/:id', (req, res) => { const values = [req.body.correo, req.body.contrasena, req.body.servicio, req.body.costo || 0, req.body.fecha_entrada, req.body.fecha_vencimiento, req.params.id]; db.query("UPDATE inventario SET correo=?, contrasena=?, servicio=?, costo=?, fecha_entrada=?, fecha_vencimiento=? WHERE id=?", values, (err) => res.json(err ? err : "Actualizado")); });
app.delete('/inventario/:id', (req, res) => { db.query("DELETE FROM inventario WHERE id = ?", [req.params.id], (err) => res.json(err ? err : "Eliminado")); });

app.get('/ventas', (req, res) => { db.query("SELECT * FROM registro_ventas ORDER BY id DESC", (err, data) => { if (err && err.code === 'ER_NO_SUCH_TABLE') return res.json([]); if (err) return res.status(500).json(err); return res.json(data); }); });
app.post('/ventas', (req, res) => { const values = [req.body.productoId, req.body.nombreProducto, req.body.cantidad, req.body.precioVenta, req.body.ganancia, req.body.fecha]; db.query("INSERT INTO registro_ventas (producto_id, nombre_producto, cantidad, precio_venta, ganancia, fecha_venta) VALUES (?)", [values], (err) => { if (err) return res.status(500).json(err); res.json({ Status: "Registrada" }); }); });
app.put('/ventas/:id', (req, res) => { const values = [req.body.cantidad, req.body.precioVenta, req.body.ganancia, req.body.fecha, req.params.id]; db.query("UPDATE registro_ventas SET cantidad=?, precio_venta=?, ganancia=?, fecha_venta=? WHERE id=?", values, (err) => { if (err) return res.status(500).json(err); res.json({ Status: "Actualizada" }); }); });
app.delete('/ventas/:id', (req, res) => { db.query("DELETE FROM registro_ventas WHERE id = ?", [req.params.id], (err) => { if (err) return res.status(500).json(err); res.json({ Status: "Eliminada" }); }); });

const PORT = process.env.PORT || 8081;
// === RUTAS DE GASTOS (NUEVO) ===
app.get('/gastos', (req, res) => {
    // Traemos los gastos ordenados por fecha (más reciente primero)
    db.query("SELECT * FROM gastos ORDER BY fecha DESC", (err, data) => {
        if(err) return res.status(500).json(err);
        return res.json(data);
    });
});

app.post('/gastos', (req, res) => {
    const { descripcion, monto, fecha } = req.body;
    const sql = "INSERT INTO gastos (descripcion, monto, fecha) VALUES (?, ?, ?)";
    db.query(sql, [descripcion, monto, fecha], (err, result) => {
        if(err) return res.status(500).json(err);
        return res.json({ message: "Gasto registrado" });
    });
});

app.delete('/gastos/:id', (req, res) => {
    const sql = "DELETE FROM gastos WHERE id = ?";
    db.query(sql, [req.params.id], (err, result) => {
        if(err) return res.status(500).json(err);
        return res.json({ message: "Gasto eliminado" });
    });
});

// ==========================================
//  📊 RUTAS DE REPORTES FINANCIEROS Y TRANSACCIONES
// ==========================================

// Endpoint para listar transacciones registradas
app.get('/reportes/transacciones', (req, res) => {
    const sql = "SELECT * FROM transactions ORDER BY date DESC, id DESC";
    db.query(sql, (err, data) => {
        if (err) {
            console.error("❌ Error al obtener transacciones:", err.message);
            return res.status(500).json({ success: false, error: err.message, data: [] });
        }
        return res.json(data);
    });
});

// Endpoint para obtener resumen financiero y desgloses
app.get('/reportes/resumen', (req, res) => {
    const sqlTx = "SELECT platform, SUM(amount) AS totalAmount, COUNT(*) AS totalSales FROM transactions GROUP BY platform ORDER BY totalAmount DESC";
    const sqlInv = "SELECT SUM(costo) AS totalInversion FROM inventario";
    const sqlTotalTx = "SELECT SUM(amount) AS liquidezTotal, COUNT(*) AS totalVentas FROM transactions";
    
    db.query(sqlTotalTx, (err, totalRows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        db.query(sqlInv, (err2, invRows) => {
            if (err2) return res.status(500).json({ success: false, error: err2.message });
            db.query(sqlTx, (err3, platRows) => {
                if (err3) return res.status(500).json({ success: false, error: err3.message });
                
                const liquidezTotal = Number(totalRows[0]?.liquidezTotal || 0);
                const totalVentas = Number(totalRows[0]?.totalVentas || 0);
                const inversionStock = Number(invRows[0]?.totalInversion || 0);
                const gananciaNeta = liquidezTotal - inversionStock;
                
                return res.json({
                    success: true,
                    liquidezTotal,
                    inversionStock,
                    gananciaNeta,
                    totalVentas,
                    desglosePlataformas: platRows
                });
            });
        });
    });
});

app.listen(PORT, () => { console.log(`🚀 Servidor escuchando en el puerto ${PORT}`); });