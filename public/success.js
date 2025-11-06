console.log("success.js loaded");
document.addEventListener("DOMContentLoaded", () => {
  const p = new URLSearchParams(location.search);
  const name  = p.get("name") || "You";
  const t     = p.get("trainer") || "";
  const c     = p.get("class") || "";
  const price = Number(p.get("price") || 0).toLocaleString();

  document.getElementById("d").innerHTML =
    `${name}, your ${c} session with <b>${t}</b> is recorded at <b>฿${price}</b>.`;
});
