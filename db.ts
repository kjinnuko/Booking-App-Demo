import { Pool } from "pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config(); // load .env when present

const CONNECTION_STRING = process.env.DATABASE_URL || "";

const pool = new Pool({ connectionString: CONNECTION_STRING });

// =============================
// DB init & migrations
// =============================
(async () => {
  const client = await pool.connect();
  try {
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // Users table (เพิ่ม gmail)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        gmail TEXT,          -- ✅ เพิ่มคอลัมน์ gmail
        phone TEXT,
        role TEXT DEFAULT 'user'
      );
    `);

    // ถ้าไม่มีคอลัมน์ gmail ให้เพิ่ม (รองรับ DB เก่า)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'gmail'
        ) THEN
          ALTER TABLE users ADD COLUMN gmail TEXT;
        END IF;
      END $$;
    `);

    // Classes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS classes (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        price INTEGER NOT NULL,
        about TEXT NOT NULL,
        syllabus JSONB NOT NULL,
        level TEXT NOT NULL,
        length TEXT NOT NULL,
        group_size TEXT NOT NULL
      );
    `);

    // Trainers table (เอา class_id ออก ใช้ class_name แทน)
    await client.query(`
      CREATE TABLE IF NOT EXISTS trainers (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        class_name TEXT NOT NULL,   -- ✅ ใช้ชื่อคลาสแทนการอ้างอิง id
        schedule JSONB NOT NULL
      );
    `);

    // Migration: ถ้าเคยมี class_id ให้ย้ายข้อมูล -> class_name แล้วค่อยลบ
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'trainers' AND column_name = 'class_id'
        ) THEN
          -- เพิ่มคอลัมน์ชั่วคราวถ้ายังไม่มี
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'trainers' AND column_name = 'class_name'
          ) THEN
            ALTER TABLE trainers ADD COLUMN class_name TEXT;
          END IF;

          -- เติมค่า class_name จาก classes.id
          UPDATE trainers t
          SET class_name = c.name
          FROM classes c
          WHERE t.class_id = c.id AND t.class_name IS NULL;

          -- ลบคอลัมน์เก่า
          ALTER TABLE trainers DROP COLUMN class_id;
        END IF;
      END $$;
    `);

    // Bookings table (เพิ่ม gmail)
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        "userId" UUID REFERENCES users(id) ON DELETE CASCADE,
        "trainerId" INTEGER REFERENCES trainers(id) ON DELETE CASCADE,
        "classId" INTEGER REFERENCES classes(id) ON DELETE CASCADE,
        gmail TEXT,                 -- ✅ เพิ่มคอลัมน์ gmail
        name TEXT NOT NULL,
        price INTEGER NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "bookedTime" TIMESTAMP NOT NULL DEFAULT NOW(),
        status TEXT DEFAULT 'booked' CHECK (status IN ('booked', 'cancelled', 'finished'))
      );
    `);

    // ถ้าไม่มีคอลัมน์ gmail ใน bookings ให้เพิ่ม
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'bookings' AND column_name = 'gmail'
        ) THEN
          ALTER TABLE bookings ADD COLUMN gmail TEXT;
        END IF;
      END $$;
    `);

    // ถ้า bookings ไม่มีคอลัมน์ status ให้เพิ่ม
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'bookings' AND column_name = 'status'
        ) THEN
          ALTER TABLE bookings ADD COLUMN status TEXT DEFAULT 'booked' CHECK (status IN ('booked', 'cancelled', 'finished'));
        END IF;
      END $$;
    `);

    // ---------- Seed data ----------
    const classData = [
      {
        name: "Strength",
        price: 1100,
        about:
          "Certified strength coach focusing on safe barbell technique, progressive overload and core stability.",
        syllabus: [
          "Foundations: bracing & breathing",
          "Squat, bench, deadlift fundamentals",
          "Accessory work for shoulders & hips",
          "Progressive overload & deloads",
          "Recovery, mobility, & injury prevention",
        ],
        level: "Beginner–Intermediate",
        length: "60–75 minutes",
        group_size: "Up to 8",
      },
      {
        name: "Yoga & Flexibility",
        price: 1300,
        about:
          "Yoga instructor emphasizing posture alignment, breathwork, and mobility for daily life and stress relief.",
        syllabus: [
          "Breathwork & warm-up flows",
          "Alignment in standing poses",
          "Hip & hamstring mobility",
          "Core engagement & balance",
          "Guided relaxation & mindfulness",
        ],
        level: "All levels",
        length: "60 minutes",
        group_size: "Up to 12",
      },
      {
        name: "Cardio Fitness",
        price: 1800,
        about:
          "Cardio & conditioning coach. Mix of Zone-2 endurance with interval work for fat-burn and stamina.",
        syllabus: [
          "Heart-rate zones & tracking",
          "Interval & tempo sessions",
          "Low-impact conditioning circuits",
          "Plyometrics (optional, scalable)",
          "Cool-downs & mobility",
        ],
        level: "Beginner–Advanced (scaled)",
        length: "60–75 minutes",
        group_size: "Up to 10",
      },
      {
        name: "CrossFit",
        price: 2000,
        about:
          "CrossFit Level 2 coach. Functional strength & conditioning with safe scaling for all athletes.",
        syllabus: [
          "Skill focus (kettlebell, gymnastics, O-lifting)",
          "Strength segment (e.g., 5×5, EMOM)",
          "WOD: mixed modal conditioning",
          "Movement quality & scaling",
          "Mobility & recovery tips",
        ],
        level: "Intermediate–Advanced (scaled for beginners)",
        length: "75 minutes",
        group_size: "Up to 12",
      },
      {
        name: "Zumba & Dance",
        price: 1500,
        about:
          "High-energy Zumba instructor. Calorie-burning choreography with easy moves and great music.",
        syllabus: [
          "Warm-up & rhythm basics",
          "Latin & pop combos",
          "Cardio peaks & recovery tracks",
          "Light toning & core finishers",
          "Stretch & cooldown",
        ],
        level: "All levels (no dance experience needed)",
        length: "60 minutes",
        group_size: "Up to 20",
      },
    ];

    for (const c of classData) {
      await client.query(
        `INSERT INTO classes (name, price, about, syllabus, level, length, group_size)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (name) DO NOTHING`,
        [
          c.name,
          c.price,
          c.about,
          JSON.stringify(c.syllabus),
          c.level,
          c.length,
          c.group_size,
        ],
      );
    }

    // Trainers data (ใช้ class_name)
    const trainerData = [
      {
        name: "John Carter",
        class_name: "Strength",
        schedule: ["Mon 09:00–11:00", "Thu 09:00–11:00"],
      },
      {
        name: "Sophia Miller",
        class_name: "Yoga & Flexibility",
        schedule: ["Tue 11:30–13:00", "Fri 11:30–13:00"],
      },
      {
        name: "Michael Brown",
        class_name: "Cardio Fitness",
        schedule: ["Wed 13:30–15:00", "Sat 13:30–15:00"],
      },
      {
        name: "Emma Wilson",
        class_name: "CrossFit",
        schedule: ["Thu 15:30–17:00", "Sun 15:30–17:00"],
      },
      {
        name: "Daniel Smith",
        class_name: "Zumba & Dance",
        schedule: ["Fri 17:30–19:00", "Sun 17:30–19:00"],
      },
    ];

    for (const t of trainerData) {
      await client.query(
        `INSERT INTO trainers (name, class_name, schedule)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO NOTHING`,
        [t.name, t.class_name, JSON.stringify(t.schedule)],
      );
    }
  } catch (err) {
    console.error("DB init error:", err);
    throw err;
  } finally {
    client.release();
  }
})().catch((err) => {
  console.error("DB init error:", err);
  process.exit(1);
});

// =============================
// Types
// =============================
export interface User {
  id: string;
  name: string;
  gmail?: string | null;  // ✅ ใช้ gmail
  phone?: string | null;
  role: string;
}

export interface BookingInput {
  userId?: string | null;
  name: string;
  gmail?: string | null;          // ✅ เพิ่ม gmail ใน booking input
  trainerId: string;
  classId: string;
  price: number;
  createdAt?: string;
  bookedTime?: string;
}

// =============================
// Helpers
// =============================

// ✅ addUser รองรับ gmail (แทน email เดิม)
export async function addUser(
  name: string,
  password: string,
  phone?: string,
  gmail?: string,
): Promise<{ id: string }> {
  const hashed = await bcrypt.hash(String(password), 10);
  const res = await pool.query(
    `INSERT INTO users (name, password, gmail, phone) VALUES ($1, $2, $3, $4) RETURNING id`,
    [name, hashed, gmail || null, phone || null],
  );
  return { id: res.rows[0].id };
}

export async function findUser(
  name: string,
  password: string,
): Promise<User | null> {
  const res = await pool.query(`SELECT * FROM users WHERE name=$1`, [name]);
  const userRow = res.rows[0];
  if (!userRow) return null;
  const ok = await bcrypt.compare(String(password), userRow.password || "");
  if (!ok) return null;
  return {
    id: userRow.id,
    name: userRow.name,
    gmail: userRow.gmail ?? null,   // ✅ คืน gmail
    phone: userRow.phone ?? null,
    role: userRow.role,
  };
}

export async function getUserById(id: string): Promise<User | null> {
  const res = await pool.query(`SELECT * FROM users WHERE id=$1`, [id]);
  const userRow = res.rows[0];
  if (!userRow) return null;
  return {
    id: userRow.id,
    name: userRow.name,
    gmail: userRow.gmail ?? null,   // ✅ คืน gmail
    phone: userRow.phone ?? null,
    role: userRow.role,
  };
}

export async function addBooking(input: BookingInput): Promise<{ id: string }> {
  const { userId, name, gmail, trainerId, classId, price, createdAt, bookedTime } =
    input;
  const res = await pool.query(
    `INSERT INTO bookings ("userId", name, gmail, "trainerId", "classId", price, "createdAt", "bookedTime")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      userId || null,
      name,
      gmail || null,                           // ✅ เก็บ gmail
      Number(trainerId),
      Number(classId),
      price,
      createdAt || new Date().toISOString(),
      bookedTime || new Date().toISOString(),
    ],
  );
  return { id: String(res.rows[0].id) };
}

