# 📋 JSON Tool

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Node](https://img.shields.io/badge/Node-%3E%3D14-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![JSON](https://img.shields.io/badge/JSON-Tool-DC382D?style=for-the-badge&logo=json&logoColor=white)](https://www.json.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey?style=for-the-badge)]()
[![Stars](https://img.shields.io/github/stars/MasterPick/json-tool?style=for-the-badge&color=gold)](https://github.com/MasterPick/json-tool/stargazers)

*A powerful JSON formatter, validator, and query tool with syntax highlighting, file compare, and JSONPath support.*

**[English](#english)** · **[中文](#中文)** · **[快速开始](#-快速开始)** · **[功能列表](#-功能列表)** · **[使用示例](#-使用示例)**

</div>

---

## 🌟 项目亮点

> JSON 格式化、验证、查询、对比 — 一站式 JSON 处理工具，无需安装，浏览器打开即用。

| 亮点 | 说明 |
|------|------|
| 🎨 **语法高亮** | JSON 键/值/类型分级配色，一目了然 |
| ✅ **格式验证** | 精准定位 JSON 语法错误，含错误行号提示 |
| 🔍 **JSONPath 查询** | 支持 `$.store.book[*].author` 等高级查询语法 |
| ⚖️ **差异对比** | 两段 JSON 对比，高亮显示增/删/改差异 |
| 🗜 **一键压缩** | 去除多余空格，快速压缩 JSON |
| 🔤 **键排序** | JSON 键字母排序，便于 Code Review |
| ⚡ **零依赖** | 纯原生 HTML + JS，无需构建，即开即用 |

---

## ✨ 功能列表

| 功能 | 说明 |
|------|------|
| 🎨 格式化 | 可视化缩进（1~8 空格可调） |
| 🗜 压缩 | 一键压缩为最小体积 |
| 🔤 键排序 | 按键名字母顺序重排 |
| ✅ 验证 | JSON 语法校验 |
| 🔍 JSONPath 查询 | 支持 `$.path`、`[*]`、`[?(@.x>y)]`、`..key` |
| ⚖️ 对比 | 两段 JSON 高亮差异 |
| 📋 复制 / 粘贴 | 一键复制输出结果 |

---

## 🚀 快速开始

```bash
git clone https://github.com/MasterPick/json-tool.git
cd json-tool
node server.js
```

访问 **http://localhost:3001**

---

## 📖 使用示例

| 操作 | 说明 |
|------|------|
| 格式化 | 粘贴 JSON → 点击「🎨 格式化」 |
| 压缩 | 点击「🗜 压缩」去除所有多余空格 |
| 键排序 | 点击「🔤 键排序」字母排序所有键 |
| 验证 | 切换到「✅ 验证」Tab → 粘贴 JSON → 查看结果 |
| 查询 | 切换到「🔍 JSONPath 查询」→ 输入查询表达式 → 执行 |
| 对比 | 切换到「⚖️ 对比」→ 分别粘贴两段 JSON → 查看差异 |

### JSONPath 查询示例

```json
{ "store": { "book": [
  { "author": "作者A", "price": 10 },
  { "author": "作者B", "price": 30 }
]}}
```

| 查询表达式 | 结果 |
|-----------|------|
| `$.store.book[*].author` | ["作者A","作者B"] |
| `$..author` | 递归获取所有 author 字段 |
| `$.store.book[?(@.price>20)]` | price > 20 的书 |
| `$.store.book[0]` | 第一本书 |

---

## 📁 项目结构

```
json-tool/
├── server.js          # Node.js HTTP 服务器（零依赖）
├── package.json       # 项目配置
└── public/
    └── index.html     # 前端单页应用（全部逻辑内嵌）
```

---

## 📄 License

MIT License · Copyright © 2026 [MasterPick](https://github.com/MasterPick)

---

*🤖 由 AI 辅助生成 · Daily Project*