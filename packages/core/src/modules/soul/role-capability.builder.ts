/**
 * ERA SOUL 模块 — 岗位能力构建器
 *
 * 根据 Agent 的角色（roleCode），裁剪可用的工具列表和权限边界。
 *
 * @file role-capability.builder.ts
 * @author OpenOBA
 * @since 2026-05-25
 */

import { Injectable, Logger } from '@nestjs/common'
import { AgentIdentity, RoleCapability } from './soul.types'

/** 全部可用工具清单（总注册表，各岗位从里面裁剪） */
const ALL_TOOLS: Record<string, string> = {
  query_erp_data: '查询 ERP 系统中的真实业务数据',
  query_knowledge: '查询知识库中的行业经验和最佳实践',
  erdl_crud: 'ERDL 实体代理引擎（read/create/update/delete）',
  draft_create: '在草稿池中创建 SPU/SKU 草稿',
  draft_update: '更新草稿池中已有草稿',
  draft_list: '查询草稿池中的草稿列表',
  aesthetics_check: '对 SPU/SKU 进行美学校验',
  csv_export: '导出数据为 CSV/Markdown/JSON',
  web_fetch: '抓取网页内容',
  data_analyze: '对数据进行统计分析',
  import_analyze: '分析导入文件的结构和内容',
  import_map: '映射导入文件的字段',
  import_execute: '执行数据导入',
  file_edit: '精准编辑项目源代码文件（read/replace/write）',
  tsc_check: '运行 TypeScript 编译检查',
  git_diff: '查看 Git 工作区变更',
}

/** 各岗位可用的工具子集 */
const ROLE_TOOL_MAP: Record<string, string[]> = {
  admin: [
    'query_erp_data', 'query_knowledge', 'erdl_crud', 'draft_create', 'draft_update',
    'draft_list', 'aesthetics_check', 'csv_export', 'web_fetch', 'data_analyze',
    'import_analyze', 'import_map', 'import_execute',
    'file_edit', 'tsc_check', 'git_diff',
  ],
  developer: [
    'query_erp_data', 'query_knowledge', 'erdl_crud', 'csv_export', 'web_fetch',
    'file_edit', 'tsc_check', 'git_diff',
  ],
  operator: [
    'query_erp_data', 'query_knowledge', 'erdl_crud', 'draft_create', 'draft_update',
    'draft_list', 'aesthetics_check', 'csv_export',
    'import_analyze', 'import_map', 'import_execute',
  ],
  designer: [
    'query_erp_data', 'query_knowledge', 'erdl_crud', 'draft_create',
    'draft_list', 'aesthetics_check', 'csv_export',
  ],
  cs: [
    'query_erp_data', 'query_knowledge',
  ],
  content: [
    'query_erp_data', 'query_knowledge', 'erdl_crud', 'draft_create',
    'draft_list', 'csv_export',
  ],
  finance: [
    'query_erp_data', 'query_knowledge', 'erdl_crud', 'csv_export', 'data_analyze',
  ],
  warehouse: [
    'query_erp_data', 'erdl_crud', 'csv_export',
  ],
}

/** 安全等级 → 描述 */
const CLEARANCE_DESC: Record<string, string> = {
  L1: '仅公开数据（产品信息、FAQ）',
  L2: '运营数据（L1 + 订单、库存、客户基本信息）',
  L3: '含 PII（L2 + 客户完整资料、员工信息）',
  L4: '全部数据（L3 + 财务报表、成本、薪资）',
}

/** 角色 → 安全等级 */
const ROLE_CLEARANCE_MAP: Record<string, string> = {
  admin: 'L4',
  developer: 'L3',
  operator: 'L2',
  designer: 'L2',
  cs: 'L1',
  content: 'L2',
  finance: 'L3',
  warehouse: 'L2',
}

@Injectable()
export class RoleCapabilityBuilder {
  private readonly logger = new Logger(RoleCapabilityBuilder.name)

  /**
   * 根据 Agent 身份构建岗位能力 System Prompt 块
   */
  build(identity: AgentIdentity): string {
    const caps = this.getCapabilities(identity)
    const toolLines = caps.tools
      .map((t: string) => `  - ${t}：${ALL_TOOLS[t] || ''}`)
      .join('\n')

    const clearanceDesc = CLEARANCE_DESC[caps.securityClearance] || '未定义'

    const permNote = this.getPermissionNote(identity.agentType, caps)

    return `
【当前岗位能力】

可用工具：
${toolLines}

数据访问范围：${clearanceDesc}
${permNote}
`.trim()
  }

  /**
   * 获取 Agent 的能力配置
   */
  getCapabilities(identity: AgentIdentity): RoleCapability {
    // Main Agent 拥有全部权限
    if (identity.agentType === 'main') {
      return {
        tools: Object.keys(ALL_TOOLS),
        canWrite: true,
        canEditCode: true,
        securityClearance: 'L4',
      }
    }

    // Sub Agent：按角色合并工具
    const tools = new Set<string>()
    for (const code of identity.roleCodes) {
      const roleTools = ROLE_TOOL_MAP[code] || ROLE_TOOL_MAP['operator'] // 默认运营
      roleTools.forEach((t: string) => tools.add(t))
    }

    const canEditCode = identity.roleCodes.some((c: string) =>
      ['admin', 'developer'].includes(c),
    )
    const canWrite = !identity.roleCodes.every((c: string) =>
      ['cs'].includes(c),
    )
    const clearance = identity.roleCodes
      .map((c: string) => ROLE_CLEARANCE_MAP[c] || 'L2')
      .sort()
      .pop() || 'L1'

    return {
      tools: Array.from(tools),
      canWrite,
      canEditCode,
      securityClearance: clearance,
    }
  }

  private getPermissionNote(agentType: string, caps: RoleCapability): string {
    if (agentType === 'main') return ''

    if (!caps.canWrite) {
      return `⚠️ 你只有只读权限。不能修改系统中的任何数据。需要写操作时引导用户联系运营同事。`
    }
    if (caps.canEditCode) {
      return `
⚠️ 你有代码编辑权限。修改代码后必须立即调用 tsc_check 验证编译。
    `.trim()
    }
    return ''
  }
}
