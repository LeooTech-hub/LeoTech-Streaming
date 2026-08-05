const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

const app = express();

app.use(cors());
app.use(express.json());

// ==========================================
//  🕵️‍♂️ MODO DETECTIVE (LOGGING)
// ==========================================
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
async function inicializarBaseDeDatos() {
    console.log("🔧 Verificando estado de la Base de Datos...");

    // 1. Tabla Ventas
    try {
        const sqlVentas = `CREATE TABLE IF NOT EXISTS registro_ventas (
            id INT AUTO_INCREMENT PRIMARY KEY, 
            producto_id INT, 
            nombre_producto VARCHAR(255), 
            cantidad INT NOT NULL, 
            precio_venta DECIMAL(10, 2), 
            ganancia DECIMAL(10, 2), 
            fecha_venta DATE, 
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;
        await db.query(sqlVentas);
    } catch (err) {
        console.error("❌ Error ventas:", err.message);
    }

    // 2. Columna Costo
    try {
        const sqlCosto = "ALTER TABLE productos ADD COLUMN costo DECIMAL(10, 2) DEFAULT 0";
        await db.query(sqlCosto);
    } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME' && err.errno !== 1060) console.error("⚠️ Nota costo:", err.message);
    }

    // 3. Columna Visible
    try {
        const sqlVisible = "ALTER TABLE productos ADD COLUMN visible TINYINT DEFAULT 1";
        await db.query(sqlVisible);
    } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME' && err.errno !== 1060) console.error("⚠️ Nota visible:", err.message);
    }

    // 4. Columna Rol
    try {
        const sqlRol = "ALTER TABLE usuarios ADD COLUMN rol VARCHAR(20) DEFAULT 'cliente'";
        await db.query(sqlRol);
        console.log("✅ Columna 'rol' verificada (Sistema de Jerarquía listo).");
    } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME' && err.errno !== 1060) console.error("⚠️ Nota rol:", err.message);
        else console.log("✅ Columna 'rol' verificada (Sistema de Jerarquía listo).");
    }

    // 5. Tabla de Gastos
    try {
        const sqlGastos = `CREATE TABLE IF NOT EXISTS gastos (
            id INT AUTO_INCREMENT PRIMARY KEY, 
            descripcion VARCHAR(255), 
            monto DECIMAL(10, 2), 
            fecha DATE, 
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;
        await db.query(sqlGastos);
        console.log("✅ Tabla 'gastos' verificada.");
    } catch (err) {
        console.error("❌ Error tabla gastos:", err.message);
    }

    // 6. Columnas de Soft Delete (Perfiles Eliminados)
    try {
        const sqlEliminado = "ALTER TABLE suscripciones ADD COLUMN eliminado TINYINT DEFAULT 0";
        await db.query(sqlEliminado);
        console.log("✅ Columna 'eliminado' creada exitosamente.");
    } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME' && err.errno !== 1060) {
            console.error("⚠️ Error columna eliminado:", err.message);
        } else {
            console.log("✅ Columna 'eliminado' verificada en la tabla suscripciones.");
        }
    }

    try {
        const sqlFechaEliminado = "ALTER TABLE suscripciones ADD COLUMN fecha_eliminacion DATETIME DEFAULT NULL";
        await db.query(sqlFechaEliminado);
        console.log("✅ Columna 'fecha_eliminacion' creada exitosamente.");
    } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME' && err.errno !== 1060) {
            console.error("⚠️ Error columna fecha_eliminacion:", err.message);
        } else {
            console.log("✅ Columna 'fecha_eliminacion' verificada en la tabla suscripciones.");
        }
    }

    // 7. Tabla Transactions (Reportes Financieros)
    try {
        const sqlTransactions = `CREATE TABLE IF NOT EXISTS transactions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            type VARCHAR(50) DEFAULT 'VENTA',
            amount DOUBLE DEFAULT 0,
            description VARCHAR(255) DEFAULT '',
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            platform VARCHAR(100) DEFAULT '',
            client_name VARCHAR(255) DEFAULT ''
        )`;
        await db.query(sqlTransactions);
        console.log("✅ Tabla 'transactions' verificada en TiDB Cloud.");
    } catch (err) {
        console.error("❌ Error creando tabla transactions:", err.message);
    }
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
        await db.query(sql, [nombre, correo, hashedPassword, rolAsignado]);

        enviarCorreoBienvenida(correo, nombre);

        return res.json({ message: "Usuario registrado con éxito" });
    } catch (error) {
        console.error("Error en registro:", error);
        return res.status(500).json({ error: error.message || "El correo ya existe o error en DB" });
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
        const [data] = await db.query(sql, [correo]);

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
    } catch (error) {
        console.error("Error en login:", error);
        return res.status(500).json({ status: "Error", message: error.message || "Error interno del servidor" });
    }
});

