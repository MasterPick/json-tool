/**
 * JSON Tool Server v2.0
 * 强大的 JSON 格式化、验证、查询、对比、转换工具
 */
const http  = require("http");
const fs    = require("fs");
const path  = require("path");
const yaml  = require("js-yaml");

const PORT  = process.env.PORT || 3001;
const HISTORY_MAX = 20;

// ── In-memory history ────────────────────────────────────────────────────────
const history = [];

function addHistory(op, input, output) {
  history.unshift({ op, input: input.substring(0, 500), ts: new Date().toISOString() });
  if (history.length > HISTORY_MAX) history.pop();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function sendJSON(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(data));
}

function getBody(req) {
  return new Promise((resolve, reject) => {
    let d = "";
    req.on("data", c => d += c);
    req.on("end", () => resolve(d));
    req.on("error", reject);
  });
}

function parseJSON(raw) {
  try { return [null, JSON.parse(raw)]; }
  catch (e) {
    const m = e.message.match(/position (\d+)/);
    const pos = m ? parseInt(m[1]) : 0;
    const lines = raw.substring(0, pos).split("\n");
    return [{ line: lines.length, column: lines[lines.length - 1].length + 1, message: e.message }, null];
  }
}

// JSONPath-like query: .key [index] .nested
function queryJSON(obj, q) {
  let result = obj;
  const parts = q.match(/(\.?[\w]+|\[\d+\])/g) || [];
  for (const p of parts) {
    if (p.startsWith("[")) {
      const idx = parseInt(p.slice(1, -1));
      if (Array.isArray(result) && idx < result.length) result = result[idx];
      else return undefined;
    } else {
      const key = p.startsWith(".") ? p.slice(1) : p;
      if (result && typeof result === "object" && key in result) result = result[key];
      else return undefined;
    }
  }
  return result;
}

// Deep diff between two objects
function deepDiff(a, b, path = "") {
  const diffs = [];
  const allKeys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const key of allKeys) {
    const p = path ? `${path}.${key}` : key;
    if (!(key in a)) diffs.push({ path: p, type: "added", value: b[key] });
    else if (!(key in b)) diffs.push({ path: p, type: "removed", value: a[key] });
    else if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
      if (typeof a[key] === "object" && typeof b[key] === "object" && a[key] !== null && b[key] !== null)
        diffs.push(...deepDiff(a[key], b[key], p));
      else diffs.push({ path: p, type: "changed", oldValue: a[key], newValue: b[key] });
    }
  }
  return diffs;
}

// Auto-generate JSON Schema
function generateSchema(obj) {
  if (obj === null) return { type: "null" };
  if (Array.isArray(obj)) {
    const items = obj.length > 0 ? generateSchema(obj[0]) : {};
    return { type: "array", items };
  }
  if (typeof obj === "object") {
    const props = {};
    for (const [k, v] of Object.entries(obj)) props[k] = generateSchema(v);
    return { type: "object", properties: props };
  }
  if (typeof obj === "number") return obj % 1 === 0 ? { type: "integer" } : { type: "number" };
  return { type: typeof obj };
}

// ── Routes ────────────────────────────────────────────────────────────────────
const routes = {
  "GET /":          { file: "public/index.html",    type: "text/html; charset=utf-8" },
  "GET /index.html":{ file: "public/index.html",    type: "text/html; charset=utf-8" },
};

