/**
 * ERA SOUL 模块 — 组织信息构建器
 *
 * 从 DB 动态查询企业组织结构，注入到每个 Agent 的 System Prompt 中。
 * 让 Agent 清楚了解：公司结构、岗位分布、同事 Agent 列表、汇报关系。
 *
 * @file org-info.builder.ts
 * @author OpenOBA
 * @since 2026-05-25
 */

import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AgentManifest } from '../system/agent/agent-manifest.entity'
import { OrganizationInfo, OrgRole, OrgAgent } from './soul.types'

/** 扁平的 Agent 摘要行（来自 agent_manifest + sys_user join） */
interface AgentSummaryRow {
  agent_code: string
  agent_name: string
  agent_type: string
  status: string
  real_name: string
  role_code: string
  role_name: string
}

/** 岗位统计行 */
interface RoleCountRow {
  role_code: string
  role_name: string
  member_count: string
}

@Injectable()
export class OrgInfoBuilder {
  private readonly logger = new Logger(OrgInfoBuilder.name)
  private cachedOrgInfo: { data: OrganizationInfo; timestamp: number } | null = null
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 分钟

  constructor(
    @InjectRepository(AgentManifest)
    private readonly manifestRepo: Repository<AgentManifest>,
  ) {}

  /**
   * 获取组织信息（带缓存）
   */
  async get(): Promise<OrganizationInfo | null> {
    const now = Date.now()
    if (this.cachedOrgInfo && now - this.cachedOrgInfo.timestamp < this.CACHE_TTL) {
      return this.cachedOrgInfo.data
    }

    try {
      const info = await this.queryOrganizationInfo()
      this.cachedOrgInfo = { data: info, timestamp: now }
      return info
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e)
      this.logger.warn(`组织信息查询失败（可能表未初始化）: ${err}`)
      return null
    }
  }

  /**
   * 构建组织信息 System Prompt 块
   */
  build(info: OrganizationInfo): string {
    const roleLines = info.roles
      .map((r: OrgRole) => `  - ${r.roleName}（${r.roleCode}）：${r.memberCount}人`)
      .join('\n')

    const agentLines = info.agents
      .map((a: OrgAgent) => {
        const statusIcon = a.status === 'active' ? '🟢' : a.status === 'inactive' ? '🟡' : '🔴'
        return `  - ${a.icon} ${a.displayName} · ${a.roleName} · ${statusIcon}`
      })
      .join('\n')

    const mainLine = info.mainAgent
      ? `Main Agent：${info.mainAgent.icon} ${info.mainAgent.displayName} · ${info.mainAgent.roleName} · 🔵\n你可以通过 Main Agent 协调跨岗位任务。`
      : ''

    return `
【组织信息】

岗位结构（${info.totalAgents} 人，${info.onlineCount} 人在线）：
${roleLines}
${agentLines}

${mainLine}

协同提示：
- 如需跨岗位协作，可告知 ${info.mainAgent?.displayName || 'Main Agent'} 协调
- 需要特定岗位的人类同事协助时，提出明确的协作请求
`.trim()
  }

  /**
   * 从 DB 查询组织信息
   */
  private async queryOrganizationInfo(): Promise<OrganizationInfo> {
    // 查询岗位统计
    let roleRows: RoleCountRow[] = []
    try {
      roleRows = await this.manifestRepo.manager.query(`
        SELECT
          r.role_code,
          r.role_name,
          COUNT(DISTINCT ur.user_id) as member_count
        FROM sys_role r
        LEFT JOIN sys_user_role ur ON ur.role_id = r.role_id
        WHERE r.is_deleted = 0
        GROUP BY r.role_code, r.role_name
        ORDER BY r.role_code
      `)
    } catch (e: unknown) {
      this.logger.debug(`角色查询失败（表可能未初始化）: ${(e as Error).message}`)
    }

    // 查询 Agent 列表（岗位信息从 sys_user → sys_role 联表获取）
    let agentRows: AgentSummaryRow[] = []
    try {
      agentRows = await this.manifestRepo.manager.query(`
        SELECT
          am.agent_code,
          am.agent_name,
          am.agent_type,
          am.status,
          COALESCE(u.real_name, u.username, '未知') as real_name,
          COALESCE(r.role_code, '未知') as role_code,
          COALESCE(r.role_name, '未知') as role_name
        FROM sys_agent_manifest am
        LEFT JOIN sys_user u ON u.user_id COLLATE utf8mb4_unicode_ci = am.user_id COLLATE utf8mb4_unicode_ci AND u.is_deleted = 0
        LEFT JOIN sys_user_role ur ON ur.user_id COLLATE utf8mb4_unicode_ci = u.user_id COLLATE utf8mb4_unicode_ci
        LEFT JOIN sys_role r ON r.role_id = ur.role_id COLLATE utf8mb4_unicode_ci AND r.is_deleted = 0
        WHERE am.status != 'suspended'
        GROUP BY am.agent_code, am.agent_name, am.agent_type, am.status, u.real_name, u.username, r.role_code, r.role_name
        ORDER BY
          CASE am.agent_type WHEN 'main' THEN 0 ELSE 1 END,
          r.role_code,
          u.real_name
      `)
    } catch (e: unknown) {
      this.logger.debug(`Agent 查询失败（表可能未初始化）: ${(e as Error).message}`)
    }

    const mainAgent = agentRows.find(r => r.agent_type === 'main')

    return {
      roles: roleRows.map(r => ({
        roleCode: r.role_code,
        roleName: r.role_name,
        memberCount: parseInt(r.member_count, 10) || 0,
      })),
      agents: agentRows
        .filter(r => r.agent_type !== 'main')
        .map(r => ({
          agentCode: r.agent_code,
          displayName: r.agent_name,
          agentType: r.agent_type,
          icon: r.agent_type === 'main' ? '🤖' : '👤',
          roleName: r.role_name,
          realName: r.real_name,
          status: r.status,
        })),
      mainAgent: mainAgent
        ? {
            agentCode: mainAgent.agent_code,
            displayName: mainAgent.agent_name,
            agentType: mainAgent.agent_type,
            icon: '🤖',
            roleName: mainAgent.role_name,
            realName: mainAgent.real_name,
            status: mainAgent.status,
          }
        : null,
      totalAgents: agentRows.filter(r => r.agent_type === 'sub').length,
      onlineCount: agentRows.filter(r => r.status === 'active').length,
    }
  }
}
