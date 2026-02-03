# DOMAIN_MAP.md - 数据与领域模型

**版本**: 0.1.0
**创建日期**: 2026-02-03

## 1. 核心实体

### 1.1 User (用户)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| role | Enum | Student, Parent, Teacher |
| name | String | 昵称 |
| created_at | Timestamp | 创建时间 |

### 1.2 StudentProfile (学生画像)
| 字段 | 类型 | 说明 |
|------|------|------|
| user_id | UUID | FK -> User |
| level | Int | 0-100 |
| vocab_score | Int | 词汇分 |
| grammar_score | Int | 语法分 |
| reading_score | Int | 阅读分 |
| listening_score | Int | 听力分 |
| speaking_score | Int | 口语分 |

### 1.3 TestSession (测试/学习会话)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | FK -> User |
| type | Enum | LevelTest, DailyTask |
| status | Enum | InProgress, Completed |
| score | Int? | 得分 |
| started_at | Timestamp | 开始时间 |

### 1.4 Question (题目)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| type | Enum | Choice, FillBlank, Speaking |
| content | JSON | 题目内容 |
| answer | JSON | 正确答案 |
| difficulty | Int | 难度 1-5 |
| analysis | String | AI 解析 |

### 1.5 QuestionResult (答题结果)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| session_id | UUID | FK -> TestSession |
| question_id | UUID | FK -> Question |
| user_answer | JSON | 用户答案 |
| is_correct | Boolean | 是否正确 |
| latency_ms | Int | 耗时 |
| created_at | Timestamp | 答题时间 |

### 1.6 FocusLog (专注度日志)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | FK -> User |
| status | Enum | Present, Away, LowFocus |
| duration_sec | Int | 时长 |
| captured_at | Timestamp | 采集时间 |

## 2. 关系图 (ERD 摘要)

- User (1) -- (N) StudentProfile
- User (1) -- (N) TestSession
- TestSession (1) -- (N) QuestionResult
- Question (1) -- (N) QuestionResult

## 3. 存储策略

- **SQLite (MVP)**：存储所有结构化数据。
- **Redis (Cache)**：缓存活跃 Session 与用户配置。