const api = {
  "POST /api/format": async (body) => {
    const { json, indent = 2, sortKeys = false } = body;
    const [err, data] = parseJSON(json);
    if (err) return { status: 400, data: { success: false, error: "Invalid JSON", detail: err } };
    const replacer = sortKeys ? (k, v) => (k && typeof v === "object" && !Array.isArray(v) ? Object.keys(v).sort().reduce((o, key) => { o[key] = v[key]; return o; }, {}) : v) : null;
    const formatted = JSON.stringify(data, replacer, parseInt(indent));
    addHistory("format", json, formatted);
    return { status: 200, data: { success: true, result: formatted, original: json } };
  },

  "POST /api/validate": async (body) => {
    const { json } = body;
    const [err, data] = parseJSON(json);
    if (err) {
      addHistory("validate", json, "invalid");
      return { status: 200, data: { valid: false, error: err.message, line: err.line, column: err.column } };
    }
    addHistory("validate", json, "valid");
    return { status: 200, data: { valid: true, size: json.length, keys: Object.keys(data).length } };
  },

  "POST /api/minify": async (body) => {
    const { json } = body;
    const [err, data] = parseJSON(json);
    if (err) return { status: 400, data: { success: false, error: "Invalid JSON" } };
    const minified = JSON.stringify(data);
    addHistory("minify", json, minified);
    return { status: 200, data: { success: true, result: minified, originalSize: json.length, minifiedSize: minified.length } };
  },

  "POST /api/query": async (body) => {
    const { json, path: q } = body;
    const [err, data] = parseJSON(json);
    if (err) return { status: 400, data: { success: false, error: "Invalid JSON" } };
    if (!q) return { status: 400, data: { success: false, error: "Missing 'path' parameter (e.g. .key.nested or [0])" } };
    const result = queryJSON(data, q);
    return { status: 200, data: { success: true, path: q, result, found: result !== undefined } };
  },

  "POST /api/diff": async (body) => {
    const { json1, json2 } = body;
    const [err1, data1] = parseJSON(json1);
    const [err2, data2] = parseJSON(json2);
    if (err1) return { status: 400, data: { success: false, error: "First JSON is invalid", detail: err1 } };
    if (err2) return { status: 400, data: { success: false, error: "Second JSON is invalid", detail: err2 } };
    const diffs = deepDiff(data1, data2);
    addHistory("diff", json1 + "\n---\n" + json2, JSON.stringify(diffs));
    return { status: 200, data: { success: true, diffs, totalChanges: diffs.length } };
  },

  "POST /api/convert": async (body) => {
    const { json, to = "yaml" } = body;
    const [err, data] = parseJSON(json);
    if (err) return { status: 400, data: { success: false, error: "Invalid JSON" } };
    if (to === "yaml") {
      const result = yaml.dump(data, { indent: 2, lineWidth: -1, noRefs: true });
      addHistory("json2yaml", json, result);
      return { status: 200, data: { success: true, result, from: "json", to: "yaml" } };
    } else if (to === "json") {
      try {
        const result = JSON.stringify(yaml.load(json), null, 2);
        addHistory("yaml2json", json, result);
        return { status: 200, data: { success: true, result, from: "yaml", to: "json" } };
      } catch (e) {
        return { status: 400, data: { success: false, error: "Invalid YAML: " + e.message } };
      }
    }
    return { status: 400, data: { success: false, error: "Unknown conversion target. Use 'yaml' or 'json'." } };
  },

  "POST /api/schema/generate": async (body) => {
    const { json } = body;
    const [err, data] = parseJSON(json);
    if (err) return { status: 400, data: { success: false, error: "Invalid JSON" } };
    const schema = generateSchema(data);
    const result = JSON.stringify(schema, null, 2);
    addHistory("schema", json, result);
    return { status: 200, data: { success: true, schema, result } };
  },

  "GET /api/history": async () => {
    return { status: 200, data: { success: true, history } };
  },
};

// ── Server ────────────────────────────────────────────────────────────────────
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

http.createServer(async (req, res) => {
  const url  = req.url.split("?")[0];
  const rkey = `${req.method} ${url}`;

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" });
    res.end(); return;
  }

  // Static files
  const ext  = path.extname(url);
  const sfile = path.join(__dirname, "public", url.replace(/^\//, ""));
  if (ext && fs.existsSync(sfile) && fs.statSync(sfile).isFile()) {
    res.writeHead(200, { "Content-Type": MIME[ext] || "text/plain" });
    res.end(fs.readFileSync(sfile)); return;
  }

  // API routes
  const handler = api[rkey];
  if (handler) {
    let body = {};
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      try { body = JSON.parse(await getBody(req)); } catch { body = {}; }
    }
    const { status, data } = await handler(body);
    sendJSON(res, status, data);
    return;
  }

  // 404
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("404 Not Found");
}).listen(PORT, () => {
  console.log(`JSON Tool v2.0 running at http://localhost:${PORT}`);
  console.log("  POST /api/format       - Pretty-print JSON");
  console.log("  POST /api/validate     - Validate JSON");
  console.log("  POST /api/minify       - Minify JSON");
  console.log("  POST /api/query        - JSONPath query");
  console.log("  POST /api/diff         - Compare two JSONs");
  console.log("  POST /api/convert      - JSON <-> YAML");
  console.log("  POST /api/schema/generate - Generate JSON Schema");
  console.log("  GET  /api/history      - Operation history");
});