export async function listBookings(): Promise<any[]> {
  const res = await pool.query(`
    SELECT b.id, b.name, b.gmail, b."createdAt", b."bookedTime", b.price, b.status, 
           t.name as trainer, t.class_name as trainer_class, 
           c.name as class
    FROM bookings b
    JOIN trainers t ON b."trainerId" = t.id
    JOIN classes c ON b."classId" = c.id
    ORDER BY b."createdAt" DESC
  `);
  return res.rows;
}

export async function listUserBookings(userId: string): Promise<any[]> {
  const res = await pool.query(
    `
    SELECT b.id, b.name, b.gmail, b."createdAt", b."bookedTime", b.price, b.status, 
           t.name as trainer, t.class_name as trainer_class,
           c.name as class
    FROM bookings b
    JOIN trainers t ON b."trainerId" = t.id
    JOIN classes c ON b."classId" = c.id
    WHERE b."userId" = $1
    ORDER BY b."createdAt" DESC
  `,
    [userId],
  );
  return res.rows;
}

export async function deleteBooking(
  id: string,
  userId: string,
): Promise<number> {
  const result = await pool.query(
    `UPDATE bookings SET status = 'cancelled' WHERE id = $1 AND "userId" = $2`,
    [id, userId],
  );
  return result.rowCount || 0;
}

