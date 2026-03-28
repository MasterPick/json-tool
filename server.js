/**
 * JSON Tool Server v2.1
 * 强大的 JSON 格式化、验证、查询、对比、转换工具
 * 
 * v2.1 新增功能:
 * - JSON 统计 API (POST /api/stats)
 * - JSON 合并 API (POST /api/merge)
 * - URL 参数加载 (?json=URL 或 ?json=base64)
 */
const http  = require("http");
const fs    = require("fs");
const path  = require("path");
const yaml  = require("js-yaml");
const url   = require("url");

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

/**
 * JSON 统计分析
 * 统计 JSON 的键数量、深度、类型分布等
 */
function analyzeJSON(obj, depth = 0, stats = null) {
  if (!stats) {
    stats = {
      totalKeys: 0,
      totalValues: 0,
      maxDepth: 0,
      types: { string: 0, number: 0, integer: 0, boolean: 0, null: 0, array: 0, object: 0 },
      arrayLengths: [],
      stringLengths: [],
      numberRange: { min: null, max: null }
    };
  }
  
  stats.maxDepth = Math.max(stats.maxDepth, depth);
  
  if (obj === null) {
    stats.types.null++;
    stats.totalValues++;
  } else if (Array.isArray(obj)) {
    stats.types.array++;
    stats.totalValues++;
    stats.arrayLengths.push(obj.length);
    for (const item of obj) {
      analyzeJSON(item, depth + 1, stats);
    }
  } else if (typeof obj === "object") {
    stats.types.object++;
    stats.totalValues++;
    const keys = Object.keys(obj);
    stats.totalKeys += keys.length;
    for (const key of keys) {
      analyzeJSON(obj[key], depth + 1, stats);
    }
  } else if (typeof obj === "string") {
    stats.types.string++;
    stats.totalValues++;
    stats.stringLengths.push(obj.length);
  } else if (typeof obj === "number") {
    stats.totalValues++;
    if (Number.isInteger(obj)) {
      stats.types.integer++;
    } else {
      stats.types.number++;
    }
    if (stats.numberRange.min === null || obj < stats.numberRange.min) {
      stats.numberRange.min = obj;
    }
    if (stats.numberRange.max === null || obj > stats.numberRange.max) {
      stats.numberRange.max = obj;
    }
  } else if (typeof obj === "boolean") {
    stats.types.boolean++;
    stats.totalValues++;
  }
  
  return stats;
}

/**
 * 深度合并多个 JSON 对象
 * @param {Object} target - 目标对象
 * @param {Object[]} sources - 源对象数组
 * @param {Object} options - 合并选项
 * @returns {Object} 合并后的对象
 */
