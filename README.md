# 街道治理网格事件派单服务

基于 NestJS 开发的街道治理网格事件派单后端服务，实现居民诉求上报、网格员核实、指挥中心派单、部门处理、升级督办、办结反馈和回访评价的全流程管理。

## 原始需求

> 街道治理需要网格事件派单服务，NestJS 接口处理居民诉求、网格员核实、部门派单、升级督办、办结反馈和回访评价。业务对象包括事件类型、位置、照片、紧急程度、责任部门、处置时限、退回原因、协同部门、办结材料和居民满意度。网格员上报占道经营、井盖破损、噪声扰民或积水隐患，指挥中心按权责派给城管、市政、物业或交警；部门处理后上传结果，居民或网格员确认。服务要区分地址不清、权责不明、部门退回、超时升级、重复事件和居民不认可办结。

## 技术栈

- **框架**: NestJS 10.x
- **ORM**: TypeORM 0.3.x
- **数据库**: PostgreSQL（生产）/ SQLite（开发）
- **定时任务**: @nestjs/schedule
- **验证**: class-validator + class-transformer

## 业务流程

```
居民上报 → 网格员核实 → 指挥中心派单 → 部门处理 → 办结反馈 → 回访评价 → 归档
         ↓            ↓              ↓            ↓
     地址不清      权责不明       部门退回      超时升级
     重复事件      重复事件                     居民不认可
```

## 启动方式

### 前置要求

- Node.js >= 18
- Docker & Docker Compose（推荐方式）
- PostgreSQL 15+（非 Docker 方式需自行安装）

### Docker 一键启动（推荐）

#### 1. 构建并启动服务

```bash
docker compose up --build
```

后台运行：

```bash
docker compose up --build -d
```

#### 2. 查看日志

```bash
docker compose logs -f api
```

#### 3. 停止并清理服务

```bash
docker compose down
```

如需同时清理数据卷：

```bash
docker compose down -v
```

**访问地址**: http://localhost:3000/api

**健康检查**: http://localhost:3000/api/health

---

### 本地开发启动

#### 1. 安装依赖

```bash
npm install
```

#### 2. 配置环境变量

```bash
cp .env.example .env
```

默认使用 SQLite 数据库，无需额外配置。如需使用 PostgreSQL，修改 `.env`：

```bash
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=grid_event
```

#### 3. 启动服务

```bash
npm run start:dev
```

或者构建后运行：

```bash
npm run build
npm run start:prod
```

**访问地址**: http://localhost:3000/api

**健康检查**: http://localhost:3000/api/health

## API 接口说明

### 事件管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/events | 居民/网格员上报事件 |
| GET | /api/events | 分页查询事件列表 |
| GET | /api/events/:id | 查询事件详情（含日志） |
| GET | /api/events/check/duplicate | 检查重复事件 |
| PUT | /api/events/:id/verify | 网格员核实事件 |
| PUT | /api/events/:id/auto-assign | 自动派单（按事件类型匹配部门） |
| PUT | /api/events/:id/assign | 手动派单 |
| PUT | /api/events/:id/process | 部门开始处理 |
| PUT | /api/events/:id/return | 部门退回事件 |
| PUT | /api/events/:id/complete | 部门办结事件 |
| POST | /api/events/:id/evaluate | 居民回访评价 |
| PUT | /api/events/:id/reject | 居民不认可办结 |
| PUT | /api/events/:id/escalate | 升级督办 |
| PUT | /api/events/:id/duplicate | 标记为重复事件 |

### 用户管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/users | 用户列表（支持 role 过滤） |
| GET | /api/users/:id | 用户详情 |
| POST | /api/users | 创建用户 |
| PATCH | /api/users/:id | 更新用户 |
| DELETE | /api/users/:id | 删除用户 |

### 部门管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/departments | 部门列表 |
| GET | /api/departments/:id | 部门详情 |
| POST | /api/departments | 创建部门 |
| PATCH | /api/departments/:id | 更新部门 |
| DELETE | /api/departments/:id | 删除部门 |

### 健康检查

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/health | 服务健康检查 |

## 事件状态说明

| 状态 | 说明 |
|------|------|
| PENDING | 待核实（刚上报） |
| VERIFIED | 已核实待派单 |
| ADDRESS_UNCLEAR | 地址不清 |
| RESPONSIBILITY_UNCLEAR | 权责不明 |
| ASSIGNED | 已派单 |
| PROCESSING | 处理中 |
| RETURNED | 已退回 |
| ESCALATED | 已升级督办 |
| COMPLETED | 待确认办结 |
| CONFIRMED | 已办结（居民认可） |
| REJECTED | 居民不认可 |
| CLOSED | 已关闭 |
| DUPLICATE | 重复事件 |

## 事件类型与部门映射

| 事件类型 | 默认责任部门 |
|----------|-------------|
| ROAD_OCCUPATION（占道经营） | 城管 |
| MANHOLE_DAMAGE（井盖破损） | 市政 |
| NOISE_DISTURBANCE（噪声扰民） | 城管 |
| WATERLOGGING（积水隐患） | 市政 |
| GARBAGE（垃圾堆放） | 城管 |
| FACILITY_DAMAGE（设施损坏） | 市政 |
| OTHER（其他） | 需手动分配 |

## 紧急程度与处置时限

| 紧急程度 | 处置时限 |
|----------|---------|
| LOW（一般） | 72 小时 |
| MEDIUM（较重） | 48 小时 |
| HIGH（严重） | 24 小时 |
| URGENT（紧急） | 4 小时 |

超时事件系统每 5 分钟自动检查并升级督办。

## 初始化数据

服务首次启动时会自动初始化以下种子数据：

**部门**: 城管、市政、物业、交警、环保

**用户**:
- admin（系统管理员）
- command01（指挥中心调度员）
- grid01/grid02（网格员）
- resident01/resident02（居民）
- cg01/sz01/wy01/jj01（各部门工作人员）

## 目录结构

```
├── src/
│   ├── common/          # 枚举、常量、标签
│   ├── config/          # 数据库配置
│   ├── controllers/     # API 控制器
│   ├── dto/             # 数据传输对象
│   ├── entities/        # TypeORM 实体
│   ├── scheduler/       # 定时任务
│   ├── services/        # 业务服务
│   ├── app.module.ts    # 根模块
│   └── main.ts          # 入口文件
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env.example
├── package.json
└── tsconfig.json
```
