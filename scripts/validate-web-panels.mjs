import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Script } from "node:vm";

const panelFiles = [
  "web-panels/index.html",
  "web-panels/board/index.html",
  "web-panels/dispatch/index.html",
];

function fail(message) {
  console.error("FAIL:", message);
  process.exitCode = 1;
}

let compiledScripts = 0;

for (const file of panelFiles) {
  let html;
  try {
    html = await readFile(file, "utf8");
  } catch {
    fail("No se pudo leer el archivo requerido: " + file);
    continue;
  }

  if (!/^<!doctype html>/i.test(html.trimStart())) {
    fail(file + ": falta el doctype HTML.");
  }
  if (!/<html\b/i.test(html) || !/<\/html>\s*$/i.test(html)) {
    fail(file + ": el documento HTML parece incompleto.");
  }

  const scriptTags = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  scriptTags.forEach((match, index) => {
    const attributes = match[1] ?? "";
    const source = match[2] ?? "";
    if (/\bsrc\s*=/i.test(attributes) || !source.trim()) return;

    try {
      new Script(source, { filename: file + ":inline-script-" + (index + 1) });
      compiledScripts += 1;
    } catch (error) {
      fail(file + ": error de sintaxis en script inline: " + error.message);
    }
  });

  const hrefPattern = /\bhref\s*=\s*["']([^"']+)["']/gi;
  for (const match of html.matchAll(hrefPattern)) {
    const href = match[1];
    if (/^(?:[a-z]+:)?\/\//i.test(href) || href.startsWith("#")) continue;
    const pathname = decodeURIComponent(href.split(/[?#]/, 1)[0]);
    if (!pathname.toLowerCase().endsWith(".html")) continue;

    const target = resolve(dirname(resolve(file)), pathname);
    try {
      await access(target);
    } catch {
      fail(file + ": enlace HTML local sin destino: " + href);
    }
  }
}

try {
  const entry = await readFile("web-panels/index.html", "utf8");
  if (!entry.includes('href="dispatch/index.html"')) fail("La entrada no enlaza a la Cabina de Despacho.");
  if (!entry.includes('href="board/index.html"')) fail("La entrada no enlaza a la Junta Administrativa.");
  if (!entry.includes("marcadores no representan taxis reales")) fail("La entrada debe advertir que los marcadores son ficticios.");

  const board = await readFile("web-panels/board/index.html", "utf8");
  for (const id of ["fleetMap", "revenueChart", "paymentChart", "activityTableBody", "alertsContainer"]) {
    if (!board.includes('id="' + id + '"')) fail("Junta Administrativa: falta el elemento #" + id + ".");
  }
  if (!board.includes("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png")) {
    fail("Junta Administrativa: no se encontró la capa real de OpenStreetMap.");
  }
  if (!board.includes("OpenStreetMap</a> contributors")) {
    fail("Junta Administrativa: falta la atribución de OpenStreetMap.");
  }
  if (!board.includes("Simulación GPS: Inactiva") || !board.includes("DATOS FICTICIOS")) {
    fail("Junta Administrativa: faltan avisos explícitos de datos/simulación.");
  }

  const dispatch = await readFile("web-panels/dispatch/index.html", "utf8");
  for (const id of ["trips", "alerts", "search", "status"]) {
    if (!dispatch.includes('id="' + id + '"')) fail("Cabina de Despacho: falta el elemento #" + id + ".");
  }
  if (!/datos ficticios/i.test(dispatch) || !/no están conectadas al backend/i.test(dispatch)) {
    fail("Cabina de Despacho: falta el aviso de datos ficticios y desconexión del backend.");
  }
} catch (error) {
  fail("No se pudo completar la validación de contenido: " + error.message);
}

if (process.exitCode) {
  console.error("Validación de paneles web fallida.");
  process.exit(process.exitCode);
}

console.log("PASS: los 3 documentos existen y su estructura básica es correcta.");
console.log("PASS: " + compiledScripts + " bloques de JavaScript inline compilan sintácticamente.");
console.log("PASS: enlaces locales, mapa OpenStreetMap, atribución y avisos de datos simulados verificados.");
