# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.0] - 2026-03-28

### Added

#### New API Endpoints
- **POST /api/stats** - JSON 统计分析 API
  - 统计总键数、总值数、最大深度
  - 类型分布统计（string/number/integer/boolean/null/array/object）
  - 平均数组长度、平均字符串长度
  - 数字范围（最小/最大值）

- **POST /api/merge** - JSON 深度合并 API
  - 支持合并多个 JSON 对象
  - 三种数组合并策略：replace/concat/merge
  - 深度递归合并嵌套对象

#### New UI Features
- **统计 Tab** - 可视化 JSON 统计面板，卡片式展示统计结果
- **合并 Tab** - 多 JSON 合并界面，支持动态添加 JSON 输入
- **文件拖拽导入** - 所有输入框支持拖拽 JSON 文件导入
- **主题切换** - 深色/浅色主题切换，偏好保存到 localStorage
- **URL 参数加载** - 支持 `?json=...` 参数自动加载 JSON 到输入框

### Changed
- 更新 Web UI 布局，适配新增功能
- 优化 textarea 自动高度调整
- 增强错误提示样式

### Technical
- 新增 `analyzeJSON()` 函数用于递归统计 JSON 结构
- 新增 `deepMerge()` 函数用于深度合并 JSON 对象
- 服务端支持 URL 参数注入初始 JSON

---

## [2.0.0] - 2026-03-15

### Added
- 初始版本发布
- 核心功能：格式化、验证、压缩、查询、对比、转换、Schema 生成
- Web UI 界面
- 操作历史记录
- 深色主题
- 键盘快捷键支持

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| 2.1.0 | 2026-03-28 | 新增统计 API、合并 API、文件拖拽、主题切换 |
| 2.0.0 | 2026-03-15 | 初始发布，7 大核心功能 |