// ==========================================
//        RUTAS DE CLIENTES Y SUSCRIPCIONES
// ==========================================

app.get('/clientes', async (req, res) => { 
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        const sql = "SELECT * FROM suscripciones WHERE (eliminado = 0 OR eliminado IS NULL OR eliminado IS FALSE)"; 
        const [data] = await db.query(sql);

        const normalizedData = Array.isArray(data) ? data.map(item => ({
            ...item,
            eliminado: (item.eliminado == 1 || item.eliminado === true || item.eliminado === '1' || item.eliminado === 'true') ? 1 : 0
        })) : [];
        return res.json(normalizedData);
    } catch (err) {
        console.error("❌ Error en TiDB al consultar /clientes:", err.message);
        return res.status(500).json({ success: false, error: err.message, data: [] });
    }
});

// ==========================================
//  ⚡ ENDPOINT DE PING (KEEP-ALIVE)
// ==========================================
app.get('/ping', async (req, res) => {
    try {
        await db.query("SELECT 1");
        console.log("⚡ Ping exitoso a la base de datos.");
        return res.json({ status: "OK", message: "Servidor y base de datos activos" });
    } catch (err) {
        console.error("❌ Error de ping a la BD:", err.message);
        return res.status(500).json({ status: "Error", message: "Error al comunicar con la base de datos", error: err.message });
    }
});

// ==========================================
//  🛒 REGISTRO INTELIGENTE DE CLIENTES
// ==========================================
app.post('/clientes', async (req, res) => {
    try {
        const { nombre, celular, servicio, fecha_inicio, fecha_fin, monto, correo, contrasena, perfil, pin } = req.body;
        
        // Si se proporciona un correo manual, se mantiene el flujo de asignación tradicional
        if (correo && correo.trim() !== "") {
            const sqlInsert = "INSERT INTO suscripciones (nombre_cliente, numero_celular, servicio, perfil, fecha_inicio, fecha_finalizacion, monto, correo, contrasena, pin_perfil) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            const insertValues = [nombre, celular, servicio, perfil, fecha_inicio, fecha_fin, monto, correo, contrasena, pin];
            await db.query(sqlInsert, insertValues);

            const montoVal = Number(monto) || 0;
            if (montoVal > 0) {
                try {
                    await db.query(
                        "INSERT INTO transactions (type, amount, platform, client_name, description, date) VALUES ('VENTA', ?, ?, ?, 'Venta de perfil', NOW())",
                        [montoVal, servicio || 'Streaming', nombre || 'Cliente']
                    );
                    console.log(`💸 Transacción VENTA registrada en transactions para ${nombre}`);
                } catch (errTx) {
                    console.error("⚠️ Error registrando en transactions:", errTx.message);
                }
            }

            return res.json("Cliente creado");
        }

        // Flujo inteligente: Buscar y asignar cuenta y perfil disponible de forma automática
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

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
            
            const [accounts] = await connection.query(selectAccountSql, [servicio]);
            
            if (accounts.length === 0) {
                throw new Error(`No hay cuentas de ${servicio} en stock con perfiles disponibles (menos de 5 ocupados). Por favor, agregue una nueva cuenta vacía al stock.`);
            }

            const cuentaAsignada = accounts[0];
            const correoAsignado = cuentaAsignada.correo;
            const contrasenaAsignada = cuentaAsignada.contrasena;

            const [occupiedProfilesRows] = await connection.query(
                "SELECT perfil FROM suscripciones WHERE correo = ? AND servicio = ? AND fecha_finalizacion >= CURDATE() AND (eliminado = 0 OR eliminado IS NULL)",
                [correoAsignado, servicio]
            );
            
            const occupiedProfilesList = occupiedProfilesRows.map(row => (row.perfil || '').trim().toLowerCase());

            let perfilAsignado = "";
            const perfilesPosibles = ["Perfil 1", "Perfil 2", "Perfil 3", "Perfil 4", "Perfil 5"];
            for (let p of perfilesPosibles) {
                if (!occupiedProfilesList.includes(p.toLowerCase())) {
                    perfilAsignado = p;
                    break;
                }
            }
            
            if (!perfilAsignado) {
                perfilAsignado = `Perfil ${cuentaAsignada.ocupados + 1}`;
            }

            const pinAsignado = pin || '';

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

            await connection.query(insertSql, insertValues);
            const montoVal = Number(monto) || 0;
            if (montoVal > 0) {
                await connection.query(
                    "INSERT INTO transactions (type, amount, platform, client_name, description, date) VALUES ('VENTA', ?, ?, ?, 'Venta de perfil', NOW())",
                    [montoVal, servicio || 'Streaming', nombre || 'Cliente']
                );
                console.log(`💸 Transacción VENTA en stock automático registrada para ${nombre}`);
            }

            await connection.commit();
            console.log(`✅ Cliente registrado automáticamente en la cuenta ${correoAsignado} (${perfilAsignado})`);
            return res.json("Cliente creado");

        } catch (error) {
            await connection.rollback();
            console.error("❌ Error en la transacción de creación de cliente:", error.message);
            return res.json({ code: "TRANS_ERROR", sqlMessage: error.message });
        } finally {
            connection.release();
        }
    } catch (err) {
        console.error("❌ Error en POST /clientes:", err.message);
        return res.status(500).json({ error: err.message });
    }
});

