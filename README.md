# JSON Tool v2.0

> 强大的 JSON 格式化、验证、查询、对比、转换工具 | Powerful JSON Formatter, Validator & Query Tool

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org)

---

## 功能特性 | Features

| 功能 | Endpoint | 说明 |
|------|----------|------|
| 格式化 | `POST /api/format` | 美化 JSON，支持自定义缩进和键排序 |
| 验证 | `POST /api/validate` | 验证 JSON 语法，精确报错行列位置 |
| 压缩 | `POST /api/minify` | 压缩 JSON，去除所有空白字符 |
| 查询 | `POST /api/query` | JSONPath 风格查询 (`.key`, `[0]`, `.nested`) |
| 对比 | `POST /api/diff` | 深度对比两个 JSON，标注增/删/改 |
| 转换 | `POST /api/convert` | JSON 与 YAML 互转 |
| Schema | `POST /api/schema/generate` | 从 JSON 自动生成 JSON Schema |

---

## 快速开始 | Quick Start

```bash
npm install
npm start
# 访问 http://localhost:3001
```

---

## API 文档 | API Reference

### POST /api/format
```json
{ "json": "{...}", "indent": 2, "sortKeys": false }
```

### POST /api/validate
```json
{ "json": "{...}" }
```

### POST /api/minify
```json
{ "json": "{...}" }
```

### POST /api/query
```json
{ "json": "{"user":{"name":"Alice"}}", "path": ".user.name" }
```

### POST /api/diff
```json
{ "json1": "{...}", "json2": "{...}" }
```

### POST /api/convert
```json
{ "json": "{...}", "to": "yaml" }
{ "json": "...yaml...", "to": "json" }
```

### POST /api/schema/generate
```json
{ "json": "{"name":"test","age":25}" }
```

---

## Web UI 使用 | Web UI

打开 `http://localhost:3001` 即可使用可视化界面，支持：
- 7 大功能 Tab（格式化/验证/压缩/查询/对比/转换/Schema）
- 键盘快捷键 `Ctrl+Enter` 一键处理
- 一键复制和下载结果
- 深色主题

---

## License

MIT © 2026 MasterPick