export async function updateBookingStatus(
  id: string,
  userId: string,
  status: 'booked' | 'cancelled' | 'finished',
): Promise<number> {
  const result = await pool.query(
    `UPDATE bookings SET status = $3 WHERE id = $1 AND "userId" = $2`,
    [id, userId, status],
  );
  return result.rowCount || 0;
}

export async function getClassById(id: string): Promise<any | null> {
  const res = await pool.query(`SELECT * FROM classes WHERE id = $1`, [id]);
  if (res.rows.length === 0) return null;
  return res.rows[0];
}

// ✅ ปรับ listTrainers ให้เข้ากับ schema ใหม่ (class_name)
export async function listTrainers(): Promise<any[]> {
  const res = await pool.query(`
    SELECT 
      t.id, t.name, t.class_name, t.schedule,
      c.id as class_id, c.name as class_name_db, c.price, c.about, c.syllabus, c.level, c.length, c.group_size
    FROM trainers t
    LEFT JOIN classes c ON c.name = t.class_name
    ORDER BY t.name
  `);
  return res.rows.map((row) => ({
    id: row.id,
    name: row.name,
    class: row.class_name,          // จาก trainers.class_name
    classId: row.class_id || null,  // จาก classes.id (ถ้าชื่อแมทช์)
    price: row.price || null,
    about: row.about || null,
    syllabus: row.syllabus || [],
    schedule: row.schedule,
    level: row.level || null,
    length: row.length || null,
    group_size: row.group_size || null,
  }));
}

interface PowerBILinks {
  id: number;
  link: string;
}

// (คงไว้ตามเดิม; ถ้าไม่มีตาราง links ก็จะคืน null)
export async function getPowerBIEmbedLinks(): Promise<PowerBILinks | null> {
  try {
    const res = await pool.query(`SELECT * FROM links WHERE id = 1`);
    return res.rows[0] || null;
  } catch {
    return null;
  }
}

export async function checkExistingBooking(
  userId: string,
  trainerId: string,
  bookedTime: string,
): Promise<any | null> {
  const res = await pool.query(
    `SELECT b.id, b."bookedTime", t.name as trainer, c.name as class
     FROM bookings b
     JOIN trainers t ON b."trainerId" = t.id
     JOIN classes c ON b."classId" = c.id
     WHERE b."userId" = $1 
     AND b."trainerId" = $2 
     AND b."bookedTime" = $3
     AND b.status = 'booked'`,
    [userId, trainerId, bookedTime],
  );
  return res.rows.length > 0 ? res.rows[0] : null;
}
