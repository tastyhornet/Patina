// hall of neglect — lists tabs by how long they've been ignored, plus the settings.

const $ = (id) => document.getElementById(id);
const names = ["Fresh", "Faded", "Dusty", "Cracked", "Crumbling"];

function fmtage(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m neglected`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h neglected`;
  return `${Math.floor(h / 24)}d neglected`;
}

function send(msg) {
  return new Promise((res) => chrome.runtime.sendMessage(msg, res));
}

// fall back to a little parchment square when a tab has no favicon
function favfor(t) {
  if (t.favIconUrl && /^https?:/.test(t.favIconUrl)) return t.favIconUrl;
  return "data:image/svg+xml," + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16'><rect width='16' height='16' rx='3' fill='%23c3b192'/></svg>"
  );
}

async function render() {
  const data = await send({ type: "GET_DASHBOARD" });
  const s = data.settings;

  $("enabled").checked = s.enabled;
  $("threshold").value = String(s.threshold);
  $("intensity").value = s.intensity;
  $("intensityVal").textContent = Math.round(s.intensity * 100) + "%";
  $("stripdecay").checked = s.stripdecay !== false;

  const list = $("list");
  list.innerHTML = "";
  const rotting = data.list.filter((t) => t.stage >= 1);
  const shown = rotting.length ? rotting : data.list.slice(0, 8);
  $("empty").hidden = data.list.length > 0;

  for (const t of shown) {
    const li = document.createElement("li");
    if (t.stage >= 1) li.classList.add("decayed");

    const fav = document.createElement("img");
    fav.className = "fav";
    fav.src = favfor(t);
    fav.onerror = () => (fav.style.visibility = "hidden");

    const meta = document.createElement("div");
    meta.className = "meta";
    const title = document.createElement("div");
    title.className = "t";
    title.textContent = t.title;
    const age = document.createElement("div");
    age.className = "age";
    age.textContent = t.active ? "open now" : fmtage(t.age);
    meta.append(title, age);

    const chip = document.createElement("span");
    chip.className = "chip s" + t.stage;
    chip.textContent = names[t.stage];

    li.append(fav, meta, chip);
    li.addEventListener("click", async () => {
      await send({ type: "FOCUS_TAB", tabId: t.id, windowId: t.windowId });
      window.close();
    });
    list.append(li);
  }
}

async function save() {
  const settings = {
    enabled: $("enabled").checked,
    threshold: Number($("threshold").value),
    intensity: Number($("intensity").value),
    stripdecay: $("stripdecay").checked,
  };
  await send({ type: "SET_SETTINGS", settings });
  render();
}

$("enabled").addEventListener("change", save);
$("threshold").addEventListener("change", save);
$("stripdecay").addEventListener("change", save);
$("intensity").addEventListener("input", () => {
  $("intensityVal").textContent = Math.round(Number($("intensity").value) * 100) + "%";
});
$("intensity").addEventListener("change", save);

render();
