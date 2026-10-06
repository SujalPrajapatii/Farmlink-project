import pool from "./config/db.js";

async function verify() {
  const [tables] = await pool.execute("SHOW TABLES");
  console.log("=== Complete List of Database Tables and Row Counts ===");
  for (const t of tables) {
    const tableName = Object.values(t)[0];
    const [[{ count }]] = await pool.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
    console.log(tableName.padEnd(28) + " : " + count + " rows");
  }

  console.log("\n=== Registered Foreign Keys in Database ===");
  const [fks] = await pool.execute(`
    SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE REFERENCED_TABLE_NAME IS NOT NULL AND TABLE_SCHEMA = DATABASE()
    ORDER BY TABLE_NAME
  `);
  for (const fk of fks) {
    console.log(`${fk.TABLE_NAME}.${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME} [${fk.CONSTRAINT_NAME}]`);
  }

  process.exit(0);
}

verify().catch((e) => {
  console.error(e);
  process.exit(1);
});