function deepMerge(target, sources, options = {}) {
  const { arrayMerge = "replace" } = options; // 'replace' | 'concat' | 'merge'
  
  const result = JSON.parse(JSON.stringify(target));
  
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    
    for (const key of Object.keys(source)) {
      if (!(key in result)) {
        result[key] = source[key];
      } else if (Array.isArray(result[key]) && Array.isArray(source[key])) {
        if (arrayMerge === "concat") {
          result[key] = [...result[key], ...source[key]];
        } else if (arrayMerge === "merge") {
          // 按索引合并
          const maxLen = Math.max(result[key].length, source[key].length);
          const merged = [];
          for (let i = 0; i < maxLen; i++) {
            if (i < source[key].length) {
              if (i < result[key].length && 
                  typeof result[key][i] === "object" && typeof source[key][i] === "object" &&
                  result[key][i] !== null && source[key][i] !== null) {
                merged.push(deepMerge(result[key][i], [source[key][i]], options));
              } else {
                merged.push(source[key][i]);
              }
            } else {
              merged.push(result[key][i]);
            }
          }
          result[key] = merged;
        } else {
          result[key] = source[key];
        }
      } else if (typeof result[key] === "object" && typeof source[key] === "object" &&
                 result[key] !== null && source[key] !== null && !Array.isArray(result[key])) {
        result[key] = deepMerge(result[key], [source[key]], options);
      } else {
        result[key] = source[key];
      }
    }
  }
  
  return result;
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

  /**
   * POST /api/stats
   * JSON 统计分析
   * 
   * 请求体: { "json": "..." }
   * 返回: { success: true, stats: { totalKeys, maxDepth, types, ... } }
   */
  "POST /api/stats": async (body) => {
    const { json } = body;
    const [err, data] = parseJSON(json);
    if (err) return { status: 400, data: { success: false, error: "Invalid JSON", detail: err } };
    
    const stats = analyzeJSON(data);
    
    // 计算平均值
    const avgArrayLen = stats.arrayLengths.length > 0 
      ? (stats.arrayLengths.reduce((a, b) => a + b, 0) / stats.arrayLengths.length).toFixed(2) 
      : 0;
    const avgStringLen = stats.stringLengths.length > 0 
      ? (stats.stringLengths.reduce((a, b) => a + b, 0) / stats.stringLengths.length).toFixed(2) 
      : 0;
    
    addHistory("stats", json, JSON.stringify(stats));
    return { 
      status: 200, 
      data: { 
        success: true, 
        stats: {
          totalKeys: stats.totalKeys,
          totalValues: stats.totalValues,
          maxDepth: stats.maxDepth,
          types: stats.types,
          summary: {
            avgArrayLength: parseFloat(avgArrayLen),
            avgStringLength: parseFloat(avgStringLen),
            numberRange: stats.numberRange,
            totalArrays: stats.types.array,
            totalObjects: stats.types.object
          }
        }
      } 
    };
  },

  /**
   * POST /api/merge
   * 深度合并多个 JSON 对象
   * 
   * 请求体: { "jsons": ["{...}", "{...}"], "options": { "arrayMerge": "replace" } }
   * arrayMerge: 'replace' | 'concat' | 'merge'
   * 返回: { success: true, result: "..." }
   */
  "POST /api/merge": async (body) => {
    const { jsons, options = {} } = body;
    
    if (!Array.isArray(jsons) || jsons.length < 2) {
      return { status: 400, data: { success: false, error: "At least 2 JSON objects required in 'jsons' array" } };
    }
    
    const parsed = [];
    for (let i = 0; i < jsons.length; i++) {
      const [err, data] = parseJSON(jsons[i]);
      if (err) {
        return { status: 400, data: { success: false, error: `JSON at index ${i} is invalid`, detail: err } };
      }
      parsed.push(data);
    }
    
    const merged = deepMerge(parsed[0], parsed.slice(1), options);
    const result = JSON.stringify(merged, null, 2);
    
    addHistory("merge", jsons.join("\n---\n"), result);
    return { status: 200, data: { success: true, result, mergedCount: jsons.length } };
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
  const parsedUrl = url.parse(req.url, true);
  const urlPath = parsedUrl.pathname;
  const query = parsedUrl.query;
  const rkey = `${req.method} ${urlPath}`;

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" });
    res.end(); return;
  }

  // Static files
  const ext  = path.extname(urlPath);
  const sfile = path.join(__dirname, "public", urlPath.replace(/^\//, ""));
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
    
    // 支持 URL 参数传入 JSON (用于 GET 请求或简化测试)
    if (query.json && req.method === "GET") {
      body.json = query.json;
    }
    
    const { status, data } = await handler(body);
    sendJSON(res, status, data);
    return;
  }

  // 首页支持 URL 参数自动加载 JSON
  if (urlPath === "/" && req.method === "GET" && query.json) {
    const html = fs.readFileSync(path.join(__dirname, "public", "index.html"), "utf-8");
    // 注入 URL 参数到页面，让前端自动加载
    const injected = html.replace(
      "</head>",
      `  <script>window.INITIAL_JSON = ${JSON.stringify(query.json)};</script>\n</head>`
    );
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(injected);
    return;
  }

  // 404
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("404 Not Found");
}).listen(PORT, () => {
  console.log(`JSON Tool v2.1 running at http://localhost:${PORT}`);
  console.log("  POST /api/format       - Pretty-print JSON");
  console.log("  POST /api/validate     - Validate JSON");
  console.log("  POST /api/minify       - Minify JSON");
  console.log("  POST /api/query        - JSONPath query");
  console.log("  POST /api/diff         - Compare two JSONs");
  console.log("  POST /api/convert      - JSON <-> YAML");
  console.log("  POST /api/schema/generate - Generate JSON Schema");
  console.log("  POST /api/stats        - JSON statistics (NEW)");
  console.log("  POST /api/merge        - Deep merge JSONs (NEW)");
  console.log("  GET  /api/history      - Operation history");
  console.log("  GET  /?json=...        - Load JSON from URL param (NEW)");
});