// ==========================================
//  🔄 RENOVACIÓN RÁPIDA (+30 DÍAS)
// ==========================================
app.post('/clientes/renovar/:id', async (req, res) => {
    try {
        const clienteId = req.params.id;
        const { nombre_cliente, servicio, monto, fecha_finalizacion } = req.body || {};

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [rows] = await connection.query("SELECT * FROM suscripciones WHERE id = ? FOR UPDATE", [clienteId]);
            if (rows.length === 0) {
                throw new Error("Cliente no encontrado.");
            }

            const cliente = rows[0];
            
            const finalNombre = (nombre_cliente !== undefined && String(nombre_cliente).trim() !== '') 
                ? String(nombre_cliente).trim() 
                : (cliente.nombre_cliente || cliente.nombre || 'Cliente');

            const finalServicio = (servicio !== undefined && String(servicio).trim() !== '') 
                ? String(servicio).trim() 
                : (cliente.servicio || 'Streaming');
            
            let precioMensual = (monto !== undefined && monto !== '' && !isNaN(Number(monto))) 
                ? Number(monto) 
                : (Number(cliente.monto) || 0);

            if (precioMensual < 0) {
                throw new Error("El monto de renovación no puede ser negativo.");
            }

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
            const nuevoMontoAcumulado = Number(cliente.monto || 0) + precioMensual;
            
            await connection.query(
                "UPDATE suscripciones SET nombre_cliente = ?, fecha_inicio = ?, fecha_finalizacion = ?, monto = ?, estado = 'activo' WHERE id = ?",
                [finalNombre, fechaInicioStr, fechaFinStr, nuevoMontoAcumulado, clienteId]
            );

            await connection.query(
                "INSERT INTO transactions (type, amount, platform, client_name, description, date) VALUES ('RENOVACION', ?, ?, ?, 'Renovación mensual de perfil', NOW())",
                [precioMensual, finalServicio, finalNombre]
            );
            console.log(`💸 Transacción RENOVACION registrada en transactions para ${finalNombre} por S/ ${precioMensual}`);

            const insertVentaSql = `
                INSERT INTO registro_ventas (producto_id, nombre_producto, cantidad, precio_venta, ganancia, fecha_venta)
                VALUES (?, ?, 1, ?, ?, ?)
            `;
            const nombreProductoVenta = `Renovación: ${finalServicio} - ${finalNombre}`;
            await connection.query(insertVentaSql, [clienteId, nombreProductoVenta, precioMensual, precioMensual, fechaInicioStr]);

            await connection.commit();
            console.log(`✅ Suscripción de ${finalNombre} renovada hasta ${fechaFinStr}. Nuevo monto total acumulado: S/ ${nuevoMontoAcumulado}`);
            return res.json({ 
                status: "Success", 
                message: "Suscripción renovada con éxito",
                nuevaFecha: fechaFinStr,
                monto: precioMensual 
            });

        } catch (error) {
            await connection.rollback();
            console.error("❌ Error en la transacción de renovación:", error.message);
            return res.status(500).json({ error: error.message });
        } finally {
            connection.release();
        }
    } catch (err) {
        console.error("❌ Error en POST /clientes/renovar/:id:", err.message);
        return res.status(500).json({ error: err.message });
    }
});

