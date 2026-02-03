# AIXUEXI 2026 - AI 英语学习系统

## 项目状态
- **阶段**：B 回合交付中 (0.1.0 MVP)
- **最后更新**：2026-02-03

## 技术栈
- **客户端**：Swift + SwiftUI (iPadOS)
- **服务端**：Node.js + Express
- **AI**：MiniMax / Gemini 3 (Mock)

## 快速开始

### 1. 服务端 (Backend)
```bash
cd server
npm install
npm start
```
- 运行在 `http://localhost:3000`
- 健康检查：`curl http://localhost:3000/health`

### 2. 客户端 (Client)
打开 `client/ios/aixuexi2026.xcodeproj`。
- 选择 iPad Pro (或其他 iPad 模拟器)。
- 按 `Cmd + R` 运行。

### 3. 测试流程
1. 点击 "开始水平测试"。
2. 依次回答 5 道选择题。
3. 查看测试结果与 AI 分析。

## 目录结构
- `server/`: Node.js API 与数据逻辑。
- `client/ios/`: SwiftUI 前端代码。
- `docs/`: 项目文档 (宪章、数据模型、决策记录)。

## 核心功能
- [x] 水平测试启动与流程控制。
- [x] 题目展示与答案校验。
- [x] 结果统计与展示。
- [ ] AI 出题引擎接入 (待 Key)。
