(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const api = { baseUrl: "", token: "", permissions: new Set(), role: "", user: null, connected: false };
  const resourceState = { summary: "demo", alerts: "demo", audit: "demo" };
  let liveSummary = null;
  let liveAlerts = null;
  let liveAudit = null;
  let activeMapFilter = "all";
  let map = null;
  let markerLayer = null;
  let mapMarkers = new Map();
  let revenueChart = null;
  let paymentChart = null;
  let refreshTimer = null;
  let activeAlertAction = null;
  let lastSuccessfulRefresh = null;
  let busy = false;
  let tileErrorShown = false;

  const demoFleet = [
    { id: "TX-DEMO-101", driver: "Conductor demo 01", status: "En Servicio", lat: 20.1775, lng: -98.0520, location: "Zona centro (referencia demo)", battery: "89%", signal: "4G", speed: "32 km/h" },
    { id: "TX-DEMO-102", driver: "Conductor demo 02", status: "Alerta", lat: 20.1710, lng: -98.0580, location: "Zona norte (referencia demo)", battery: "74%", signal: "4G", speed: "0 km/h" },
    { id: "TX-DEMO-103", driver: "Conductor demo 03", status: "En Servicio", lat: 20.1820, lng: -98.0490, location: "Zona centro (referencia demo)", battery: "95%", signal: "5G", speed: "45 km/h" },
    { id: "TX-DEMO-104", driver: "Conductor demo 04", status: "Disponible", lat: 20.1764, lng: -98.0531, location: "Punto de referencia demo", battery: "98%", signal: "5G", speed: "0 km/h" },
    { id: "TX-DEMO-105", driver: "Conductor demo 05", status: "En Servicio", lat: 20.1880, lng: -98.0620, location: "Zona poniente (referencia demo)", battery: "81%", signal: "4G", speed: "28 km/h" },
    { id: "TX-DEMO-106", driver: "Conductor demo 06", status: "Disponible", lat: 20.1730, lng: -98.0450, location: "Punto de referencia demo", battery: "91%", signal: "5G", speed: "0 km/h" },
    { id: "TX-DEMO-107", driver: "Conductor demo 07", status: "En Servicio", lat: 20.1680, lng: -98.0650, location: "Zona sur (referencia demo)", battery: "68%", signal: "4G", speed: "36 km/h" },
    { id: "TX-DEMO-108", driver: "Conductor demo 08", status: "Disponible", lat: 20.1810, lng: -98.0560, location: "Punto de referencia demo", battery: "85%", signal: "4G", speed: "0 km/h" },
    { id: "TX-DEMO-109", driver: "Conductor demo 09", status: "En Servicio", lat: 20.1795, lng: -98.0410, location: "Zona oriente (referencia demo)", battery: "78%", signal: "4G", speed: "52 km/h" },
    { id: "TX-DEMO-110", driver: "Conductor demo 10", status: "Disponible", lat: 20.1750, lng: -98.0500, location: "Punto de referencia demo", battery: "92%", signal: "5G", speed: "0 km/h" },
    { id: "TX-DEMO-111", driver: "Conductor demo 11", status: "En Servicio", lat: 20.1650, lng: -98.0550, location: "Zona sur (referencia demo)", battery: "64%", signal: "4G", speed: "30 km/h" },
    { id: "TX-DEMO-112", driver: "Conductor demo 12", status: "Fuera de Línea", lat: 20.1700, lng: -98.0510, location: "Punto de referencia demo", battery: "20%", signal: "Sin señal", speed: "0 km/h" }
  ];

  const demoSummary = {
    tripsByStatus: { TRIP_COMPLETED: 118, PAYMENT_CONFIRMED: 12, TRIP_IN_PROGRESS: 6, SEARCHING_DRIVER: 3, CANCELLED_BY_USER: 3 },
    panicAlertsByStatus: { OPEN: 1 },
    manuallyConfirmedAmount: 19850,
    accruedCommission: 3850
  };

  const demoAlerts = [{
    id: "PAN-DEMO-01",
    tripId: "TRIP-DEMO-101",
    actorType: "DRIVER",
    status: "OPEN",
    location: { lat: 20.1710, lng: -98.0580 },
    locationRecordedAt: new Date().toISOString(),
    locationAccuracyM: 12,
    createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    escalationNote: null,
    closureNote: null,
    demoDescription: "Incidente simulado para revisar el flujo de atención."
  }];

  const demoAudit = [
    { id: "demo-1", action: "trip.completed", entity: "trips", entityId: "TRIP-DEMO-105", reason: "Servicio de prueba", createdAt: "2026-10-26T10:42:00-06:00" },
    { id: "demo-2", action: "user.login", entity: "users", entityId: "USER-DEMO-04", reason: "Acceso de demostración", createdAt: "2026-10-26T10:38:00-06:00" },
    { id: "demo-3", action: "panic.triggered", entity: "panic_alerts", entityId: "PAN-DEMO-01", reason: "Alerta de prueba", createdAt: "2026-10-26T10:31:00-06:00" },
    { id: "demo-4", action: "trip.completed", entity: "trips", entityId: "TRIP-DEMO-102", reason: "Servicio de prueba", createdAt: "2026-10-26T10:20:00-06:00" },
    { id: "demo-5", action: "payment.confirmed", entity: "payments", entityId: "PAY-DEMO-005", reason: "Confirmación manual ficticia", createdAt: "2026-10-26T10:05:00-06:00" }
  ];

  const statusLabel = {
    OPEN: "Abierta",
    ACKNOWLEDGED: "Acuse registrado",
    ESCALATED: "Escalada",
    CLOSED: "Cerrada"
  };

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function setText(id, text) {
    const node = $(id);
    if (node) node.textContent = text === undefined || text === null ? "" : String(text);
  }

  function formatMXN(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 }).format(number);
  }

  function formatDateTime(value) {
    if (!value) return "Fecha no disponible";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Fecha no disponible";
    return new Intl.DateTimeFormat("es-MX", { dateStyle: "short", timeStyle: "medium" }).format(date);
  }

  function formatElapsed(value) {
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) return "Tiempo no disponible";
    const delta = Math.max(0, Date.now() - timestamp);
    const minutes = Math.floor(delta / 60000);
    if (minutes < 1) return "hace menos de 1 min";
    if (minutes < 60) return "hace " + minutes + " min";
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return "hace " + hours + " h";
    return "hace " + Math.floor(hours / 24) + " días";
  }

  function showToast(message, type) {
    const container = $("toastContainer");
    if (!container) return;
    const toast = el("div", "toast-enter flex items-center gap-3 p-3.5 rounded-xl border shadow-2xl backdrop-blur-md pointer-events-auto text-xs font-medium");
    const palette = type === "success" ? "bg-brand-card border-brand-green text-brand-green" :
      type === "warning" ? "bg-brand-card border-brand-amber text-brand-amber" :
      type === "danger" ? "bg-brand-card border-brand-red text-brand-red" :
      "bg-brand-card border-brand-cyan text-brand-cyan";
    toast.classList.add(...palette.split(" "));
    const text = el("span", "flex-1 text-white", message);
    const close = el("button", "text-brand-muted hover:text-white", "Cerrar");
    close.type = "button";
    close.setAttribute("aria-label", "Cerrar notificación");
    close.addEventListener("click", () => toast.remove());
    toast.append(text, close);
    container.appendChild(toast);
    window.setTimeout(() => {
      toast.remove();
    }, 5000);
  }

  function setConnectionStatus(kind, title, message) {
    const badge = $("apiConnectionBadge");
    const dot = $("apiStatusDot");
    if (badge) {
      badge.className = "self-start px-3 py-1.5 rounded-full text-xs font-semibold border " +
        (kind === "connected" ? "border-brand-green/40 bg-brand-green/10 text-brand-green" :
         kind === "error" ? "border-brand-red/40 bg-brand-red/10 text-brand-red" :
         "border-brand-amber/40 bg-brand-amber/10 text-brand-amber");
    }
    if (dot) dot.className = "status-dot" + (kind === "connected" ? " connected" : kind === "error" ? " error" : "");
    setText("apiStatusText", title);
    if (message) setText("apiConnectionMessage", message);
  }

  function setBusy(next) {
    busy = next;
    const loginButton = $("apiLoginButton");
    const logoutButton = $("apiLogoutButton");
    const refreshButton = $("refreshDashboardButton");
    if (loginButton) {
      loginButton.disabled = busy;
      loginButton.textContent = busy ? "Conectando…" : (api.connected ? "Actualizar sesión" : "Conectar");
    }
    if (logoutButton) logoutButton.hidden = !api.connected;
    if (refreshButton) refreshButton.disabled = busy;
  }

  function normalizeBaseUrl(raw) {
    let url;
    try {
      url = new URL(String(raw || "").trim());
    } catch {
      throw new Error("Escribe una URL base válida, por ejemplo http://localhost:3000.");
    }
    const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && localHosts.has(url.hostname))) {
      throw new Error("La API remota debe usar HTTPS. HTTP solo se permite para localhost durante desarrollo.");
    }
    if (url.username || url.password || url.search || url.hash) {
      throw new Error("La URL base no debe incluir credenciales, parámetros ni fragmentos.");
    }
    return url.href.replace(/\/+$/, "");
  }

  function decodeJwtPayload(token) {
    try {
      const part = String(token).split(".")[1];
      if (!part) return {};
      const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
      const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return {};
    }
  }

  function hasPermission(permission) {
    return api.permissions.has(permission);
  }

  async function readResponse(response) {
    const raw = await response.text();
    if (!raw) return null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try { return JSON.parse(raw); } catch { return { message: "La API devolvió JSON inválido." }; }
    }
    return { message: "La API devolvió una respuesta no JSON." };
  }

  async function apiRequest(path, options) {
    if (!api.baseUrl) throw new Error("Configura la URL base de la API.");
    const opts = options || {};
    const headers = { Accept: "application/json" };
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";
    if (api.token && opts.auth !== false) headers.Authorization = "Bearer " + api.token;
    let response;
    try {
      response = await fetch(api.baseUrl + path, {
        method: opts.method || "GET",
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        credentials: "omit",
        cache: "no-store",
        redirect: "error",
        mode: "cors"
      });
    } catch {
      throw new Error("No se pudo contactar la API. Comprueba URL, HTTPS, disponibilidad del backend y CORS.");
    }
    const payload = await readResponse(response);
    if (!response.ok) {
      const message = payload && typeof payload.message === "string" ? payload.message : "La API rechazó la solicitud.";
      const error = new Error("HTTP " + response.status + ": " + message);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function resetLiveData() {
    liveSummary = null;
    liveAlerts = null;
    liveAudit = null;
    resourceState.summary = "empty";
    resourceState.alerts = "empty";
    resourceState.audit = "empty";
  }

  function disconnect(message, kind) {
    api.token = "";
    api.permissions = new Set();
    api.role = "";
    api.user = null;
    api.connected = false;
    resetLiveData();
    if (refreshTimer) window.clearInterval(refreshTimer);
    refreshTimer = null;
    if ($("apiPassword")) $("apiPassword").value = "";
    if ($("apiLogoutButton")) $("apiLogoutButton").hidden = true;
    if ($("apiLoginButton")) {
      $("apiLoginButton").disabled = false;
      $("apiLoginButton").textContent = "Conectar";
    }
    setText("apiPermissionsSummary", "Sin sesión autenticada.");
    setConnectionStatus(kind || "demo", kind === "error" ? "Sin conexión" : "Modo demostración",
      message || "El modo demostración no consulta ni modifica datos reales.");
    renderAll();
  }

  async function connect(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const baseUrl = normalizeBaseUrl($("apiBaseUrl").value);
      const email = $("apiEmail").value.trim();
      const password = $("apiPassword").value;
      if (!email || !password) throw new Error("Escribe el correo y la contraseña de una cuenta autorizada.");
      setConnectionStatus("demo", "Autenticando…", "Enviando credenciales al endpoint /auth/login. La contraseña no se guarda.");
      const result = await apiRequestWithBase(baseUrl, "/auth/login", {
        method: "POST",
        body: { email, password },
        auth: false
      });
      if (!result || typeof result.accessToken !== "string" || !result.accessToken) {
        throw new Error("La API no devolvió un accessToken válido.");
      }
      const claims = decodeJwtPayload(result.accessToken);
      api.baseUrl = baseUrl;
      api.token = result.accessToken;
      api.permissions = new Set(Array.isArray(claims.permissions) ? claims.permissions.filter((item) => typeof item === "string") : []);
      api.role = typeof claims.role === "string" ? claims.role : (result.user && result.user.role) || "UNKNOWN";
      api.user = result.user || null;
      api.connected = true;
      $("apiPassword").value = "";
      setText("apiPermissionsSummary", "Rol " + api.role + " · " + api.permissions.size + " permisos declarados en el JWT. El backend vuelve a validar cada operación.");
      if (!api.permissions.size) {
        setConnectionStatus("error", "Sesión sin permisos legibles", "La sesión se autenticó, pero el JWT no expone la lista de permisos esperada. El backend sigue siendo la autoridad; revisa la configuración antes de usar el panel.");
      } else {
        setConnectionStatus("connected", "Sesión autenticada", "Conectado al backend. Las tarjetas y listas indicarán expresamente si un recurso carece de permiso o no está disponible.");
      }
      $("apiLoginButton").textContent = "Actualizar sesión";
      $("apiLogoutButton").hidden = false;
      await loadLiveData({ allowBusy: true });
      if (refreshTimer) window.clearInterval(refreshTimer);
      refreshTimer = window.setInterval(() => {
        if (api.connected && !document.hidden && !busy) loadLiveData({ quiet: true });
      }, 30000);
      showToast("Sesión establecida. No se almacenó el token en el navegador.", "success");
    } catch (error) {
      disconnect(error && error.message ? error.message : "No se pudo establecer la sesión.", "error");
      showToast(error && error.message ? error.message : "No se pudo conectar.", "danger");
    } finally {
      setBusy(false);
    }
  }

  async function apiRequestWithBase(baseUrl, path, options) {
    const savedBase = api.baseUrl;
    api.baseUrl = baseUrl;
    try {
      return await apiRequest(path, options);
    } finally {
      api.baseUrl = savedBase;
    }
  }

  function unwrapArray(value) {
    if (Array.isArray(value)) return value;
    if (value && Array.isArray(value.items)) return value.items;
    if (value && Array.isArray(value.data)) return value.data;
    return [];
  }

  async function loadResource(name, permission, path, assign) {
    if (!hasPermission(permission)) {
      resourceState[name] = "forbidden";
      assign(null);
      return false;
    }
    try {
      const result = await apiRequest(path);
      assign(name === "summary" ? result : unwrapArray(result));
      resourceState[name] = "ok";
      return true;
    } catch (error) {
      resourceState[name] = error && error.status === 403 ? "forbidden" : error && error.status === 401 ? "unauthorized" : "error";
      assign(null);
      if (error && error.status === 401) throw error;
      return false;
    }
  }

  async function loadLiveData(options) {
    const opts = options || {};
    if (!api.connected || (busy && !opts.allowBusy)) return;
    if (!opts.quiet) setText("apiConnectionMessage", "Consultando resumen, alertas y auditoría según los permisos de la sesión…");
    const jobs = [
      loadResource("summary", "board.summary.view", "/board/summary", (value) => { liveSummary = value; }),
      loadResource("alerts", "panic.alerts.view", "/panic/alerts", (value) => { liveAlerts = value; }),
      loadResource("audit", "audit.view", "/audit/logs?limit=100", (value) => { liveAudit = value; })
    ];
    const results = await Promise.allSettled(jobs);
    if (!api.connected) return;
    const unauthorized = results.some((result) => result.status === "rejected" && result.reason && result.reason.status === 401);
    if (unauthorized) {
      disconnect("La sesión expiró o el token fue rechazado. Vuelve a conectarte.", "error");
      return;
    }
    const succeeded = [resourceState.summary, resourceState.alerts, resourceState.audit].some((state) => state === "ok");
    const errors = [resourceState.summary, resourceState.alerts, resourceState.audit].filter((state) => state === "error" || state === "forbidden");
    if (succeeded) lastSuccessfulRefresh = new Date();
    updateLastUpdated();
    if (errors.length) {
      setConnectionStatus("error", "Conectado parcialmente", "Hay recursos sin permiso o con error. Revisa los mensajes de cada panel; no se sustituyen por datos inventados.");
    } else {
      setConnectionStatus("connected", "Datos consultados", "Los recursos disponibles se consultaron al backend. La flota/GPS y las series históricas financieras aún no están expuestas por el contrato consultado.");
    }
    renderAll();
  }

  function updateLastUpdated() {
    setText("lastUpdated", lastSuccessfulRefresh ? formatDateTime(lastSuccessfulRefresh) : "No disponible");
  }

  function activeAlertCount(summary) {
    const counts = summary && summary.panicAlertsByStatus;
    if (!counts || typeof counts !== "object") return null;
    return Number(counts.OPEN || 0) + Number(counts.ACKNOWLEDGED || 0) + Number(counts.ESCALATED || 0);
  }

  function totalTrips(summary) {
    const counts = summary && summary.tripsByStatus;
    if (!counts || typeof counts !== "object") return null;
    return Object.values(counts).reduce((total, count) => total + (Number.isFinite(Number(count)) ? Number(count) : 0), 0);
  }

  function renderSummary() {
    if (!api.connected) {
      const counts = demoSummary.tripsByStatus;
      setText("kpiTrips", String(Object.values(counts).reduce((sum, n) => sum + n, 0)));
      setText("kpiRevenue", formatMXN(demoSummary.manuallyConfirmedAmount));
      setText("kpiCommission", formatMXN(demoSummary.accruedCommission));
      setText("openAlerts", String(demoAlerts.filter((alert) => alert.status !== "CLOSED").length));
      setText("kpiFleetCount", String(demoFleet.length));
      setText("kpiActivePercent", Math.round(demoFleet.filter((unit) => unit.status === "En Servicio" || unit.status === "Disponible").length / demoFleet.length * 100) + "% simuladas");
      setText("unitsInServiceText", demoFleet.filter((unit) => unit.status === "En Servicio").length + " unidades demo");
      setText("unitsAvailableText", demoFleet.filter((unit) => unit.status === "Disponible").length + " unidades demo");
      setText("unitsOfflineText", demoFleet.filter((unit) => unit.status === "Fuera de Línea").length + " unidades demo");
      setBar("unitsInServiceBar", demoFleet.filter((unit) => unit.status === "En Servicio").length / demoFleet.length * 100);
      setBar("unitsAvailableBar", demoFleet.filter((unit) => unit.status === "Disponible").length / demoFleet.length * 100);
      setBar("unitsOfflineBar", demoFleet.filter((unit) => unit.status === "Fuera de Línea").length / demoFleet.length * 100);
      setText("kpiActivePercent", "Demo · " + Math.round(demoFleet.filter((unit) => unit.status === "En Servicio" || unit.status === "Disponible").length / demoFleet.length * 100) + "%");
      setText("alertsTrend", demoAlerts.filter((alert) => alert.status !== "CLOSED").length ? "Requieren seguimiento (demo)" : "Sin alertas demo");
      const demoDot = $("alertStatusDot");
      if (demoDot) demoDot.className = "inline-block w-2 h-2 rounded-full " + (demoAlerts.some((alert) => alert.status !== "CLOSED") ? "bg-brand-red animate-ping" : "bg-brand-green");
      return;
    }

    const hasSummary = resourceState.summary === "ok" && liveSummary && typeof liveSummary === "object";
    if (hasSummary) {
      const trips = totalTrips(liveSummary);
      const open = activeAlertCount(liveSummary);
      setText("kpiTrips", trips === null ? "—" : String(trips));
      setText("kpiRevenue", formatMXN(liveSummary.manuallyConfirmedAmount));
      setText("kpiCommission", formatMXN(liveSummary.accruedCommission));
      if (open !== null) setText("openAlerts", String(open));
      setText("alertsTrend", open === null ? "Conteo no disponible" : (open ? "Requieren seguimiento" : "Sin alertas no cerradas"));
      const dot = $("alertStatusDot");
      if (dot) dot.className = "inline-block w-2 h-2 rounded-full " + (open ? "bg-brand-red animate-ping" : "bg-brand-green");
    } else {
      setText("kpiTrips", "—");
      setText("kpiRevenue", "—");
      setText("kpiCommission", "—");
      if (resourceState.summary === "forbidden") {
        setText("openAlerts", liveAlerts ? String(liveAlerts.filter((item) => item.status !== "CLOSED").length) : "—");
      } else {
        setText("openAlerts", "—");
      }
    }

    setText("kpiFleetCount", "—");
    setText("kpiActivePercent", "API de flota/GPS no disponible");
    setText("unitsInServiceText", "No disponible en API");
    setText("unitsAvailableText", "No disponible en API");
    setText("unitsOfflineText", "No disponible en API");
    setBar("unitsInServiceBar", 0);
    setBar("unitsAvailableBar", 0);
    setBar("unitsOfflineBar", 0);
  }

  function setBar(id, percentage) {
    const node = $(id);
    if (node) node.style.width = Math.max(0, Math.min(100, Number(percentage) || 0)) + "%";
  }

  function renderChartMode() {
    const revenueCanvas = $("revenueChart");
    const paymentCanvas = $("paymentChart");
    const revenueNote = $("revenueChartUnavailable");
    const paymentNote = $("paymentChartUnavailable");
    const live = api.connected;
    if (revenueCanvas) revenueCanvas.hidden = live;
    if (paymentCanvas) paymentCanvas.hidden = live;
    if (revenueNote) revenueNote.hidden = !live;
    if (paymentNote) paymentNote.hidden = !live;
    if (live) {
      setText("revenueChartUnavailable", resourceState.summary === "ok"
        ? "El endpoint /board/summary devuelve un total acumulado, no una serie temporal. No se dibuja una tendencia ficticia en modo conectado."
        : "No hay datos financieros autorizados o la consulta falló.");
      setText("paymentChartUnavailable", "El contrato actual no expone un desglose por medio de pago. No se estimará una distribución en modo conectado.");
    } else {
      if (!window.Chart) {
        setText("revenueChartUnavailable", "Chart.js no está disponible; revisa la conexión a Internet.");
        if (revenueNote) revenueNote.hidden = false;
        setText("paymentChartUnavailable", "Chart.js no está disponible; revisa la conexión a Internet.");
        if (paymentNote) paymentNote.hidden = false;
      }
    }
  }

  function initCharts() {
    if (!window.Chart) {
      renderChartMode();
      return;
    }
    const revenueCanvas = $("revenueChart");
    const paymentCanvas = $("paymentChart");
    if (revenueCanvas) {
      const context = revenueCanvas.getContext("2d");
      const gradient = context.createLinearGradient(0, 0, 0, 200);
      gradient.addColorStop(0, "rgba(88,214,232,.35)");
      gradient.addColorStop(1, "rgba(88,214,232,0)");
      revenueChart = new Chart(context, {
        type: "line",
        data: {
          labels: ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00"],
          datasets: [{ label: "Ingresos ilustrativos MXN", data: [1500, 3800, 6900, 10200, 14100, 17200, 19850], borderColor: "#58d6e8", borderWidth: 2.5, backgroundColor: gradient, fill: true, tension: .35, pointBackgroundColor: "#58d6e8", pointRadius: 4 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => formatMXN(context.raw) } } },
          scales: {
            x: { grid: { color: "rgba(39,54,74,.3)" }, ticks: { color: "#9baec4", font: { size: 10 } } },
            y: { grid: { color: "rgba(39,54,74,.3)" }, ticks: { color: "#9baec4", font: { size: 10 }, callback: (value) => "$" + value.toLocaleString("es-MX") } }
          }
        }
      });
    }
    if (paymentCanvas) {
      paymentChart = new Chart(paymentCanvas.getContext("2d"), {
        type: "doughnut",
        data: { labels: ["Efectivo (demo)", "Terminal (demo)"], datasets: [{ data: [14200, 5650], backgroundColor: ["#7bd8ad", "#58d6e8"], borderColor: "#121b28", borderWidth: 3 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { color: "#edf3fb", font: { size: 11 }, usePointStyle: true } } }, cutout: "70%" }
      });
    }
    renderChartMode();
  }

  function categoryOf(action) {
    const text = String(action || "").toLowerCase();
    if (text.includes("panic") || text.includes("alert") || text.includes("incident")) return "Alerta";
    if (text.includes("payment") || text.includes("commission") || text.includes("transaction") || text.includes("cobro")) return "Transacción";
    if (text.includes("login") || text.includes("user") || text.includes("auth") || text.includes("role")) return "Acceso";
    if (text.includes("trip") || text.includes("dispatch") || text.includes("driver") || text.includes("vehicle")) return "Viaje";
    return "Otra";
  }

  function auditRows() {
    if (!api.connected) {
      return demoAudit.map((row) => ({
        id: row.id,
        action: row.action,
        entity: row.entity,
        entityId: row.entityId,
        reason: row.reason,
        actorLabel: "Registro de demo",
        createdAt: row.createdAt,
        category: categoryOf(row.action),
        demo: true
      }));
    }
    if (resourceState.audit !== "ok" || !Array.isArray(liveAudit)) return null;
    return liveAudit.map((row) => ({
      id: row.id,
      action: row.action,
      entity: row.entity,
      entityId: row.entityId,
      reason: row.reason,
      actorLabel: "Actor no incluido en respuesta API",
      createdAt: row.createdAt,
      category: categoryOf(row.action),
      demo: false
    }));
  }

  function renderActivity() {
    const tbody = $("activityTableBody");
    if (!tbody) return;
    tbody.replaceChildren();
    const rows = auditRows();
    if (rows === null) {
      tbody.appendChild(emptyRow(resourceState.audit === "forbidden"
        ? "Tu sesión no tiene permiso para consultar la bitácora (audit.view)."
        : "No se pudo consultar la bitácora. El panel no muestra registros ficticios en modo conectado."));
      return;
    }

    const query = ($("activitySearch").value || "").trim().toLocaleLowerCase("es-MX");
    const category = $("activityFilter").value;
    const from = $("activityFrom").value;
    const to = $("activityTo").value;
    const filtered = rows.filter((row) => {
      const haystack = [row.actorLabel, row.action, row.entity, row.entityId, row.reason].join(" ").toLocaleLowerCase("es-MX");
      if (query && !haystack.includes(query)) return false;
      if (category !== "all" && row.category !== category) return false;
      const date = row.createdAt ? new Date(row.createdAt) : null;
      if (from && date && !Number.isNaN(date.getTime()) && localDateKey(date) < from) return false;
      if (to && date && !Number.isNaN(date.getTime()) && localDateKey(date) > to) return false;
      return true;
    });

    if (!filtered.length) {
      tbody.appendChild(emptyRow("No hay registros que coincidan con los filtros."));
      return;
    }

    filtered.forEach((row) => {
      const tr = el("tr", "audit-row hover:bg-brand-surface/60 transition-colors");
      const time = el("td", "p-3 font-mono text-brand-muted whitespace-nowrap", formatDateTime(row.createdAt));
      const actor = el("td", "p-3 font-medium text-white", row.actorLabel);
      const actionCell = el("td", "p-3 whitespace-nowrap");
      const badgeClass = row.category === "Viaje" ? "bg-brand-cyan/10 border-brand-cyan/30 text-brand-cyan" :
        row.category === "Acceso" ? "bg-brand-green/10 border-brand-green/30 text-brand-green" :
        row.category === "Alerta" ? "bg-brand-red/10 border-brand-red/30 text-brand-red" :
        row.category === "Transacción" ? "bg-brand-amber/10 border-brand-amber/30 text-brand-amber" :
        "bg-brand-surface border-brand-border text-brand-muted";
      actionCell.appendChild(el("span", "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border " + badgeClass, row.category));
      const detail = el("td", "p-3 text-brand-muted");
      detail.appendChild(el("div", "font-medium text-white", row.action || "Acción no especificada"));
      detail.appendChild(el("div", "text-[11px]", (row.entity || "recurso") + " · " + (row.entityId || "id no disponible")));
      if (row.reason) detail.appendChild(el("div", "text-[11px] mt-1", row.reason));
      tr.append(time, actor, actionCell, detail);
      tbody.appendChild(tr);
    });
  }

  function localDateKey(date) {
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  }

  function emptyRow(message) {
    const tr = el("tr");
    const td = el("td", "p-6 text-center text-brand-muted", message);
    td.colSpan = 4;
    tr.appendChild(td);
    return tr;
  }

  function normalizeStatus(status) {
    return String(status || "UNKNOWN").toUpperCase();
  }

  function alertDate(alert) {
    return alert.createdAt || alert.triggeredAt || alert.created_at || null;
  }

  function alertDescription(alert) {
    if (alert.demoDescription) return alert.demoDescription;
    const parts = [];
    if (alert.actorType === "DRIVER") parts.push("Origen: conductor");
    else if (alert.actorType === "PASSENGER") parts.push("Origen: pasajero");
    else parts.push("Origen no disponible");
    if (alert.tripId) parts.push("Viaje " + alert.tripId);
    if (alert.locationRecordedAt) parts.push("Ubicación registrada " + formatDateTime(alert.locationRecordedAt));
    if (Number.isFinite(Number(alert.locationAccuracyM))) parts.push("Precisión ±" + Number(alert.locationAccuracyM) + " m");
    if (!alert.location) parts.push("Sin coordenadas en la alerta");
    return parts.join(" · ");
  }

  function currentAlerts() {
    if (!api.connected) return demoAlerts;
    return resourceState.alerts === "ok" && Array.isArray(liveAlerts) ? liveAlerts : null;
  }

  function renderAlerts() {
    const container = $("alertsContainer");
    if (!container) return;
    container.replaceChildren();
    const alerts = currentAlerts();
    if (alerts === null) {
      container.appendChild(el("div", "p-6 text-center text-brand-muted border border-dashed border-brand-border rounded-xl",
        resourceState.alerts === "forbidden" ? "La sesión no tiene permiso panic.alerts.view." :
          "No se pudo consultar el endpoint de alertas. No se sustituye por alertas de muestra."));
      setText("alertsBadge", resourceState.alerts === "forbidden" ? "Sin permiso" : "Error de consulta");
      const aggregateCount = api.connected && resourceState.summary === "ok" ? activeAlertCount(liveSummary) : null;
      setText("openAlerts", aggregateCount === null ? "—" : String(aggregateCount));
      return;
    }

    const active = alerts.filter((item) => normalizeStatus(item.status) !== "CLOSED");
    setText("openAlerts", String(active.length));
    setText("alertsBadge", active.length ? active.length + " activa(s)" : "Sin alertas abiertas");
    const badge = $("alertsBadge");
    if (badge) badge.className = "px-2.5 py-1 rounded-full text-[11px] font-bold border " + (active.length
      ? "bg-brand-red/20 text-brand-red border-brand-red/30"
      : "bg-brand-green/20 text-brand-green border-brand-green/30");

    if (!alerts.length) {
      container.appendChild(el("div", "p-6 text-center text-brand-muted border border-dashed border-brand-border rounded-xl",
        "No hay alertas devueltas por la API." ));
      return;
    }

    alerts.slice().sort((a, b) => new Date(alertDate(b) || 0).getTime() - new Date(alertDate(a) || 0).getTime()).forEach((alert) => {
      const status = normalizeStatus(alert.status);
      const card = el("article", "p-3.5 rounded-xl border space-y-2 relative overflow-hidden " +
        (status === "CLOSED" ? "border-brand-border bg-brand-surface/40" : "bg-gradient-to-r from-brand-red/10 via-brand-surface to-brand-surface border-brand-red/30"));
      const top = el("div", "flex items-center justify-between gap-2");
      top.append(el("strong", "font-mono text-xs text-brand-red", String(alert.id || "ID no disponible")));
      const pillClass = status === "CLOSED" ? "bg-brand-green/10 text-brand-green border-brand-green/30" :
        status === "ESCALATED" ? "bg-brand-red/20 text-brand-red border-brand-red/40" :
        status === "ACKNOWLEDGED" ? "bg-brand-amber/10 text-brand-amber border-brand-amber/30" :
        "bg-brand-red/10 text-brand-red border-brand-red/30";
      top.appendChild(el("span", "px-2 py-1 rounded-full text-[10px] font-semibold border " + pillClass, statusLabel[status] || status));
      const who = el("div", "text-xs font-semibold text-white",
        alert.actorType === "DRIVER" ? "Botón de pánico · Conductor" :
        alert.actorType === "PASSENGER" ? "Botón de pánico · Pasajero" : "Alerta de origen no especificado");
      const desc = el("p", "text-[11px] text-brand-muted leading-relaxed", alertDescription(alert));
      const time = el("p", "text-[10px] text-brand-muted", formatDateTime(alertDate(alert)) + " · " + formatElapsed(alertDate(alert)));
      card.append(top, who, desc, time);

      if (alert.escalationNote) card.appendChild(el("p", "text-[11px] text-brand-amber", "Nota de escalación: " + alert.escalationNote));
      if (alert.closureNote) card.appendChild(el("p", "text-[11px] text-brand-muted", "Nota de cierre: " + alert.closureNote));

      const actions = el("div", "alert-action-row pt-2");
      const hasLocation = validCoordinates(alert.location);
      if (hasLocation) {
        actions.appendChild(actionButton("Ver ubicación", "map", alert.id, "bg-brand-surface border-brand-border text-brand-cyan"));
      } else {
        actions.appendChild(el("span", "text-[10px] text-brand-muted", "Sin ubicación disponible"));
      }
      if (status !== "CLOSED") {
        if (!api.connected || hasPermission("panic.alerts.manage")) {
          if (status === "OPEN") actions.appendChild(actionButton("Acusar recibo", "acknowledge", alert.id, "bg-brand-cyan/10 border-brand-cyan/40 text-brand-cyan"));
          if (status === "OPEN" || status === "ACKNOWLEDGED") actions.appendChild(actionButton("Escalar", "escalate", alert.id, "bg-brand-amber/10 border-brand-amber/40 text-brand-amber"));
          if (status === "ACKNOWLEDGED" || status === "ESCALATED") actions.appendChild(actionButton("Cerrar", "close", alert.id, "bg-brand-red/10 border-brand-red/40 text-brand-red"));
        } else {
          actions.appendChild(el("span", "text-[10px] text-brand-muted", "Acciones requieren panic.alerts.manage"));
        }
      }
      card.appendChild(actions);
      container.appendChild(card);
    });
  }

  function actionButton(label, action, id, classes) {
    const button = el("button", "px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold " + classes, label);
    button.type = "button";
    button.dataset.alertAction = action;
    button.dataset.alertId = String(id || "");
    return button;
  }

  function validCoordinates(location) {
    return !!location && Number.isFinite(Number(location.lat)) && Number.isFinite(Number(location.lng)) &&
      Number(location.lat) >= -90 && Number(location.lat) <= 90 &&
      Number(location.lng) >= -180 && Number(location.lng) <= 180;
  }

  function initMap() {
    if (!window.L || !$("fleetMap")) {
      setMapNotice("La biblioteca del mapa no cargó. Comprueba la conexión y recarga el panel.");
      return;
    }
    map = L.map("fleetMap", { zoomControl: true, attributionControl: true }).setView([20.1764, -98.0531], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      subdomains: "abc",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
    }).addTo(map).on("tileerror", () => {
      if (!tileErrorShown) {
        tileErrorShown = true;
        showToast("No se pudo cargar una parte del mapa. Verifica la conexión a Internet.", "warning");
      }
    });
    markerLayer = L.layerGroup().addTo(map);
    map.whenReady(() => window.setTimeout(() => map && map.invalidateSize(true), 150));
    window.addEventListener("resize", () => { if (map) map.invalidateSize(); });
    renderMapMarkers();
  }

  function setMapNotice(message) {
    const note = $("fleetMapNotice");
    if (note) {
      note.textContent = message;
      note.hidden = !message;
    }
  }

  function markerIcon(kind) {
    const className = kind === "alert" ? "pin-alerta" : kind === "available" ? "pin-disponible" :
      kind === "offline" ? "pin-fuera-de-linea" : "pin-en-servicio";
    const glyph = kind === "alert" ? "!" : kind === "available" ? "•" : kind === "offline" ? "×" : "T";
    return L.divIcon({
      className: "custom-div-icon",
      html: '<div class="marker-pin ' + className + '" aria-hidden="true"><span style="transform:rotate(45deg);font-weight:800;color:#fff">' + glyph + "</span></div>",
      iconSize: [30, 42],
      iconAnchor: [15, 42]
    });
  }

  function popupNode(title, lines, statusText) {
    const root = el("div", "p-2 space-y-2 min-w-[190px]");
    root.appendChild(el("strong", "block text-sm font-bold text-white", title));
    if (statusText) root.appendChild(el("span", "inline-block text-[10px] px-2 py-1 rounded-full border border-brand-cyan/40 text-brand-cyan", statusText));
    (lines || []).forEach((line) => root.appendChild(el("div", "text-[11px] text-brand-muted", line)));
    return root;
  }

  function renderMapMarkers() {
    if (!map || !markerLayer) return;
    markerLayer.clearLayers();
    mapMarkers = new Map();
    const filters = $("mapFilters");
    if (filters) filters.hidden = api.connected;

    if (!api.connected) {
      setMapNotice("Modo demo: los marcadores, velocidades, conductores y estados son ficticios; solo la cartografía base es real.");
      demoFleet.filter((unit) => activeMapFilter === "all" || unit.status === activeMapFilter).forEach((unit) => {
        const kind = unit.status === "Alerta" ? "alert" : unit.status === "Disponible" ? "available" :
          unit.status === "Fuera de Línea" ? "offline" : "service";
        const marker = L.marker([unit.lat, unit.lng], { icon: markerIcon(kind), title: unit.id, alt: "Unidad ficticia " + unit.id }).addTo(markerLayer);
        marker.bindPopup(popupNode(unit.id, [
          unit.driver,
          unit.location,
          "Velocidad simulada: " + unit.speed,
          "Batería simulada: " + unit.battery + " · Señal " + unit.signal
        ], "DEMO · " + unit.status));
        mapMarkers.set(unit.id, marker);
      });
      const demoAlert = demoAlerts[0];
      if (demoAlert && normalizeStatus(demoAlert.status) !== "CLOSED" && validCoordinates(demoAlert.location)) {
        const marker = L.marker([demoAlert.location.lat, demoAlert.location.lng], { icon: markerIcon("alert"), title: demoAlert.id }).addTo(markerLayer);
        marker.bindPopup(popupNode("Alerta " + demoAlert.id, [demoAlert.demoDescription, "Solo demostración"], "ALERTA FICTICIA"));
        mapMarkers.set(demoAlert.id, marker);
      }
      return;
    }

    if (resourceState.alerts !== "ok" || !Array.isArray(liveAlerts)) {
      setMapNotice(resourceState.alerts === "forbidden"
        ? "Mapa sin ubicaciones individuales: falta el permiso panic.alerts.view."
        : "Mapa real de Huauchinango. No se dibujan taxis porque el contrato no expone una consulta de flota/últimas posiciones GPS.");
      return;
    }
    const mappedAlerts = liveAlerts.filter((alert) => normalizeStatus(alert.status) !== "CLOSED" && validCoordinates(alert.location));
    setMapNotice(mappedAlerts.length
      ? "Se muestran únicamente ubicaciones incluidas en alertas autorizadas. La API no expone aún la última posición de cada taxi."
      : "Mapa real de Huauchinango; no hay alertas activas con coordenadas disponibles. La API aún no ofrece consulta de flota/GPS.");
    mappedAlerts.forEach((alert) => {
      const marker = L.marker([Number(alert.location.lat), Number(alert.location.lng)], {
        icon: markerIcon("alert"),
        title: "Alerta " + String(alert.id || "")
      }).addTo(markerLayer);
      marker.bindPopup(popupNode("Alerta " + String(alert.id || ""), [
        alert.actorType === "DRIVER" ? "Origen: conductor" : alert.actorType === "PASSENGER" ? "Origen: pasajero" : "Origen no especificado",
        "Viaje: " + String(alert.tripId || "No disponible"),
        "Estado: " + (statusLabel[normalizeStatus(alert.status)] || normalizeStatus(alert.status)),
        "Creada: " + formatDateTime(alertDate(alert))
      ], "UBICACIÓN DE ALERTA"));
      mapMarkers.set(String(alert.id), marker);
    });
  }

  function focusAlertOnMap(id) {
    const alerts = currentAlerts();
    if (!Array.isArray(alerts)) return;
    const item = alerts.find((alert) => String(alert.id) === String(id));
    if (!item || !validCoordinates(item.location)) {
      showToast("La alerta no contiene coordenadas válidas.", "warning");
      return;
    }
    if (api.connected && normalizeStatus(item.status) === "CLOSED") {
      showToast("La ubicación de una alerta cerrada no se centra en el mapa operativo.", "warning");
      return;
    }
    if (mapMarkers.has(String(id))) {
      map.flyTo([Number(item.location.lat), Number(item.location.lng)], 17, { duration: 0.5 });
      window.setTimeout(() => {
        const marker = mapMarkers.get(String(id));
        if (marker) marker.openPopup();
      }, 550);
    } else {
      renderMapMarkers();
      const marker = mapMarkers.get(String(id));
      if (marker) {
        map.flyTo([Number(item.location.lat), Number(item.location.lng)], 17, { duration: 0.5 });
        window.setTimeout(() => marker.openPopup(), 550);
      }
    }
  }

  function filterMapUnits(filter) {
    activeMapFilter = filter;
    document.querySelectorAll(".map-filter-btn").forEach((button) => {
      const selected = button.dataset.filter === filter;
      button.className = "map-filter-btn px-3 py-1.5 rounded-xl text-xs font-semibold transition-all " +
        (selected ? "bg-brand-cyan/20 border border-brand-cyan text-brand-cyan" : "bg-brand-surface border border-brand-border text-brand-muted");
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    renderMapMarkers();
  }

  function openAlertAction(id, action) {
    const alerts = currentAlerts();
    if (!Array.isArray(alerts)) return;
    const alert = alerts.find((item) => String(item.id) === String(id));
    if (!alert) {
      showToast("La alerta ya no está en la lista. Actualiza los datos.", "warning");
      return;
    }
    if (api.connected && !hasPermission("panic.alerts.manage")) {
      showToast("La sesión no tiene permiso para modificar alertas.", "danger");
      return;
    }
    activeAlertAction = { id: String(id), action: action };
    setText("alertDialogTitle", action === "acknowledge" ? "Acusar recibo de alerta" :
      action === "escalate" ? "Escalar alerta" : "Cerrar alerta");
    setText("alertDialogDescription", api.connected
      ? "La acción se enviará al backend y quedará registrada en auditoría."
      : "Demostración local: el cambio no se guardará en el servidor.");
    const required = action === "escalate" || action === "close";
    $("alertReasonWrap").hidden = !required;
    $("alertReason").required = required;
    $("alertReason").value = "";
    $("alertDialogError").hidden = true;
    setText("alertDialogError", "");
    setText("alertDialogSubmit", action === "acknowledge" ? "Confirmar acuse" : action === "escalate" ? "Escalar alerta" : "Cerrar alerta");
    if (typeof $("alertActionDialog").showModal === "function") $("alertActionDialog").showModal();
    if (required) $("alertReason").focus();
    else $("alertDialogSubmit").focus();
  }

  function closeAlertDialog() {
    activeAlertAction = null;
    if ($("alertActionDialog").open) $("alertActionDialog").close();
  }

  async function submitAlertAction(event) {
    event.preventDefault();
    if (!activeAlertAction) return;
    const action = activeAlertAction.action;
    const id = activeAlertAction.id;
    const reason = $("alertReason").value.trim();
    if ((action === "escalate" || action === "close") && (reason.length < 3 || reason.length > 500)) {
      setText("alertDialogError", "La nota es obligatoria y debe tener entre 3 y 500 caracteres.");
      $("alertDialogError").hidden = false;
      return;
    }
    const submit = $("alertDialogSubmit");
    submit.disabled = true;
    try {
      if (api.connected) {
        if (!hasPermission("panic.alerts.manage")) throw new Error("La sesión no tiene permiso panic.alerts.manage.");
        const endpoint = "/panic/alerts/" + encodeURIComponent(id) + "/" + action;
        const options = action === "acknowledge" ? { method: "POST" } : { method: "POST", body: { reason: reason } };
        await apiRequest(endpoint, options);
        showToast("La API registró la acción de la alerta.", "success");
      } else {
        const alert = demoAlerts.find((item) => String(item.id) === id);
        if (!alert) throw new Error("La alerta demo ya no existe.");
        const now = new Date().toISOString();
        if (action === "acknowledge" && alert.status === "OPEN") alert.acknowledgedAt = now, alert.status = "ACKNOWLEDGED";
        else if (action === "escalate" && (alert.status === "OPEN" || alert.status === "ACKNOWLEDGED")) alert.escalatedAt = now, alert.escalationNote = reason, alert.status = "ESCALATED";
        else if (action === "close" && (alert.status === "ACKNOWLEDGED" || alert.status === "ESCALATED")) alert.closedAt = now, alert.closureNote = reason, alert.status = "CLOSED";
        else throw new Error("Transición no válida para el estado actual de la alerta.");
        demoAudit.unshift({
          id: "demo-action-" + Date.now(),
          action: "panic." + (action === "acknowledge" ? "acknowledged" : action === "escalate" ? "escalated" : "closed"),
          entity: "panic_alerts",
          entityId: id,
          reason: reason || "Acuse demo",
          createdAt: now
        });
        showToast("Acción aplicada solo a los datos de demostración.", "success");
      }
      closeAlertDialog();
      renderAll();
      if (api.connected) await loadLiveData({ quiet: true });
    } catch (error) {
      setText("alertDialogError", error && error.message ? error.message : "No se pudo completar la acción.");
      $("alertDialogError").hidden = false;
      showToast(error && error.message ? error.message : "No se pudo completar la acción.", "danger");
    } finally {
      submit.disabled = false;
    }
  }

  function csvSafe(value) {
    let text = value === null || value === undefined ? "" : String(value);
    if (/^[\t\r ]*[=+\-@]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function filteredAuditRows() {
    const rows = auditRows();
    if (!rows) return null;
    const query = ($("activitySearch").value || "").trim().toLocaleLowerCase("es-MX");
    const category = $("activityFilter").value;
    const from = $("activityFrom").value;
    const to = $("activityTo").value;
    return rows.filter((row) => {
      const haystack = [row.actorLabel, row.action, row.entity, row.entityId, row.reason].join(" ").toLocaleLowerCase("es-MX");
      if (query && !haystack.includes(query)) return false;
      if (category !== "all" && row.category !== category) return false;
      const date = row.createdAt ? new Date(row.createdAt) : null;
      if (from && date && !Number.isNaN(date.getTime()) && localDateKey(date) < from) return false;
      if (to && date && !Number.isNaN(date.getTime()) && localDateKey(date) > to) return false;
      return true;
    });
  }

  function exportDataCSV() {
    if (api.connected && !hasPermission("audit.view")) {
      showToast("La sesión no tiene permiso para exportar la bitácora.", "danger");
      return;
    }
    const rows = filteredAuditRows();
    if (rows === null) {
      showToast("No hay una bitácora disponible para exportar.", "warning");
      return;
    }
    const headings = ["Fecha", "Actor", "Accion", "Recurso", "ID de recurso", "Motivo", "Origen del dato"];
    const csv = [headings.map(csvSafe).join(",")].concat(rows.map((row) => [
      row.createdAt ? new Date(row.createdAt).toISOString() : "",
      row.actorLabel,
      row.action,
      row.entity,
      row.entityId,
      row.reason,
      row.demo ? "DEMO - FICTICIO" : "API"
    ].map(csvSafe).join(","))).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = el("a");
    link.href = url;
    link.download = "TTAPP_auditoria_" + new Date().toISOString().slice(0, 10) + ".csv";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Se exportó la vista filtrada de auditoría. Verifica la columna de origen del dato.", "success");
  }

  function refreshDashboard() {
    if (api.connected) {
      loadLiveData().catch((error) => showToast(error.message || "Error al actualizar.", "danger"));
    } else {
      renderAll();
      setText("lastUpdated", "Demo local · " + formatDateTime(new Date()));
      showToast("Se actualizaron los datos locales ficticios; no se consultó ningún servidor.", "warning");
    }
  }

  function renderAll() {
    renderSummary();
    renderAlerts();
    renderActivity();
    renderMapMarkers();
    renderChartMode();
    renderModeBanner();
    updateLastUpdated();
    setText("year", String(new Date().getFullYear()));
    const exportButton = $("exportCsvButton");
    if (exportButton) {
      exportButton.disabled = api.connected && !hasPermission("audit.view");
      exportButton.title = exportButton.disabled ? "Tu sesión no tiene permiso audit.view" : "Exportar la auditoría filtrada a CSV";
    }
    const simButton = $("simToggleBtn");
    if (simButton) {
      simButton.disabled = api.connected;
      simButton.title = api.connected ? "La simulación está deshabilitada durante una sesión real" : "Mover solo marcadores ficticios";
    }
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
  }

  function renderModeBanner() {
    const banner = $("prototypeWarning");
    if (!banner) return;
    banner.replaceChildren();
    const header = $("headerDataMode");
    if (api.connected) {
      banner.className = "rounded-xl data-state-banner connected p-4 text-sm shadow-md";
      banner.appendChild(el("strong", "", "MODO CONECTADO — INFORMACIÓN CONSULTADA AL BACKEND."));
      banner.appendChild(document.createTextNode(" Solo se presentan recursos que responde la API con los permisos de la sesión. La lista de flota/GPS y las series temporales financieras no están disponibles en el contrato actual."));
      if (header) header.textContent = "Sesión autenticada · fuente de datos: API · flota/GPS no disponible";
    } else {
      banner.className = "rounded-xl border border-brand-amber/50 bg-brand-amber/10 p-4 text-sm text-brand-amber shadow-md";
      banner.appendChild(el("strong", "", "PROTOTIPO — DATOS FICTICIOS."));
      banner.appendChild(document.createTextNode(" La simulación mueve marcadores locales. No hay autenticación ni conexión al backend en este modo. No utilizar para gestionar viajes reales."));
      if (header) header.textContent = "Modo demo · datos ficticios · sin conexión al backend";
    }
    const legend = $("mapLegend");
    if (legend) legend.hidden = api.connected;
  }

  function initializeEvents() {
    $("apiConnectForm").addEventListener("submit", connect);
    $("apiLogoutButton").addEventListener("click", () => {
      disconnect("Sesión cerrada. El token se eliminó de memoria; el modo demo volverá a mostrarse.", "demo");
      showToast("Sesión cerrada.", "success");
    });
    $("activitySearch").addEventListener("input", renderActivity);
    $("activityFilter").addEventListener("change", renderActivity);
    $("activityFrom").addEventListener("change", renderActivity);
    $("activityTo").addEventListener("change", renderActivity);
    $("exportCsvButton").addEventListener("click", exportDataCSV);
    $("refreshDashboardButton").addEventListener("click", refreshDashboard);
    $("simToggleBtn").addEventListener("click", toggleDemoSimulation);
    $("mapFilters").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-filter]");
      if (button && !api.connected) filterMapUnits(button.dataset.filter);
    });
    $("alertsContainer").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-alert-action],button[data-alert-id]");
      if (!button) return;
      if (button.dataset.alertAction === "map") focusAlertOnMap(button.dataset.alertId);
      else if (button.dataset.alertAction) openAlertAction(button.dataset.alertId, button.dataset.alertAction);
    });
    $("alertActionForm").addEventListener("submit", submitAlertAction);
    $("alertDialogCancel").addEventListener("click", closeAlertDialog);
    $("alertDialogCancelTop").addEventListener("click", closeAlertDialog);
    $("alertActionDialog").addEventListener("click", (event) => {
      if (event.target === $("alertActionDialog")) closeAlertDialog();
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && api.connected && !busy) loadLiveData({ quiet: true });
    });
  }

  let demoTimer = null;
  let demoSimulationActive = false;
  function toggleDemoSimulation() {
    if (api.connected) {
      showToast("La simulación no está disponible durante una sesión real.", "warning");
      return;
    }
    demoSimulationActive = !demoSimulationActive;
    const button = $("simToggleBtn");
    const icon = $("simIcon");
    const text = $("simText");
    if (demoSimulationActive) {
      button.classList.add("animate-pulse");
      if (icon) icon.setAttribute("data-lucide", "pause");
      setText("simText", "Simulación demo: Activa");
      showToast("Se moverán marcadores ficticios. No es GPS real ni se crearán transacciones.", "warning");
      demoTimer = window.setInterval(moveDemoFleet, 3000);
    } else {
      window.clearInterval(demoTimer);
      demoTimer = null;
      button.classList.remove("animate-pulse");
      if (icon) icon.setAttribute("data-lucide", "play");
      setText("simText", "Simulación demo: Inactiva");
      showToast("Simulación local pausada.", "success");
    }
    if (text) text.textContent = demoSimulationActive ? "Simulación demo: Activa" : "Simulación demo: Inactiva";
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  }

  function moveDemoFleet() {
    if (api.connected) return;
    demoFleet.forEach((unit) => {
      if (unit.status === "En Servicio") {
        unit.lat = Math.min(20.192, Math.max(20.158, unit.lat + (Math.random() - 0.5) * 0.00045));
        unit.lng = Math.min(-98.031, Math.max(-98.073, unit.lng + (Math.random() - 0.5) * 0.00045));
      }
    });
    renderMapMarkers();
  }

  function start() {
    initializeEvents();
    initMap();
    initCharts();
    const now = new Date();
    setText("lastUpdated", "Demo local · " + formatDateTime(now));
    renderAll();
  }

  start();
})();
