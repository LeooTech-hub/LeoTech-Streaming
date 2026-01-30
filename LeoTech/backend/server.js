const express = require('express');
const cors = require('cors');
const mysql = require('mysql');
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
    host: 'gateway01.us-east-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '4Gd4wQkV7fDju6r.root',
    password: 'iaUJxe0wyfdOEI4o',
    database: 'test',
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
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
    // 5. Tabla de Gastos (NUEVO)
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
    const { nombre, correo, password } = req.body;
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
});

// 2. LOGIN
app.post('/login', (req, res) => {
    const { correo, password } = req.body;
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
});

// ==========================================
//        OTRAS RUTAS
// ==========================================

app.get('/clientes', (req, res) => { const sql = "SELECT * FROM suscripciones"; db.query(sql, (err, data) => res.json(err ? err : data)); });
app.post('/clientes', (req, res) => { const values = [req.body.nombre, req.body.celular, req.body.servicio, req.body.perfil, req.body.fecha_inicio, req.body.fecha_fin, req.body.monto, req.body.correo, req.body.contrasena, req.body.pin]; db.query("INSERT INTO suscripciones (nombre_cliente, numero_celular, servicio, perfil, fecha_inicio, fecha_finalizacion, monto, correo, contrasena, pin_perfil) VALUES (?)", [values], (err) => res.json(err ? err : "Cliente creado")); });
app.put('/update/:id', (req, res) => { const values = [req.body.nombre, req.body.celular, req.body.servicio, req.body.perfil, req.body.fecha_inicio, req.body.fecha_fin, req.body.monto, req.body.correo, req.body.contrasena, req.body.pin, req.params.id]; db.query("UPDATE suscripciones SET nombre_cliente=?, numero_celular=?, servicio=?, perfil=?, fecha_inicio=?, fecha_finalizacion=?, monto=?, correo=?, contrasena=?, pin_perfil=? WHERE id=?", values, (err) => res.json(err ? err : "Actualizado")); });
app.delete('/delete/:id', (req, res) => { db.query("DELETE FROM suscripciones WHERE id = ?", [req.params.id], (err) => res.json(err ? err : "Eliminado")); });

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
app.listen(PORT, () => { console.log(`🚀 Servidor escuchando en el puerto ${PORT}`); });