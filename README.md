# JSON Tool v2.1

> 强大的 JSON 格式化、验证、查询、对比、转换、统计、合并工具 | Powerful JSON Formatter, Validator, Query, Diff, Convert, Stats & Merge Tool

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

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
| **统计** | `POST /api/stats` | **[NEW]** 统计键数量、深度、类型分布等 |
| **合并** | `POST /api/merge` | **[NEW]** 深度合并多个 JSON 对象 |

---

## 快速开始 | Quick Start

```bash
# 克隆项目
git clone https://github.com/MasterPickSelf/json-tool.git
cd json-tool

# 安装依赖
npm install

# 启动服务
npm start
# 访问 http://localhost:3001
```

---

## API 文档 | API Reference

### POST /api/format
格式化 JSON

**请求体:**
```json
{ 
  "json": "{\"name\":\"test\"}", 
  "indent": 2, 
  "sortKeys": false 
}
```

**响应:**
```json
{
  "success": true,
  "result": "{\n  \"name\": \"test\"\n}",
  "original": "{\"name\":\"test\"}"
}
```

---

### POST /api/validate
验证 JSON 语法

**请求体:**
```json
{ "json": "{\"valid\": true}" }
```

**响应:**
```json
{ 
  "valid": true, 
  "size": 16, 
  "keys": 1 
}
```

---

### POST /api/minify
压缩 JSON

**请求体:**
```json
{ "json": "{\n  \"key\": \"value\"\n}" }
```

**响应:**
```json
{
  "success": true,
  "result": "{\"key\":\"value\"}",
  "originalSize": 20,
  "minifiedSize": 16
}
```

---

### POST /api/query
JSONPath 风格查询

**请求体:**
```json
{ 
  "json": "{\"user\":{\"name\":\"Alice\"}}", 
  "path": ".user.name" 
}
```

**响应:**
```json
{
  "success": true,
  "path": ".user.name",
  "result": "Alice",
  "found": true
}
```

---

### POST /api/diff
深度对比两个 JSON

**请求体:**
```json
{ 
  "json1": "{\"a\":1,\"b\":2}", 
  "json2": "{\"a\":1,\"c\":3}" 
}
```

**响应:**
```json
{
  "success": true,
  "diffs": [
    { "path": "b", "type": "removed", "value": 2 },
    { "path": "c", "type": "added", "value": 3 }
  ],
  "totalChanges": 2
}
```

---

### POST /api/convert
JSON 与 YAML 互转

**请求体 (JSON → YAML):**
```json
{ "json": "{\"name\":\"test\"}", "to": "yaml" }
```

**响应:**
```json
{
  "success": true,
  "result": "name: test\n",
  "from": "json",
  "to": "yaml"
}
```

---

### POST /api/schema/generate
生成 JSON Schema

**请求体:**
```json
{ "json": "{\"name\":\"test\",\"age\":25}" }
```

**响应:**
```json
{
  "success": true,
  "schema": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "age": { "type": "integer" }
    }
  }
}
```

---

### POST /api/stats **[NEW]**
统计分析 JSON

**请求体:**
```json
{ "json": "{\"users\":[{\"id\":1},{\"id\":2}],\"total\":2}" }
```

**响应:**
```json
{
  "success": true,
  "stats": {
    "totalKeys": 4,
    "totalValues": 7,
    "maxDepth": 3,
    "types": {
      "string": 0,
      "number": 3,
      "integer": 3,
      "boolean": 0,
      "null": 0,
      "array": 1,
      "object": 3
    },
    "summary": {
      "avgArrayLength": 2,
      "avgStringLength": 0,
      "numberRange": { "min": 1, "max": 2 },
      "totalArrays": 1,
      "totalObjects": 3
    }
  }
}
```

---

### POST /api/merge **[NEW]**
深度合并多个 JSON

**请求体:**
```json
{
  "jsons": [
    "{\"a\":1,\"b\":{\"x\":10}}",
    "{\"a\":2,\"c\":3,\"b\":{\"y\":20}}"
  ],
  "options": {
    "arrayMerge": "replace"
  }
}
```

**arrayMerge 选项:**
- `replace` - 替换数组（默认）
- `concat` - 拼接数组
- `merge` - 按索引合并数组元素

**响应:**
```json
{
  "success": true,
  "result": "{\n  \"a\": 2,\n  \"b\": {\n    \"x\": 10,\n    \"y\": 20\n  },\n  \"c\": 3\n}",
  "mergedCount": 2
}
```

---

### GET /api/history
获取操作历史

**响应:**
```json
{
  "success": true,
  "history": [
    { "op": "format", "input": "...", "ts": "2026-03-28T00:00:00.000Z" }
  ]
}
```

---

## Web UI 功能

打开 `http://localhost:3001` 即可使用可视化界面：

- **9 大功能 Tab**: 格式化/验证/压缩/查询/对比/转换/Schema/统计/合并
- **文件拖拽导入**: 直接拖拽 JSON 文件到输入框
- **URL 参数加载**: 支持 `?json=...` 参数自动加载 JSON
- **深色/浅色主题**: 点击右上角按钮切换
- **键盘快捷键**: `Ctrl+Enter` 一键处理
- **一键复制/下载**: 快速复制或下载结果

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3001` | 服务端口 |

---

## 技术栈

- Node.js (原生 http 模块，零框架依赖)
- js-yaml (YAML 转换)
- 纯前端 HTML/CSS/JS (无构建工具)

---

## License

MIT © 2026 MasterPick
