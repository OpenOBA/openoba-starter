/**
 * 元镜（Meta-Mirror）— 类型定义
 *
 * @file types.ts
 * @module meta-mirror
 * @since 2026-05-22
 */

// ── 实体信息 ──
export interface EntityFieldInfo {
  name: string
  columnName: string
  type: string           // varchar / int / enum / json / timestamp
  isPrimary: boolean
  isNullable: boolean
  isIndexed: boolean
  isUnique: boolean
  comment: string        // 从 @ApiProperty 或 JSDoc 提取
  enumValues?: string[]  // enum 类型的可选值
  
  // ── V2.0 增强字段 ──
  /** DTO 校验约束（从 .dto.ts 扫描关联） */
  validations?: {
    min?: number
    max?: number
    minLength?: number
    maxLength?: number
    pattern?: string
    isEnum?: boolean
    isEmail?: boolean
    isUrl?: boolean
  }
  /** 数据库精度 */
  dbPrecision?: { precision?: number; scale?: number }
  /** 默认值 */
  defaultValue?: string
  /** 业务语义标签（帮助 Agent 理解字段用途） */
  semanticTag?: SemanticTag
}

/** 业务语义标签 */
export type SemanticTag = 
  | 'price'       // 金额字段（元/分）
  | 'identifier'  // 唯一标识符（编码/条码/ID）
  | 'display_name' // 消费者可见的展示名
  | 'status'      // 状态字段
  | 'image'       // 图片 URL
  | 'timestamp'   // 时间戳
  | 'reference'   // 外键引用
  | 'quantity'    // 数量/库存
  | 'enumeration' // 枚举值

export interface EntityRelationInfo {
  name: string
  type: string           // ManyToOne / OneToMany / ManyToMany
  targetEntity: string
  foreignKey?: string
  inverseSide?: string
}

export interface EntityInfo {
  name: string           // 类名 "Order"
  tableName: string      // 表名 "order"
  module: string         // 所属模块 "order"
  filePath: string       // 源码路径
  fields: EntityFieldInfo[]
  relations: EntityRelationInfo[]
  description: string    // 从类注释提取
  indexes: string[]      // @Index() 标记的字段
}

// ── API 信息 ──
export interface APIEndpointInfo {
  method: string         // GET / POST / PUT / DELETE / PATCH
  path: string           // "" / ":id" / ":id/pay"
  fullPath: string       // "GET /orders/:id"
  summary: string        // @ApiOperation 描述
  parameters?: string[]  // @Param() @Query() 参数列表
  body?: string          // @Body() DTO 类型
  response?: string      // 返回类型
  auth: string[]         // @Roles() 要求的角色
  tags: string[]         // @ApiTags
}

export interface APIInfo {
  module: string
  controllerName: string
  basePath: string
  endpoints: APIEndpointInfo[]
  tags: string[]
}

// ── 模块信息 ──
export interface ModuleInfo {
  name: string           // "order"
  path: string           // "modules/order"
  imports: string[]      // 依赖的模块
  providers: string[]    // 提供的 Service
  controllers: string[]  // Controller 名称
  entities: string[]     // 包含的 Entity
}

// ── 规则信息 ──
export interface RuleInfo {
  name: string
  file: string           // e.g. "eyewear.erdl"
  entity: string         // 影响的实体
  trigger: string        // onCreate / onUpdate / onDelete
  conditions: string[]   // 条件列表
  actions: string[]      // 动作列表
  description?: string
}

// ── 约定信息 ──
export interface ConventionInfo {
  namingPatterns: Record<string, string>  // entity: PascalCase, table: snake_case
  directoryStructure: string[]            // 目录层级
  techStack: Record<string, string>       // NestJS, TypeORM, Vue3...
  eslintRules: string[]                   // 核心 ESLint 规则
  tsconfig: Record<string, unknown>
}

// ── Manifest ──
export interface MirrorManifest {
  generatedAt: string       // ISO 时间
  sourceHash: string        // SHA256
  entityCount: number
  apiCount: number
  moduleCount: number
  ruleCount: number
  skillCount?: number
  files: Record<string, string>  // filename → SHA256
}

// ── V2.0 SKILL × 元镜交互协议 ──

/** SKILL 声明需要的系统知识 */
export interface MirrorRefs {
  /** 需要完整了解的 Entity（字段+约束+关系） */
  entities?: string[]
  /** 需要了解的 API 端点 */
  apis?: string[]
  /** 需要遵守的业务规则 */
  rules?: string[]
  /** 需要了解的约定 */
  conventions?: string[]
}

/** ContextInjector 注入结果 */
export interface InjectedContext {
  /** System Prompt 上下文块 */
  systemPromptBlock: string
  /** 注入统计 */
  stats: {
    entitiesInjected: number
    apisInjected: number
    rulesInjected: number
    conventionsInjected: number
    estimatedTokens: number
  }
}
