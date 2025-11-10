import express from "express";
import cors from "cors";
import session from "express-session";

import {
  addUser,
  findUser,
  getUserById,
  addBooking,
  listBookings,
  listUserBookings,
  deleteBooking,
  updateBookingStatus,
  getClassById,
  listTrainers,
  User,
} from "./db";

// Extend Session type
declare module "express-session" {
  interface SessionData {
    user?: User;
  }
}

const app = express();
app.use(cors());
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { sameSite: "lax" },
  })
);

const asString = (v: any, msg: string) => {
  if (typeof v === "string" && v.trim() !== "") return v;
  throw new Error("Bad request: " + msg);
};

// =============================
// HEALTH
// =============================
app.get("/health", (_req, res) => {
  res.send("ok");
});

// =============================
// AUTH
// =============================
app.post("/api/register", async (req, res) => {
  try {
    const name = asString(req.body.name, "missing name");
    const password = asString(req.body.password, "missing password");
    const email = typeof req.body.email === "string" ? req.body.email : undefined;
    const phone = typeof req.body.phone === "string" ? req.body.phone : undefined;

    const { id } = await addUser(name, password, phone, email);

    res.json({ id });
  } catch (e: any) {
    res.status(400).send(e.message);
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const name = asString(req.body.name, "missing name");
    const password = asString(req.body.password, "missing password");

    const user = await findUser(name, password);
    if (!user) return res.status(401).send("Invalid name or password");

    req.session.user = user;
    res.json({ user });
  } catch (e: any) {
    res.status(400).send(e.message);
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.sendStatus(204));
});

app.get("/api/session", (req, res) => {
  res.json({ user: req.session.user ?? null });
});

// =============================
// TRAINERS
// =============================
app.get("/api/trainers", async (_req, res) => {
  const trainers = await listTrainers();
  res.json(trainers);
});

// =============================
// CLASSES
// =============================
app.get("/api/classes/:id", async (req, res) => {
  try {
    const id = asString(req.params.id, "missing id");
    const result = await getClassById(id);
    if (!result) return res.status(404).send("Not found");
    res.json(result);
  } catch (e: any) {
    res.status(400).send(e.message);
  }
});

// =============================
// BOOKINGS
// =============================
app.get("/api/bookings", async (_req, res) => {
  const rows = await listBookings();
  res.json(rows);
});

app.get("/api/my-bookings", async (req, res) => {
  try {
    const uid = asString(req.session.user?.id, "need login");
    const rows = await listUserBookings(uid);
    res.json(rows);
  } catch (e: any) {
    res.status(401).send(e.message);
  }
});

app.post("/api/bookings", async (req, res) => {
  try {
    const userId = req.session.user?.id ?? null;
    const name = asString(req.body.name, "missing name");
    const trainerId = asString(req.body.trainerId, "missing trainerId");
    const classId = asString(req.body.classId, "missing classId");

    const price = Number(req.body.price);
    if (Number.isNaN(price)) throw new Error("price must be number");

    const email =
      typeof req.body.email === "string" ? req.body.email : null;

    const bookedTime =
      typeof req.body.bookedTime === "string"
        ? req.body.bookedTime
        : undefined;

    const { id } = await addBooking({
      userId,
      name,
      email,
      trainerId,
      classId,
      price,
      bookedTime,
    });

    res.json({ id });
  } catch (e: any) {
    res.status(400).send(e.message);
  }
});

app.delete("/api/bookings/:id", async (req, res) => {
  try {
    const id = asString(req.params.id, "missing id");
    const userId = asString(req.session.user?.id, "need login");

    const n = await deleteBooking(id, userId);
    if (!n) return res.status(404).send("Not found");

    res.sendStatus(204);
  } catch (e: any) {
    res.status(400).send(e.message);
  }
});

app.patch("/api/bookings/:id/status", async (req, res) => {
  try {
    const id = asString(req.params.id, "missing id");
    const userId = asString(req.session.user?.id, "need login");

    const status = asString(req.body.status, "need status");

    const n = await updateBookingStatus(id, userId, status);
    if (!n) return res.status(404).send("not found");

    res.sendStatus(204);
  } catch (e: any) {
    res.status(400).send(e.message);
  }
});

// =============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✅ Server running at http://localhost:${PORT}`)
);
