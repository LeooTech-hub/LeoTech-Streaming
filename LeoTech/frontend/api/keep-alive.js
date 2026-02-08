import mysql from 'mysql2/promise';

export default async function handler(request, response) {
  let connection;
  
  try {
    // Estas variables las configuraremos en el panel de Vercel en el paso 3
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,       
      user: process.env.DB_USER,       
      password: process.env.DB_PASSWORD, 
      database: process.env.DB_NAME,   
      port: 4000, // Puerto por defecto de TiDB
      ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
    });

    await connection.execute('SELECT 1');
    
    return response.status(200).json({ status: 'TiDB está despierto' });

  } catch (error) {
    console.error("Error despertando DB:", error);
    return response.status(500).json({ error: error.message });
  } finally {
    if (connection) await connection.end();
  }
}