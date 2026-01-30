const nodemailer = require('nodemailer');

// Tu configuración
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'leotechpuc@gmail.com',
    pass: 'pftypnffozeskaow' // Tu clave sin espacios
  },
  tls: { rejectUnauthorized: false }
});

async function probar() {
  console.log("⏳ Intentando enviar correo de prueba...");
  try {
    const info = await transporter.sendMail({
      from: '"Test LeoTech" <leotechpuc@gmail.com',
      to: 'padillalvanjoseph@gmail.com', // Se envía a ti mismo para probar
      subject: 'Prueba de Funcionalidad',
      text: 'Si lees esto, el sistema de correos funciona perfecto.'
    });
    console.log("✅ ¡ÉXITO! Correo enviado. ID:", info.messageId);
  } catch (error) {
    console.log("❌ ERROR DETALLADO:");
    console.error(error);
  }
}

probar();   