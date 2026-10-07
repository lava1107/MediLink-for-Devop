import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, "../.env") });

const {
  DB_HOST = "localhost",
  DB_PORT = 3306,
  DB_USER = "root",
  DB_PASSWORD = "",
} = process.env;

async function setupDatabase() {
  console.log("==================================================");
  console.log("MediLink Database Setup");
  console.log("==================================================");
  console.log(`Connecting to MySQL at ${DB_HOST}:${DB_PORT} as user '${DB_USER}'...`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: Number(DB_PORT),
      user: DB_USER,
      password: DB_PASSWORD,
      multipleStatements: true,
    });
    console.log("Connected to MySQL server successfully.");

    const schemaPath = path.join(__dirname, "schema.sql");
    const seedPath = path.join(__dirname, "seed.sql");

    console.log("Executing schema.sql...");
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");
    await connection.query(schemaSql);
    console.log("Schema created successfully.");

    console.log("Executing seed.sql...");
    const seedSql = fs.readFileSync(seedPath, "utf-8");
    await connection.query(seedSql);
    console.log("Seed data imported successfully.");

    // Query summary
    const [tables] = await connection.query("SHOW TABLES FROM `medilink`;");
    console.log("==================================================");
    console.log(`Database 'medilink' initialized with ${tables.length} tables:`);
    for (const t of tables) {
      const tableName = Object.values(t)[0];
      const [[{ count }]] = await connection.query(`SELECT COUNT(*) as count FROM \`medilink\`.\`${tableName}\`;`);
      console.log(`  - ${tableName.padEnd(26)} : ${count} records`);
    }
    console.log("==================================================");
    console.log("Database setup complete!");
  } catch (error) {
    console.error("Database setup failed:", error.message);
    if (error.code === "ER_ACCESS_DENIED_ERROR") {
      console.error("\nPlease check the DB_PASSWORD in backend/.env file and ensure MySQL is running.");
    }
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

setupDatabase();
