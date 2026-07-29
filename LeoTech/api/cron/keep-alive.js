import mysql from 'mysql2/promise';

export default async function handler(request, response) {
  let connection;
  
  // Fallbacks using the hardcoded credentials in server.js
  const dbConfig = {
    host: process.env.DB_HOST || 'gateway01.us-east-1.prod.aws.tidbcloud.com',
    port: parseInt(process.env.DB_PORT || '4000', 10),
    user: process.env.DB_USER || '4Gd4wQkV7fDju6r.root',
    password: process.env.DB_PASSWORD || 'iaUJxe0wyfdOEI4o',
    database: process.env.DB_NAME || 'test',
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 10000 // 10s timeout
  };

  try {
    console.log("Waking up TiDB Database...");
    connection = await mysql.createConnection(dbConfig);
    await connection.execute('SELECT 1');
    console.log("TiDB Database is awake!");

    // Also wake up the Render backend to prevent its cold start
    const backendUrl = process.env.BACKEND_URL || 'https://leotech-backend.onrender.com';
    console.log(`Pinging Render Backend at: ${backendUrl}/ping`);
    try {
      const res = await fetch(`${backendUrl}/ping`, { signal: AbortSignal.timeout(5000) });
      console.log(`Render backend responded with status: ${res.status}`);
    } catch (backendError) {
      console.warn("Could not reach Render backend (might be sleeping or booting):", backendError.message);
    }
    
    return response.status(200).json({ 
      status: 'success', 
      message: 'TiDB Serverless database and Render backend successfully kept alive.' 
    });

  } catch (error) {
    console.error("Error keeping services alive:", error);
    return response.status(500).json({ 
      status: 'error', 
      error: error.message 
    });
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (err) {
        console.error("Error closing connection:", err);
      }
    }
  }
}
