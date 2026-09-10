let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
const LOC = { lat: 55.6761, lon: 12.5683 };
const cache = {};
const rainyCodes = [
  51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99,
];

document.getElementById("btnAddTodo").onclick = addTask;
render();

function save() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

function feedback(msg) {
  const box = document.getElementById("feedback");
  box.textContent = msg;
  setTimeout(() => (box.textContent = ""), 3000);
}

function addTask() {
  const text = document.getElementById("todoText").value.trim();
  const date = document.getElementById("todoDate").value;
  const outdoor = document.getElementById("outdoor").checked;
  if (!text) return feedback("Skriv en opgave først!");

  tasks.push({ id: Date.now(), task: text, date, outdoor, done: false });
  save();
  render();
  document.getElementById("todoText").value = "";
  feedback("Opgave tilføjet!");
}

function toggleDone(id) {
  tasks.find((t) => t.id === id).done ^= 1;
  save();
  render();
}

function del(id) {
  tasks = tasks.filter((t) => t.id !== id);
  save();
  render();
}

function render() {
  const todo = document.getElementById("todos");
  const done = document.getElementById("doneTodos");
  todo.innerHTML = done.innerHTML = "";

  tasks.forEach((t) => {
    const li = document.createElement("li");
    li.className = "task" + (t.done ? " done" : "");
    li.innerHTML = `
      <b>${escapeHtml(t.task)}</b>
      <p>${t.date || "ingen dato"} · ${t.outdoor ? "🌳 udendørs" : "🏠 indendørs"}</p>
      ${t.outdoor ? `<p class="weatherInfo" id="w${t.id}">Henter vejr…</p>` : ""}
      <button data-id="${t.id}" class="finish">${t.done ? "Fortryd" : "Færdig"}</button>
      <button data-id="${t.id}" class="del">Slet</button>`;
    li.querySelector(".finish").onclick = () => toggleDone(t.id);
    li.querySelector(".del").onclick = () => del(t.id);
    (t.done ? done : todo).appendChild(li);
    if (t.outdoor && t.date) checkWeather(t, li);
  });
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

async function checkWeather(t, li) {
  const el = li.querySelector(`#w${t.id}`);
  try {
    const w = await getWeather(t.date);
    if (!w) {
      el.textContent = "🌫️ Vejrdata ikke tilgængelig";
      return;
    }
    if (w.rainy) {
      el.textContent = `🌧️ ${w.text} – utilgængelig pga. regn`;
      li.classList.add("blocked");
    } else {
      el.textContent = `🌤️ ${w.text}`;
    }
  } catch {
    el.textContent = "⚠️ Kunne ikke hente vejr";
    feedback("Vejr-API fejlede, prøv igen senere.");
  }
}

async function getWeather(date) {
  if (date in cache) return cache[date];
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LOC.lat}&longitude=${LOC.lon}&daily=weathercode&timezone=auto&past_days=7&forecast_days=16`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("API-fejl");
  const data = await res.json();
  const i = data.daily.time.indexOf(date);
  if (i === -1) return (cache[date] = null);
  const code = data.daily.weathercode[i];
  return (cache[date] = {
    rainy: rainyCodes.includes(code),
    text: codeText(code),
  });
}

function codeText(c) {
  const m = {
    0: "Klart",
    1: "Mest klart",
    2: "Delvist skyet",
    3: "Overskyet",
    45: "Tåge",
    51: "Let støvregn",
    61: "Let regn",
    63: "Regn",
    65: "Kraftig regn",
    80: "Regnbyger",
    95: "Torden",
  };
  return m[c] || "Ukendt vejr";
}
