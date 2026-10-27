import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Script } from "node:vm";

const htmlFiles = [
  "web-panels/index.html",
  "web-panels/board/index.html",
  "web-panels/dispatch/index.html",
];
const scriptFiles = ["web-panels/board/board.js"];

function fail(message) {
  console.error("FAIL:", message);
  process.exitCode = 1;
}

const htmlByPath = new Map();
let compiledScripts = 0;

for (const file of htmlFiles) {
  let html;
  try {
    html = await readFile(file, "utf8");
    htmlByPath.set(file, html);
  } catch {
    fail("No se pudo leer el archivo requerido: " + file);
    continue;
  }

  if (!/^<!doctype html>/i.test(html.trimStart())) fail(file + ": falta el doctype HTML.");
  if (!/<html\b/i.test(html) || !/<\/html>\s*$/i.test(html)) fail(file + ": documento HTML incompleto.");
  if (/\son(?:click|change|submit|keyup|keydown)\s*=/i.test(html)) {
    fail(file + ": hay manejadores de eventos inline; usa listeners en JavaScript.");
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
    if (/^(?:[a-z]+:)?\/\//i.test(href) || href.startsWith("#") || href.startsWith("mailto:")) continue;
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

for (const file of scriptFiles) {
  let source;
  try {
    source = await readFile(file, "utf8");
  } catch {
    fail("No se pudo leer el script requerido: " + file);
    continue;
  }
  try {
    new Script(source, { filename: file });
    compiledScripts += 1;
  } catch (error) {
    fail(file + ": error de sintaxis JavaScript: " + error.message);
  }
}

const entry = htmlByPath.get("web-panels/index.html") ?? "";
const board = htmlByPath.get("web-panels/board/index.html") ?? "";
const dispatch = htmlByPath.get("web-panels/dispatch/index.html") ?? "";
let boardJs = "";
try { boardJs = await readFile("web-panels/board/board.js", "utf8"); } catch {}

if (!entry.includes('href="dispatch/index.html"')) fail("La entrada no enlaza a la Cabina de Despacho.");
if (!entry.includes('href="board/index.html"')) fail("La entrada no enlaza a la Junta Administrativa.");
if (!entry.includes("marcadores no representan taxis reales")) fail("La entrada debe advertir que las posiciones de los taxis son ficticias.");

for (const id of [
  "apiConnectForm", "apiBaseUrl", "apiEmail", "apiPassword", "apiLoginButton",
  "apiLogoutButton", "lastUpdated", "prototypeWarning", "fleetMap", "mapLegend",
  "revenueChart", "paymentChart", "revenueChartUnavailable", "paymentChartUnavailable",
  "activityTableBody", "activitySearch", "activityFilter", "activityFrom", "activityTo",
  "alertsContainer", "alertActionDialog", "alertActionForm", "exportCsvButton", "refreshDashboardButton"
]) {
  if (!board.includes('id="' + id + '"')) fail("Junta Administrativa: falta el elemento #" + id + ".");
}

if (!board.includes("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png")) fail("No se encontró la capa de OpenStreetMap.");
if (!board.includes("OpenStreetMap</a> contributors")) fail("Falta la atribución de OpenStreetMap.");
if (!board.includes("DATOS FICTICIOS") || !board.includes("Simulación demo: Inactiva")) {
  fail("Faltan avisos visibles sobre datos ficticios y simulación local.");
}
if (!board.includes("chart.js@4.4.7") || !board.includes("lucide@0.468.0")) {
  fail("Chart.js y Lucide deben usar versiones explícitas.");
}
if (!/leaflet@1\.9\.4/.test(board)) fail("Leaflet debe utilizar una versión fijada.");

for (const required of [
  '"/auth/login"', '"/board/summary"', '"/panic/alerts"', '"/audit/logs?limit=100"',
  '"acknowledge"', '"escalate"', '"close"', "board.summary.view", "panic.alerts.view", "panic.alerts.manage", "audit.view"
]) {
  if (!boardJs.includes(required)) fail("board.js: falta integración o control esperado: " + required);
}
if (/\.innerHTML\b/.test(boardJs)) fail("board.js: no interpolar datos en innerHTML; usa creación segura de nodos.");
if (/\b(localStorage|sessionStorage)\b/.test(boardJs)) fail("board.js: no persistir token ni credenciales en almacenamiento web.");
if (!boardJs.includes('credentials: "omit"') || !boardJs.includes('redirect: "error"')) {
  fail("board.js: las peticiones deben omitir cookies y no seguir redirecciones.");
}
if (!boardJs.includes("^[\\s]*[=+\\-@]") || !boardJs.includes("new Blob")) {
  fail("board.js: falta protección de CSV frente a fórmulas y exportación mediante Blob.");
}
if (!boardJs.includes("No se dibujan taxis simulados") || !boardJs.includes("no está disponible en el contrato actual")) {
  fail("Modo conectado debe advertir que no existe endpoint de consulta de flota/GPS ni series históricas.");
}
if (!/datos ficticios/i.test(dispatch) || !/no están conectadas al backend/i.test(dispatch)) {
  fail("Cabina de Despacho: falta el aviso de datos ficticios y desconexión del backend.");
}

if (process.exitCode) {
  console.error("Validación de paneles web fallida.");
  process.exit(process.exitCode);
}

console.log("PASS: los 3 documentos HTML existen, están completos y no usan handlers inline.");
console.log("PASS: " + compiledScripts + " bloques JavaScript compilan sintácticamente.");
console.log("PASS: enlaces locales, mapa OpenStreetMap y atribución verificados.");
console.log("PASS: sesión no persistente, permisos, endpoints, acciones de alerta y exportación CSV revisados estáticamente.");
