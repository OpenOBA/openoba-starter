/**
 * 全局超时配置
 *
 * 从硬编码迁移到集中常量，便于运维调整和 v1.5 环境变量覆盖
 */

export const TIMEOUT = {
  /** Chat WebSocket 心跳 */
  WS_PING: 10_000,
  /** Chat WebSocket 连接 */
  WS_CONNECT: 10_000,

  /** Git 命令执行 */
  GIT_CMD: 10_000,
  /** TSC 类型检查 */
  TSC_CHECK: 30_000,

  /** LLM API 调用 */
  LLM_CALL: 10_000,
  /** LLM 测试连接 */
  LLM_TEST: 8_000,

  /** 版本检查（官网/GitHub） */
  VERSION_CHECK: 5_000,

  /** MySQL 连接（常规） */
  MYSQL_CONNECT: 10_000,
  /** MySQL 连接（短探针，如 checkStatus） */
  MYSQL_PROBE: 3_000,
  /** MySQL 连接（Wizard 初始化） */
  MYSQL_WIZARD: 5_000,

  /** 部署操作（migrate/rollback） */
  DEPLOY_CMD: 30_000,

  /** V1.6.0: Agent 会话整体超时（5 分钟） */
  AGENT_CHAT: 300_000,
} as const
