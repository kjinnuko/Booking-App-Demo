console.log("booking.js loaded");

// ----------------- Helpers -----------------
function qp(key) {
  return new URLSearchParams(location.search).get(key) || "";
}
function toISODate(d) { return d.toISOString().slice(0, 10); }
function parseISODate(s) { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); }
function weekdayKeyFromDateStr(iso) {
  return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][parseISODate(iso).getDay()];
}

// ----------------- Weekly schedules per trainer -----------------
// EXACTLY as requested in your message:
const WEEKLY = {
  "John Carter": {
    Mon: ["09:00–11:00"],
    Thu: ["09:00–11:00"],
  },
  "Sophia Miller": {
    Tue: ["11:30–13:00"],
    Fri: ["11:30–13:00"],
  },
  "Michael Brown": {
    Wed: ["13:30–15:00"],
    Sat: ["13:30–15:00"],
  },
  "Emma Wilson": {
    Thu: ["15:30–17:00"],
    Sun: ["15:30–17:00"],
  },
  "Daniel Smith": {
    Fri: ["17:30–19:00"],
    Sun: ["17:30–19:00"],
  },
};

// ----------------- UI fillers -----------------
function setDateBounds() {
  const input = document.getElementById("date");
  const today = new Date();
  const max = new Date(today);
  max.setDate(today.getDate() + 45);
  input.min = toISODate(today);
  input.max = toISODate(max);
}

function findNextAvailableDate(trainer, startISO) {
  const sched = WEEKLY[trainer] || {};
  let d = parseISODate(startISO);
  for (let i = 0; i < 60; i++) {
    const iso = toISODate(d);
    const wk = weekdayKeyFromDateStr(iso);
    if (sched[wk] && sched[wk].length) return iso;
    d.setDate(d.getDate() + 1);
  }
  return startISO; // fallback
}

function fillTimeOptionsForDate(trainer, isoDate) {
  const timeSel = document.getElementById("timeSlot");
  const note = document.getElementById("scheduleNote");
  const btn = document.getElementById("bookBtn");

  timeSel.innerHTML = '<option value="">Choose a time</option>';

  const sched = WEEKLY[trainer] || {};
  const wk = weekdayKeyFromDateStr(isoDate);
  const slots = sched[wk] || [];

  if (slots.length) {
    slots.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      timeSel.appendChild(opt);
    });
    note.textContent = `Available on ${wk}: ${slots.join(", ")}`;
    btn.disabled = false;
    btn.style.opacity = 1;
  } else {
    note.textContent = `No classes on ${wk} for ${trainer}. Pick another day.`;
    btn.disabled = true;
    btn.style.opacity = 0.6;
  }
}

// (Optional) if the user picks an invalid day, auto-snap to next valid
function snapToNextIfInvalid(trainer) {
  const dateEl = document.getElementById("date");
  const iso = dateEl.value;
  const sched = WEEKLY[trainer] || {};
  const wk = weekdayKeyFromDateStr(iso);
  if (!sched[wk] || !sched[wk].length) {
    const next = findNextAvailableDate(trainer, iso);
    if (next !== iso) {
      dateEl.value = next;
      fillTimeOptionsForDate(trainer, next);
    }
  }
}

// ----------------- Init -----------------
document.addEventListener("DOMContentLoaded", () => {
  let trainer = qp("trainer");
  let klass   = qp("klass");
  let price   = qp("price");
  let dateQ   = qp("date");
  let timeQ   = qp("time");

  if (!trainer) trainer = localStorage.getItem("selectedTrainer") || "";
  if (!klass)   klass   = localStorage.getItem("selectedKlass")   || "";
  if (!price)   price   = localStorage.getItem("selectedPrice")   || "";

  document.getElementById("trainer").value = trainer;
  document.getElementById("klass").value   = klass;
  document.getElementById("price").value   = price;

  setDateBounds();

  const todayISO = toISODate(new Date());
  let defaultISO = dateQ || findNextAvailableDate(trainer, todayISO);
  document.getElementById("date").value = defaultISO;

  fillTimeOptionsForDate(trainer, defaultISO);
  if (timeQ) {
    const sel = document.getElementById("timeSlot");
    const has = Array.from(sel.options).some(o => o.value === timeQ);
    if (has) sel.value = timeQ;
  }

  // Refresh time slots when the date changes
  document.getElementById("date").addEventListener("change", (e) => {
    fillTimeOptionsForDate(trainer, e.target.value);
    // optional snap to next valid day
    setTimeout(() => snapToNextIfInvalid(trainer), 400);
  });
});
