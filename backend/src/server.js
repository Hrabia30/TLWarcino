import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { authRequired, requireRole, hashPassword, signToken, verifyPassword } from "./auth.js";
import { initDb } from "./initDb.js";
import { query } from "./db.js";

const app = express();

app.use(
  cors({
    origin: config.frontendUrl
  })
);
app.use(express.json());

app.get("/health", async (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { fullName, email, password, department } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "Wymagane sa imie, email i haslo." });
    }

    const existingUser = await query("SELECT id FROM users WHERE email = $1", [email]);
    if (existingUser.rowCount > 0) {
      return res.status(409).json({ message: "Uzytkownik o tym adresie juz istnieje." });
    }

    const passwordHash = await hashPassword(password);
    const result = await query(
      `
        INSERT INTO users (full_name, email, password_hash, department)
        VALUES ($1, $2, $3, $4)
        RETURNING id, full_name, email, role, department, created_at
      `,
      [fullName, email, passwordHash, department || null]
    );

    const user = result.rows[0];
    const token = signToken(user);
    return res.status(201).json({ token, user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Nie udalo sie zalozyc konta." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Podaj email i haslo." });
    }

    const result = await query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rowCount === 0) {
      return res.status(401).json({ message: "Nieprawidlowy login lub haslo." });
    }

    const user = result.rows[0];
    const validPassword = await verifyPassword(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ message: "Nieprawidlowy login lub haslo." });
    }

    const token = signToken(user);
    return res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Nie udalo sie zalogowac." });
  }
});

app.get("/api/auth/me", authRequired, async (req, res) => {
  try {
    const result = await query(
      `
        SELECT id, full_name, email, role, department, created_at
        FROM users
        WHERE id = $1
      `,
      [req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Uzytkownik nie istnieje." });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Nie udalo sie pobrac profilu." });
  }
});

app.get("/api/users/it", authRequired, async (_req, res) => {
  try {
    const result = await query(
      "SELECT id, full_name, email FROM users WHERE role = 'it' ORDER BY full_name"
    );
    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Nie udalo sie pobrac listy IT." });
  }
});

app.get("/api/tickets", authRequired, async (req, res) => {
  try {
    const params = [];
    let whereClause = "";

    if (req.user.role !== "it") {
      params.push(req.user.id);
      whereClause = "WHERE t.created_by = $1";
    }

    const result = await query(
      `
        SELECT
          t.*,
          creator.full_name AS created_by_name,
          assignee.full_name AS assigned_to_name
        FROM tickets t
        JOIN users creator ON creator.id = t.created_by
        LEFT JOIN users assignee ON assignee.id = t.assigned_to
        ${whereClause}
        ORDER BY
          CASE t.priority
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            ELSE 4
          END,
          t.created_at DESC
      `,
      params
    );

    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Nie udalo sie pobrac zgloszen." });
  }
});

app.post("/api/tickets", authRequired, async (req, res) => {
  try {
    const { title, description, category, priority, location, deviceName } = req.body;

    if (!title || !description || !category || !priority) {
      return res.status(400).json({ message: "Uzupelnij wymagane pola formularza." });
    }

    const result = await query(
      `
        INSERT INTO tickets (title, description, category, priority, location, device_name, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [title, description, category, priority, location || null, deviceName || null, req.user.id]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Nie udalo sie dodac zgloszenia." });
  }
});

app.put("/api/tickets/:id", authRequired, requireRole("it"), async (req, res) => {
  try {
    const { status, assignedTo } = req.body;
    const ticketId = Number(req.params.id);
    const hasAssignedTo = Object.prototype.hasOwnProperty.call(req.body, "assignedTo");

    const result = await query(
      `
        UPDATE tickets
        SET
          status = COALESCE($1, status),
          assigned_to = CASE
            WHEN $2 THEN $3::int
            ELSE assigned_to
          END
        WHERE id = $4
        RETURNING *
      `,
      [status || null, hasAssignedTo, assignedTo ?? null, ticketId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Nie znaleziono zgloszenia." });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Nie udalo sie zaktualizowac zgloszenia." });
  }
});

app.get("/api/dashboard/stats", authRequired, requireRole("it"), async (_req, res) => {
  try {
    const [ticketsCount, usersCount, openCount] = await Promise.all([
      query("SELECT COUNT(*)::int AS count FROM tickets"),
      query("SELECT COUNT(*)::int AS count FROM users"),
      query("SELECT COUNT(*)::int AS count FROM tickets WHERE status != 'resolved'")
    ]);

    return res.json({
      tickets: ticketsCount.rows[0].count,
      users: usersCount.rows[0].count,
      openTickets: openCount.rows[0].count
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Nie udalo sie pobrac statystyk." });
  }
});

async function start() {
  let lastError;

  for (let attempt = 1; attempt <= 15; attempt += 1) {
    try {
      await initDb();
      app.listen(config.port, () => {
        console.log(`Backend listening on port ${config.port}`);
      });
      return;
    } catch (error) {
      lastError = error;
      console.log(`Proba polaczenia z baza ${attempt}/15 nieudana. Ponawiam...`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  throw lastError;
}

start().catch((error) => {
  console.error("Nie udalo sie uruchomic backendu:", error);
  process.exit(1);
});
