const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
require("dotenv").config(); // load .env when present

const CONNECTION_STRING = process.env.DATABASE_URL;

const pool = new Pool({ connectionString: CONNECTION_STRING });

// initialize schema
(async () => {
  const client = await pool.connect();
  try {
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        "userId" UUID REFERENCES users(id),
        name TEXT NOT NULL,
        trainer TEXT NOT NULL,
        "class" TEXT NOT NULL,
        price INTEGER NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "bookedTime" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
  } finally {
    client.release();
  }
})().catch((err) => {
  console.error("DB init error:", err);
  process.exit(1);
});

// helpers
async function addUser(name, password, phone) {
  const hashed = await bcrypt.hash(String(password), 10);
  const res = await pool.query(
    `INSERT INTO users (name, password, phone) VALUES ($1, $2, $3) RETURNING id`,
    [name, hashed, phone]
  );
  return { id: res.rows[0].id };
}

async function findUser(name, password) {
  const res = await pool.query(`SELECT * FROM users WHERE name=$1`, [name]);
  const user = res.rows[0];
  if (!user) return null;
  const ok = await bcrypt.compare(String(password), user.password || "");
  if (!ok) return null;
  delete user.password;
  return user;
}

async function addBooking({
  userId,
  name,
  trainer,
  klass,
  price,
  createdAt,
  bookedTime,
}) {
  const res = await pool.query(
    `INSERT INTO bookings ("userId", name, trainer, "class", price, "createdAt", "bookedTime")
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [
      userId || null,
      name,
      trainer,
      klass,
      price,
      createdAt || new Date().toISOString(),
      bookedTime,
    ]
  );
  return { id: res.rows[0].id };
}

async function listBookings() {
  const res = await pool.query(
    `SELECT * FROM bookings ORDER BY "createdAt" DESC`
  );
  return res.rows;
}

module.exports = { addUser, findUser, addBooking, listBookings };
