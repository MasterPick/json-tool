/**
 * JSON Tool - HTTP Server
 * 提供 JSON 格式化、验证、查询的 Web 服务
 */
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

const PORT = process.env.PORT || 3001;

function resolveFile(urlPath) {
  const routes = {
    '/':          { file: 'public/index.html',    type: 'text/html; charset=utf-8' },
    '/index.html':{ file: 'public/index.html',    type: 'text/html; charset=utf-8' },
  };
  const route = routes[urlPath];
  if (!route) return null;
  try {
    return {
      content:     fs.readFileSync(path.join(__dirname, route.file), 'utf-8'),
      contentType: route.type,
    };
  } catch { return null; }
}

http.createServer((req, res) => {
  const result = resolveFile(req.url);
  if (result) {
    res.writeHead(200, { 'Content-Type': result.contentType });
    res.end(result.content);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
}).listen(PORT, () => {
  console.log(`JSON Tool running at http://localhost:${PORT}`);
});