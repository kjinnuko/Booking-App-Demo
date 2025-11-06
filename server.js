const express = require("express");
const session = require("express-session");
const path = require("path");
const { addUser, findUser, addBooking, listBookings } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

// Prices (THB)
const TRAINERS = {
  "John Carter": { class: "Strength", price: 1100 },
  "Sophia Miller": { class: "Yoga & Flexibility", price: 1300 },
  "Michael Brown": { class: "Cardio Fitness", price: 1800 },
  "Emma Wilson": { class: "CrossFit", price: 2000 },
  "Daniel Smith": { class: "Zumba & Dance", price: 1500 },
};

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: "fitness-secret-key",
    resave: false,
    saveUninitialized: true,
  })
);
app.use(express.static(path.join(__dirname, "public")));

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect("/login.html");
  next();
}

app.get("/", (_req, res) => res.redirect("/login.html"));
app.get("/trainers.html", requireLogin, (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "trainers.html"));
});
app.get("/booking.html", requireLogin, (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "booking.html"));
});

app.post("/login", async (req, res) => {
  const { name, password } = req.body;
  const user = await findUser(String(name).trim(), String(password).trim());
  if (user) {
    req.session.user = { id: user.id, name: user.name };
    res.redirect("/trainers.html");
  } else {
    res
      .status(401)
      .send("Invalid name or password. <a href='/login.html'>Back</a>");
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login.html"));
});

app.post("/book", requireLogin, async (req, res, next) => {
  try {
    console.log("Booking request body:", req.body);
    const user = req.session.user;
    const trainerName = String(req.body.trainer || "").trim();
    const klass = String(req.body.class || "").trim();
    const price = Number(req.body.price || 0);

    const meta = TRAINERS[trainerName] || {};
    const finalClass = klass || meta.class || "Unknown";
    const finalPrice = price || meta.price || 0;

    const bookingDate = String(req.body.date || req.query.date || "").trim(); // e.g. "2025-11-05"
    const timeSlotRaw = String(
      req.body.timeSlot || req.query.timeSlot || ""
    ).trim(); // e.g. "13:30–15:00"
    const startMatch = timeSlotRaw.match(/\d{1,2}:\d{2}/); // finds first "HH:MM"
    let bookedTimeIso = new Date().toISOString(); // fallback
    if (bookingDate && startMatch) {
      const startTime = startMatch[0]; // "13:30"
      const dt = new Date(`${bookingDate}T${startTime}:00`);
      if (!isNaN(dt)) bookedTimeIso = dt.toISOString();
    }

    const record = {
      userId: user.id,
      name: user.name,
      trainer: `${trainerName}`,
      klass: finalClass,
      price: finalPrice,
      createdAt: new Date().toISOString(),
      bookedTime: bookedTimeIso,
    };
    const { id } = await addBooking(record);

    const q = new URLSearchParams({
      id: String(id),
      name: user.name,
      trainer: trainerName,
      class: finalClass,
      price: String(finalPrice),
    }).toString();
    res.redirect(`/success.html?${q}`);
  } catch (err) {
    next(err);
  }
});

app.get("/admin", requireLogin, async (_req, res) => {
  const rows = await listBookings();
  const rowsHtml = rows
    .map(
      (b) => `
    <tr>
      <td>${b.id}</td>
      <td>${b.createdAt}</td>
      <td>${b.name}</td>
      <td>${b.trainer}</td>
      <td>${b.class}</td>
      <td>฿${Number(b.price).toLocaleString()}</td>
    </tr>`
    )
    .join("");
  res.send(`<!doctype html>
  <meta charset="utf-8"><title>Admin — Bookings</title>
  <style>
    body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;margin:20px}
    table{border-collapse:collapse;width:100%}
    th,td{border:1px solid #eee;padding:8px;text-align:left}
    th{background:#fafafa}
    form{display:inline}
    iframe{width:100vw;height:100dvh;border:none;margin-bottom:20px}
  </style>
  <iframe title="Neon" src="https://app.powerbi.com/reportEmbed?reportId=1ca8e813-b78f-4f33-89fb-fce0bfd4c64b&autoAuth=true&ctid=fd206715-7509-4ae5-9b96-76bb97886a84" frameborder="0" allowFullScreen="true"></iframe>
  <h1>Bookings (Admin)</h1>
  <p><a href="/trainers.html">← Trainers</a></p>
  <table>
    <thead><tr><th>ID</th><th>Date</th><th>User</th><th>Trainer</th><th>Class</th><th>Price (THB)</th></tr></thead>
    <tbody>${
      rowsHtml || "<tr><td colspan='6'>No bookings yet</td></tr>"
    }</tbody>
  </table>`);
});
app.get("/api/bookings", requireLogin, async (_req, res) => {
  const rows = await listBookings();
  res.json(rows);
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).send("Server error");
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${port}`);
});

app.post("/signup", async (req, res) => {
  console.log("Signup request body:", req.body);
  try {
    const name = String(req.body.name || "").trim();
    const password = String(req.body.password || "").trim();
    const phone = String(req.body.phone || "").trim();

    if (!name || !password || !phone) {
      return res
        .status(400)
        .send(
          "Name, password, and phone are required. <a href='/signup.html'>Back</a>"
        );
    }

    await addUser(name, password, phone);
    res.redirect("/login.html");
  } catch (e) {
    console.error(e);
    res
      .status(400)
      .send(
        "Sign-up failed (user may already exist). <a href='/signup.html'>Back</a>"
      );
  }
});

app.post("/login", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const password = String(req.body.password || "").trim();
  const user = await findUser(name, password);
  if (user) {
    // include phone in session (helpful later)
    req.session.user = {
      id: user.id,
      name: user.name,
      phone: user.phone || "",
    };
    res.redirect("/trainers.html");
  } else {
    res
      .status(401)
      .send("Invalid name or password. <a href='/login.html'>Back</a>");
  }
});
