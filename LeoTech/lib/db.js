import mysql from 'mysql2/promise';

let pool;

export function getDbPool() {
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

export default getDbPool();
