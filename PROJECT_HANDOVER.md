# 项目交接文档 (Project Handover)

> 本文档专为 AI Agent 设计，用于快速理解项目上下文、运行逻辑与核心约束。

## 1. 项目核心身份 (Core Identity)
- **项目名称**: AIXUEXI (AI 英语学习系统)
- **当前版本**: v0.3.1
- **核心目标**: 1 对多学生的 AI 驱动英语学习与监控。
- **核心角色**:
    - **Student (学生)**: 做题、学习、SRS 复习。
    - **Parent (家长)**: 监控孩子进度 (v0.2.0 API 完成，UI 待完善)。
    - **Teacher (教师)**: 班级宏观看板 (v0.3.0/0.3.1 端到端完成)。

## 2. 技术栈与架构地图 (Architecture Map)
- **Frontend**:
    - **iPad**: SwiftUI + SwiftPM (入口已冻结：`client/AIXueXi.swiftpm`)。
    - **Web/Admin**: (可选，当前仅 iPad 为主)。
- **Backend**:
    - Node.js + Express + SQLite3。
    - **入口**: `server/index.js`。
- **AI**:
    - **Agent**: MiniMax (`minimax/MiniMax-M2.1`)。
    - **Server**: OpenRouter / MiniMax (当前强制配置为 `mock`，防御 400 地域错误)。
    - **配置**: `server/config.js` (Provider 切换)。

## 3. 冻结区 (Frozen Zone - 严禁修改)
1.  **API 契约**: `/api/teacher/dashboard/...` 接口已冻结，不再新增后端接口。
2.  **SwiftPM 入口**: 禁止再动 `.xcodeproj`，只维护 SwiftPM 包结构。
3.  **语言规范**:
    - 回复强制简体中文。
    - 项目文档（README/RELEASE_NOTES）强制中文。
    - 仅代码与错误原文可保留英文。

## 4. 运行与调试 (Runbook)
- **快速启动**:
    1. Server: `cd server && npm start` (端口 3000)。
    2. Client: `open client/AIXueXi.swiftpm` -> 选择 iPad Simulator -> `Cmd+R`。
- **Dev Tools**:
    - Teacher 看板内置“身份切换器” (Teacher/Student/Parent)，用于 RBAC 测试。
    - 种子数据: `server/test-teacher-dashboard.js`。

## 5. 待办与坑 (Known Issues & Debt)
- **已知 Bug**:
    - MiniMax 地域限制 (400 FAILED_PRECONDITION): **强制回退 Mock**。
    - OpenRouter 402: 已修复 (加 Token Cap)。
- **技术债务**:
    - Parent 看板 UI 未完成 (仅有 API)。
    - SRS 复习算法仅 Core 概念 (未完全覆盖边界)。

## 6. 上下文记忆 (Memory)
- **短期**: `memory/YYYY-MM-DD.md` (每日开发日志)。
- **长期**: `MEMORY.md` (核心决策与教训，仅主会话加载)。
