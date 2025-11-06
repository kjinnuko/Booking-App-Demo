console.log("trainers.js loaded (rich)");

/**
 * Rich trainer data
 * - prices in THB (as you asked)
 * - long "about"
 * - syllabus (what you learn)
 * - schedule
 * - level, class length, group size
 */
const TRAINERS = [
  {
    name: "John Carter",
    cls: "Strength",
    price: 1100,
    about:
      "Certified strength coach focusing on safe barbell technique, progressive overload and core stability.",
    syllabus: [
      "Foundations: bracing & breathing",
      "Squat, bench, deadlift fundamentals",
      "Accessory work for shoulders & hips",
      "Progressive overload & deloads",
      "Recovery, mobility, & injury prevention"
    ],
    schedule: ["Mon 09:00–11:00", "Thu 09:00–11:00"],
    level: "Beginner–Intermediate",
    length: "60–75 minutes",
    groupSize: "Up to 8"
  },
  {
    name: "Sophia Miller",
    cls: "Yoga & Flexibility",
    price: 1300,
    about:
      "Yoga instructor emphasizing posture alignment, breathwork, and mobility for daily life and stress relief.",
    syllabus: [
      "Breathwork & warm-up flows",
      "Alignment in standing poses",
      "Hip & hamstring mobility",
      "Core engagement & balance",
      "Guided relaxation & mindfulness"
    ],
    schedule: ["Tue 11:30–13:00", "Fri 11:30–13:00"],
    level: "All levels",
    length: "60 minutes",
    groupSize: "Up to 12"
  },
  {
    name: "Michael Brown",
    cls: "Cardio Fitness",
    price: 1800,
    about:
      "Cardio & conditioning coach. Mix of Zone-2 endurance with interval work for fat-burn and stamina.",
    syllabus: [
      "Heart-rate zones & tracking",
      "Interval & tempo sessions",
      "Low-impact conditioning circuits",
      "Plyometrics (optional, scalable)",
      "Cool-downs & mobility"
    ],
    schedule: ["Wed 13:30–15:00", "Sat 13:30–15:00"],
    level: "Beginner–Advanced (scaled)",
    length: "60–75 minutes",
    groupSize: "Up to 10"
  },
  {
    name: "Emma Wilson",
    cls: "CrossFit",
    price: 2000,
    about:
      "CrossFit Level 2 coach. Functional strength & conditioning with safe scaling for all athletes.",
    syllabus: [
      "Skill focus (kettlebell, gymnastics, O-lifting)",
      "Strength segment (e.g., 5×5, EMOM)",
      "WOD: mixed modal conditioning",
      "Movement quality & scaling",
      "Mobility & recovery tips"
    ],
    schedule: ["Thu 15:30–17:00", "Sun 15:30–17:00"],
    level: "Intermediate–Advanced (scaled for beginners)",
    length: "75 minutes",
    groupSize: "Up to 12"
  },
  {
    name: "Daniel Smith",
    cls: "Zumba & Dance",
    price: 1500,
    about:
      "High-energy Zumba instructor. Calorie-burning choreography with easy moves and great music.",
    syllabus: [
      "Warm-up & rhythm basics",
      "Latin & pop combos",
      "Cardio peaks & recovery tracks",
      "Light toning & core finishers",
      "Stretch & cooldown"
    ],
    schedule: ["Fri 17:30–19:00", "Sun 17:30–19:00"],
    level: "All levels (no dance experience needed)",
    length: "60 minutes",
    groupSize: "Up to 20"
  }
];

function thb(n) {
  return "฿" + Number(n).toLocaleString();
}

function renderTrainers() {
  const root = document.getElementById("trainers");
  if (!root) return;
  root.innerHTML = "";

  TRAINERS.forEach((t, i) => {
    const card = document.createElement("div");
    card.className = "card-trainer";

    card.innerHTML = `
      <h3>${t.name}</h3>
      <div class="meta">
        <span class="badge">${t.level}</span>
        <span class="badge">${t.length}</span>
        <span class="badge">Group: ${t.groupSize}</span>
      </div>

      <p style="margin:10px 0">${t.about}</p>

      <p><b>${t.cls}</b> — <span class="price">${thb(t.price)}</span></p>

      <details class="details">
        <summary>View class syllabus & schedule</summary>
        <div class="grid">
          <div>
            <b>What you'll learn</b>
            <ul>
              ${t.syllabus.map(li => `<li>${li}</li>`).join("")}
            </ul>
          </div>
          <div>
            <b>Schedule</b>
            <ul>
              ${t.schedule.map(s => `<li>${s}</li>`).join("")}
            </ul>
          </div>
        </div>
      </details>

      <div style="margin-top:12px">
        <button class="btn primary book-btn" data-idx="${i}">
          Book ${t.name}
        </button>
      </div>
    `;
    root.appendChild(card);
  });

  root.addEventListener("click", (e) => {
    const btn = e.target.closest(".book-btn");
    if (!btn) return;
    const t = TRAINERS[btn.dataset.idx];
    const url = `/booking.html?trainer=${encodeURIComponent(t.name)}&class=${encodeURIComponent(t.cls)}&price=${t.price}`;
    location.href = url;
  });
}

document.addEventListener("DOMContentLoaded", renderTrainers);

// trainers.js — inside your Book button click handler
const date = new Date().toISOString().slice(0,10); // today
const time = "18:00–19:00"; // pick any from SLOTS[klass]
location.href = `/booking.html?trainer=${encodeURIComponent(t.name)}&klass=${encodeURIComponent(t.klass)}&price=${t.price}&date=${date}&time=${encodeURIComponent(time)}`;