// Endpoint /api/renovar para POST y PUT
const handleRenovarApi = async (req, res) => {
    try {
        const { id, monto, cliente_nombre, plataforma } = req.body || {};

        if (!id) {
            return res.status(400).json({ success: false, message: 'Falta el ID del perfil para procesar la renovación.' });
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            await connection.query(
                "UPDATE profiles SET fecha_vencimiento = DATE_ADD(NOW(), INTERVAL 30 DAY), cliente_nombre = ? WHERE id = ?",
                [cliente_nombre, id]
            );

            await connection.query(
                "INSERT INTO transactions (type, amount, platform, client_name, description, date) VALUES ('RENOVACION', ?, ?, ?, 'Renovación de perfil', NOW())",
                [monto, plataforma, cliente_nombre]
            );

            await connection.commit();
            console.log(`[AUDIT EXPRES /api/renovar] Perfil ID ${id} renovado exitosamente para ${cliente_nombre}.`);

            return res.status(200).json({
                success: true,
                message: 'Perfil renovado exitosamente'
            });
        } catch (error) {
            await connection.rollback();
            console.error('[AUDIT EXPRES /api/renovar] Error en la renovación:', error.message);
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor al procesar la renovación',
                error: error.message
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('[AUDIT EXPRES /api/renovar] Error general:', error.message);
        return res.status(500).json({ success: false, message: 'Error interno del servidor al procesar la renovación', error: error.message });
    }
};

app.post('/api/renovar', handleRenovarApi);
app.put('/api/renovar', handleRenovarApi);

// ==========================================
//  📅 AUTOMATIZACIÓN DE NOTIFICACIONES
// ==========================================
app.get('/api/cron/notificaciones-vencimiento', async (req, res) => {
    try {
        console.log("⏰ Iniciando revisión de vencimientos (<= 48 horas)...");
        
        const sql = `
            SELECT id, nombre_cliente, numero_celular, servicio, perfil, fecha_finalizacion, monto
            FROM suscripciones
            WHERE fecha_finalizacion BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 2 DAY)
              AND (estado = 'activo' OR estado IS NULL)
              AND (eliminado = 0 OR eliminado IS NULL)
        `;
        
        const [clientes] = await db.query(sql);
        console.log(`🔍 Se encontraron ${clientes.length} clientes por vencer en las próximas 48 horas.`);
        
        const envios = [];
        
        for (let cliente of clientes) {
            const celular = cliente.numero_celular || '';
            if (!celular) {
                console.log(`⚠️ El cliente ${cliente.nombre_cliente} no tiene celular registrado. Saltando.`);
                continue;
            }

            const fechaFin = new Date(cliente.fecha_finalizacion);
            const fechaFormateada = `${String(fechaFin.getDate()).padStart(2, '0')}/${String(fechaFin.getMonth() + 1).padStart(2, '0')}/${fechaFin.getFullYear()}`;
            
            const mensaje = `Hola *${cliente.nombre_cliente}*, te saluda LeoTech. 👋 Tu cuenta de *${cliente.servicio}* (Perfil: *${cliente.perfil}*) vence el *${fechaFormateada}*. ¿Desearías renovarla para continuar con el servicio sin interrupciones? 🚀`;
            
            const WSP_API_URL = process.env.WSP_API_URL || 'http://localhost:8080';
            const WSP_API_KEY = process.env.WSP_API_KEY || 'YOUR_GLOBAL_API_KEY';
            const WSP_INSTANCE = process.env.WSP_INSTANCE || 'leotech_instance';
            
            let enviado = false;
            let errorEnvio = null;

            try {
                const numeroLimpio = celular.replace(/\D/g, '');
                const numeroDestino = numeroLimpio.startsWith('51') ? numeroLimpio : `51${numeroLimpio}`;
                
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
                    signal: AbortSignal.timeout(8000)
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
    } catch (err) {
        console.error("❌ Error crítico en cron notificaciones:", err);
        return res.status(500).json({ error: err.message });
    }
});

app.put('/update/:id', async (req, res) => { 
    try {
        const values = [req.body.nombre, req.body.celular, req.body.servicio, req.body.perfil, req.body.fecha_inicio, req.body.fecha_fin, req.body.monto, req.body.correo, req.body.contrasena, req.body.pin, req.params.id]; 
        await db.query("UPDATE suscripciones SET nombre_cliente=?, numero_celular=?, servicio=?, perfil=?, fecha_inicio=?, fecha_finalizacion=?, monto=?, correo=?, contrasena=?, pin_perfil=? WHERE id=?", values);
        return res.json("Actualizado");
    } catch (err) {
        console.error("❌ Error en PUT /update/:id:", err.message);
        return res.status(500).json({ error: err.message });
    }
});

// ==========================================
//  🗑️ SOFT DELETE, RESTAURAR Y HARD DELETE (PERFILES / CLIENTES)
// ==========================================

const softDeleteProfile = async (req, res) => {
    try {
        const rawId = req.params.id;
        const profileId = parseInt(rawId, 10);
        const targetId = isNaN(profileId) ? rawId : profileId;

        if (!targetId) {
            console.error("❌ Error Soft Delete: ID de perfil no proporcionado o inválido.");
            return res.status(400).json({ success: false, error: "ID de perfil no proporcionado o inválido" });
        }

        console.log(`🗑️ Iniciando Soft Delete para Perfil ID: ${targetId}`);
        const sql = "UPDATE suscripciones SET eliminado = TRUE, fecha_eliminacion = NOW() WHERE id = ?";
        
        const [result] = await db.query(sql, [targetId]);
        
        if (result.affectedRows === 0) {
            console.warn(`⚠️ Soft Delete: No se encontró ningún perfil activo con ID ${targetId}`);
            return res.status(404).json({ success: false, error: "Perfil no encontrado" });
        }

        console.log(`✅ Soft Delete exitoso. Perfil ID ${targetId} movido a la Papelera.`);
        return res.json({ success: true, message: "Perfil movido a la Papelera con éxito", affectedRows: result.affectedRows });
    } catch (err) {
        console.error(`❌ Error en TiDB al realizar Soft Delete en perfil ID ${req.params.id}:`, err.message);
        return res.status(500).json({ success: false, error: "Error de BD TiDB: " + err.message });
    }
};

const restoreProfile = async (req, res) => {
    try {
        const rawId = req.params.id;
        const profileId = parseInt(rawId, 10);
        const targetId = isNaN(profileId) ? rawId : profileId;

        if (!targetId) {
            console.error("❌ Error Restaurar: ID de perfil no proporcionado o inválido.");
            return res.status(400).json({ success: false, error: "ID de perfil no proporcionado o inválido" });
        }

        console.log(`🔄 Iniciando Restauración para Perfil ID: ${targetId}`);
        const sql = "UPDATE suscripciones SET eliminado = FALSE, fecha_eliminacion = NULL WHERE id = ?";
        
        const [result] = await db.query(sql, [targetId]);

        if (result.affectedRows === 0) {
            console.warn(`⚠️ Restauración: No se encontró ningún perfil con ID ${targetId}`);
            return res.status(404).json({ success: false, error: "Perfil no encontrado" });
        }

        console.log(`✅ Restauración exitosa. Perfil ID ${targetId} restaurado a la lista principal.`);
        return res.json({ success: true, message: "Perfil restaurado con éxito", affectedRows: result.affectedRows });
    } catch (err) {
        console.error(`❌ Error en TiDB al restaurar perfil ID ${req.params.id}:`, err.message);
        return res.status(500).json({ success: false, error: "Error de BD TiDB: " + err.message });
    }
};

const hardDeleteProfile = async (req, res) => {
    try {
        const rawId = req.params.id;
        const profileId = parseInt(rawId, 10);
        const targetId = isNaN(profileId) ? rawId : profileId;

        if (!targetId) {
            console.error("❌ Error Destruir: ID de perfil no proporcionado o inválido.");
            return res.status(400).json({ success: false, error: "ID de perfil no proporcionado o inválido" });
        }

        console.log(`💥 Iniciando Hard Delete (Eliminación permanente) para Perfil ID: ${targetId}`);
        const sql = "DELETE FROM suscripciones WHERE id = ?";
        
        const [result] = await db.query(sql, [targetId]);

        if (result.affectedRows === 0) {
            console.warn(`⚠️ Hard Delete: No se encontró ningún perfil con ID ${targetId}`);
            return res.status(404).json({ success: false, error: "Perfil no encontrado" });
        }

        console.log(`✅ Perfil ID ${targetId} eliminado permanentemente.`);
        return res.json({ success: true, message: "Perfil eliminado permanentemente", affectedRows: result.affectedRows });
    } catch (err) {
        console.error(`❌ Error en TiDB al eliminar permanentemente perfil ID ${req.params.id}:`, err.message);
        return res.status(500).json({ success: false, error: "Error de BD TiDB: " + err.message });
    }
};

const getDeletedProfiles = async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        const sql = "SELECT * FROM suscripciones WHERE (eliminado = 1 OR eliminado IS TRUE) ORDER BY fecha_eliminacion DESC";
        const [data] = await db.query(sql);

        const normalizedData = Array.isArray(data) ? data.map(item => ({
            ...item,
            eliminado: (item.eliminado == 1 || item.eliminado === true || item.eliminado === '1' || item.eliminado === 'true') ? 1 : 0
        })) : [];

        console.log(`[API /clientes/eliminados] Se enviaron ${normalizedData.length} registros de la papelera desde TiDB.`);
        return res.json(normalizedData);
    } catch (err) {
        console.error("❌ Error en TiDB al consultar perfiles eliminados:", err.message);
        return res.status(500).json({ success: false, error: err.message, data: [] });
    }
};

// --- RUTAS CLIENTES ---
app.delete('/delete/:id', softDeleteProfile);
app.get('/clientes/eliminados', getDeletedProfiles);
app.put('/clientes/restaurar/:id', restoreProfile);
app.delete('/clientes/destruir/:id', hardDeleteProfile);

// --- RUTAS ALIAS COMPATIBILIDAD PERFILES (/profiles) ---
app.get('/profiles', async (req, res) => { 
    try {
        const sql = "SELECT * FROM suscripciones WHERE (eliminado = 0 OR eliminado IS NULL)";
        const [data] = await db.query(sql);
        return res.json(data);
    } catch (err) {
        console.error("❌ Error en TiDB al consultar /profiles:", err.message);
        return res.status(500).json({ success: false, error: err.message, data: [] });
    }
});
app.get('/profiles/eliminados', getDeletedProfiles);
app.delete('/profiles/:id', softDeleteProfile);
app.put('/profiles/restaurar/:id', restoreProfile);
app.delete('/profiles/destruir/:id', hardDeleteProfile);

// ==========================================
//  🛒 RUTAS PRODUCTOS
// ==========================================
app.get('/productos', async (req, res) => { 
    try {
        const [data] = await db.query("SELECT * FROM productos");
        return res.json(data);
    } catch (err) {
        console.error("Error en GET /productos:", err.message);
        return res.status(500).json({ error: err.message });
    }
});

app.post('/productos/registrar', async (req, res) => { 
    try {
        const { nombre, precio, costo, categoria, imagen_url, descripcion, stock, oferta, visible } = req.body; 
        await db.query(
            'INSERT INTO productos (nombre, precio, costo, categoria, imagen_url, descripcion, stock, oferta, visible) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', 
            [nombre, precio, costo || 0, categoria, imagen_url, descripcion || '', stock || 10, oferta ? 1 : 0, visible ? 1 : 0]
        );
        return res.send('Registrado'); 
    } catch (err) {
        console.error("Error en POST /productos/registrar:", err.message);
        return res.status(500).json({ error: err.message });
    }
});

app.put('/productos/actualizar/:id', async (req, res) => { 
    try {
        const { nombre, precio, costo, categoria, imagen_url, descripcion, stock, oferta, visible } = req.body; 
        await db.query(
            'UPDATE productos SET nombre=?, precio=?, costo=?, categoria=?, imagen_url=?, descripcion=?, stock=?, oferta=?, visible=? WHERE id=?', 
            [nombre, precio, costo || 0, categoria, imagen_url, descripcion, stock, oferta ? 1 : 0, visible ? 1 : 0, req.params.id]
        );
        return res.send('Actualizado'); 
    } catch (err) {
        console.error("Error en PUT /productos/actualizar/:id:", err.message);
        return res.status(500).json({ error: err.message });
    }
});

app.delete('/productos/eliminar/:id', async (req, res) => { 
    try {
        await db.query("DELETE FROM productos WHERE id = ?", [req.params.id]);
        return res.json("Eliminado"); 
    } catch (err) {
        console.error("Error en DELETE /productos/eliminar/:id:", err.message);
        return res.status(500).json({ error: err.message });
    }
});

// ==========================================
//  📦 RUTAS INVENTARIO
// ==========================================
app.get('/inventario', async (req, res) => { 
    try {
        const [data] = await db.query("SELECT * FROM inventario");
        return res.json(data);
    } catch (err) {
        console.error("Error en GET /inventario:", err.message);
        return res.status(500).json({ error: err.message });
    }
});

app.post('/inventario', async (req, res) => { 
    try {
        const values = [req.body.correo, req.body.contrasena, req.body.servicio, req.body.costo || 0, req.body.fecha_entrada, req.body.fecha_vencimiento]; 
        await db.query("INSERT INTO inventario (correo, contrasena, servicio, costo, fecha_entrada, fecha_vencimiento) VALUES (?, ?, ?, ?, ?, ?)", values);
        return res.json("Agregado"); 
    } catch (err) {
        console.error("Error en POST /inventario:", err.message);
        return res.status(500).json({ error: err.message });
    }
});

app.put('/inventario/:id', async (req, res) => { 
    try {
        const values = [req.body.correo, req.body.contrasena, req.body.servicio, req.body.costo || 0, req.body.fecha_entrada, req.body.fecha_vencimiento, req.params.id]; 
        await db.query("UPDATE inventario SET correo=?, contrasena=?, servicio=?, costo=?, fecha_entrada=?, fecha_vencimiento=? WHERE id=?", values);
        return res.json("Actualizado"); 
    } catch (err) {
        console.error("Error en PUT /inventario/:id:", err.message);
        return res.status(500).json({ error: err.message });
    }
});

app.delete('/inventario/:id', async (req, res) => { 
    try {
        await db.query("DELETE FROM inventario WHERE id = ?", [req.params.id]);
        return res.json("Eliminado"); 
    } catch (err) {
        console.error("Error en DELETE /inventario/:id:", err.message);
        return res.status(500).json({ error: err.message });
    }
});

// ==========================================
//  🔄 RENOVACIÓN DE STOCK (INVENTARIO PROVEEDORES)
// ==========================================
const handleRenovarStockApi = async (req, res) => {
    try {
        const { id, costo, servicio, correo } = req.body || {};

        if (!id) {
            return res.status(400).json({ success: false, message: 'Falta el ID de la cuenta de stock para renovar.' });
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [rows] = await connection.query("SELECT * FROM inventario WHERE id = ? FOR UPDATE", [id]);
            if (rows.length === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: 'Cuenta de stock no encontrada.' });
            }

            const stock = rows[0];
            const finalCosto = (costo !== undefined && costo !== '' && !isNaN(Number(costo))) 
                ? Number(costo) 
                : Number(stock.costo || 0);
            const finalServicio = (servicio && String(servicio).trim() !== '') ? String(servicio).trim() : (stock.servicio || 'Proveedor');
            const finalCorreo = (correo && String(correo).trim() !== '') ? String(correo).trim() : (stock.correo || 'Stock');

            // 1. Sumar 30 días a la fecha de vencimiento actual de la cuenta de stock
            await connection.query(
                "UPDATE inventario SET fecha_vencimiento = DATE_ADD(IF(fecha_vencimiento IS NULL OR fecha_vencimiento < NOW(), NOW(), fecha_vencimiento), INTERVAL 30 DAY) WHERE id = ?",
                [id]
            );

            // 2. Registrar en la tabla de gastos
            const descripcionGasto = `Renovación de Stock Proveedor - ${finalServicio} (${finalCorreo})`;
            await connection.query(
                "INSERT INTO gastos (descripcion, monto, fecha) VALUES (?, ?, NOW())",
                [descripcionGasto, finalCosto]
            );

            // 3. Registrar también en transactions para reportes financieros integrados
            try {
                await connection.query(
                    "INSERT INTO transactions (type, amount, platform, client_name, description, date) VALUES ('GASTO_STOCK', ?, ?, ?, ?, NOW())",
                    [finalCosto, finalServicio, finalCorreo, descripcionGasto]
                );
            } catch (errTx) {
                console.error("⚠️ Error registrando en transactions para GASTO_STOCK:", errTx.message);
            }

            await connection.commit();
            console.log(`✅ Stock renovado para ${finalCorreo} (${finalServicio}) por 30 días. Costo: S/ ${finalCosto}`);

            return res.status(200).json({
                success: true,
                message: 'Stock renovado exitosamente'
            });
        } catch (error) {
            await connection.rollback();
            console.error('❌ Error en transacción de renovación de stock:', error.message);
            return res.status(500).json({
                success: false,
                message: 'Error interno al procesar la renovación de stock',
                error: error.message
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('❌ Error general en /api/inventario/renovar:', error.message);
        return res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
    }
};

app.post('/api/inventario/renovar', handleRenovarStockApi);
app.post('/inventario/renovar', handleRenovarStockApi);

// ==========================================
//  💵 RUTAS VENTAS
// ==========================================
app.get('/ventas', async (req, res) => { 
    try {
        const [data] = await db.query("SELECT * FROM registro_ventas ORDER BY id DESC");
        return res.json(data);
    } catch (err) {
        if (err && err.code === 'ER_NO_SUCH_TABLE') return res.json([]);
        console.error("Error en GET /ventas:", err.message);
        return res.status(500).json({ error: err.message });
    }
});

app.post('/ventas', async (req, res) => { 
    try {
        const values = [req.body.productoId, req.body.nombreProducto, req.body.cantidad, req.body.precioVenta, req.body.ganancia, req.body.fecha]; 
        await db.query("INSERT INTO registro_ventas (producto_id, nombre_producto, cantidad, precio_venta, ganancia, fecha_venta) VALUES (?, ?, ?, ?, ?, ?)", values);
        return res.json({ Status: "Registrada" });
    } catch (err) {
        console.error("Error en POST /ventas:", err.message);
        return res.status(500).json({ error: err.message });
    }
});

app.put('/ventas/:id', async (req, res) => { 
    try {
        const values = [req.body.cantidad, req.body.precioVenta, req.body.ganancia, req.body.fecha, req.params.id]; 
        await db.query("UPDATE registro_ventas SET cantidad=?, precio_venta=?, ganancia=?, fecha_venta=? WHERE id=?", values);
        return res.json({ Status: "Actualizada" });
    } catch (err) {
        console.error("Error en PUT /ventas/:id:", err.message);
        return res.status(500).json({ error: err.message });
    }
});

app.delete('/ventas/:id', async (req, res) => { 
    try {
        await db.query("DELETE FROM ventas WHERE id = ?", [req.params.id]);
        return res.json({ Status: "Eliminada" });
    } catch (err) {
        console.error("Error en DELETE /ventas/:id:", err.message);
        return res.status(500).json({ error: err.message });
    }
});

// ==========================================
//  💸 RUTAS DE GASTOS
// ==========================================
app.get('/gastos', async (req, res) => {
    try {
        const [data] = await db.query("SELECT * FROM gastos ORDER BY fecha DESC");
        return res.json(data);
    } catch (err) {
        console.error("Error en GET /gastos:", err.message);
        return res.status(500).json({ error: err.message });
    }
});

app.post('/gastos', async (req, res) => {
    try {
        const { descripcion, monto, fecha } = req.body;
        const sql = "INSERT INTO gastos (descripcion, monto, fecha) VALUES (?, ?, ?)";
        await db.query(sql, [descripcion, monto, fecha]);
        return res.json({ message: "Gasto registrado" });
    } catch (err) {
        console.error("Error en POST /gastos:", err.message);
        return res.status(500).json({ error: err.message });
    }
});

app.delete('/gastos/:id', async (req, res) => {
    try {
        const sql = "DELETE FROM gastos WHERE id = ?";
        await db.query(sql, [req.params.id]);
        return res.json({ message: "Gasto eliminado" });
    } catch (err) {
        console.error("Error en DELETE /gastos/:id:", err.message);
        return res.status(500).json({ error: err.message });
    }
});

// ==========================================
//  📊 RUTAS DE REPORTES FINANCIEROS Y TRANSACCIONES
// ==========================================

app.get('/reportes/transacciones', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, type, amount, description, date, platform, client_name FROM transactions ORDER BY date DESC');
        return res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener transacciones:', error);
        return res.status(500).json({ error: error.message });
    }
});

app.get('/reportes/resumen', async (req, res) => {
    try {
        const sqlTotalTx = "SELECT SUM(amount) AS liquidezTotal, COUNT(*) AS totalVentas FROM transactions";
        const sqlInv = "SELECT SUM(costo) AS totalInversion FROM inventario";
        const sqlTx = "SELECT platform, SUM(amount) AS totalAmount, COUNT(*) AS totalSales FROM transactions GROUP BY platform ORDER BY totalAmount DESC";

        const [totalRows] = await db.query(sqlTotalTx);
        const [invRows] = await db.query(sqlInv);
        const [platRows] = await db.query(sqlTx);
        
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
    } catch (err) {
        console.error("Error en GET /reportes/resumen:", err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => { console.log(`🚀 Servidor escuchando en el puerto ${PORT}`); });