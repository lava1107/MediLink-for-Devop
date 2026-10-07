import mysql from "mysql2/promise";
import { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } from "./env.js";

// Create MySQL connection pool
export const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

/**
 * Execute a query with parameters
 */
export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/**
 * Get a connection from the pool for transactions
 */
export async function getConnection() {
  return await pool.getConnection();
}

/**
 * Test MySQL connection
 */
export async function testConnection() {
  try {
    const [result] = await pool.query("SELECT 1 AS connected");
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export default {
  pool,
  query,
  getConnection,
  testConnection,
};
