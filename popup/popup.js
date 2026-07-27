// popup entry — wires the controls to saved settings
import { render, send, $ } from "./render.js";

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
