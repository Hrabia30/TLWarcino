import { hashPassword } from "./auth.js";
import { query } from "./db.js";
import { config } from "./config.js";

export async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(120) NOT NULL,
      email VARCHAR(160) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      department VARCHAR(120),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS tickets (
      id SERIAL PRIMARY KEY,
      title VARCHAR(180) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(80) NOT NULL,
      priority VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'new',
      location VARCHAR(160),
      device_name VARCHAR(160),
      created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  await query(`DROP TRIGGER IF EXISTS set_ticket_updated_at ON tickets;`);

  await query(`
    CREATE TRIGGER set_ticket_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);

  const existingItUser = await query("SELECT id FROM users WHERE email = $1", [
    config.seedItEmail
  ]);

  if (existingItUser.rowCount === 0) {
    const passwordHash = await hashPassword(config.seedItPassword);

    await query(
      `
        INSERT INTO users (full_name, email, password_hash, role, department)
        VALUES ($1, $2, $3, 'it', $4)
      `,
      ["Administrator IT", config.seedItEmail, passwordHash, "IT"]
    );
  }
}
