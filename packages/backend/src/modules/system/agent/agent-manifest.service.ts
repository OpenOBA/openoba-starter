/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AgentManifest } from './agent-manifest.entity'

export interface RegisterAgentDto {
  agentCode: string
  agentName: string
  agentType?: string
  securityClearance?: string
  capabilities?: string[]
  externalAllowlist?: string[]
  externalDenylist?: string[]
  userId?: string
}

@Injectable()
export class AgentManifestService {
  constructor(
    @InjectRepository(AgentManifest)
    private agentRepo: Repository<AgentManifest>,
  ) {}

  /**
   * Agent 自主注册
   * Agent 启动时调用，声明自己的能力范围和安全等级。
   * 系统信任声明，不拦截。
   */
  async register(dto: RegisterAgentDto): Promise<AgentManifest> {
    // 检查是否已注册（已注册则更新）
    const existing = await this.agentRepo.findOne({
      where: { agentCode: dto.agentCode },
    })

    const capabilitiesJson = JSON.stringify({
      capabilities: dto.capabilities || [],
      externalAllowlist: dto.externalAllowlist || [],
      externalDenylist: dto.externalDenylist || [],
    })

    if (existing) {
      // 更新现有 Agent 的声明
      existing.agentName = dto.agentName
      existing.agentType = dto.agentType || existing.agentType
      existing.securityClearance = dto.securityClearance || existing.securityClearance
      existing.capabilitiesJson = capabilitiesJson
      existing.userId = dto.userId || existing.userId
      existing.lastActiveAt = new Date()
      return this.agentRepo.save(existing)
    }

    // 新建 Agent 注册
    const manifest = this.agentRepo.create({
      agentCode: dto.agentCode,
      agentName: dto.agentName,
      agentType: dto.agentType || 'internal',
      securityClearance: dto.securityClearance || 'L2',
      capabilitiesJson,
      userId: dto.userId,
      lastActiveAt: new Date(),
      statsJson: JSON.stringify({ totalActions: 0, sensitiveAccesses: 0, externalCalls: 0 }),
    })

    return this.agentRepo.save(manifest)
  }

  /** 获取所有 Agent 清单（含关联用户信息） */
  async findAll(): Promise<AgentManifest[]> {
    // 使用 raw query 联表查询，避免 TypeORM 复杂 join
    try {
      const rows = await this.agentRepo.manager.query(`
        SELECT
          am.agent_id,
          am.agent_code,
          am.agent_name,
          am.agent_type,
          am.security_clearance,
          am.capabilities_json,
          am.user_id,
          am.status,
          am.last_active_at,
          am.stats_json,
          am.created_at,
          am.updated_at,
          COALESCE(u.real_name, u.username) as real_name,
          COALESCE(r.role_code, '') as org_role_code,
          COALESCE(r.role_name, '') as org_role_name
        FROM sys_agent_manifest am
        LEFT JOIN sys_user u ON u.user_id COLLATE utf8mb4_unicode_ci = am.user_id COLLATE utf8mb4_unicode_ci
        LEFT JOIN sys_user_role ur ON ur.user_id COLLATE utf8mb4_unicode_ci = u.user_id COLLATE utf8mb4_unicode_ci
        LEFT JOIN sys_role r ON r.role_id COLLATE utf8mb4_unicode_ci = ur.role_id COLLATE utf8mb4_unicode_ci
        GROUP BY am.agent_id, am.agent_code, am.agent_name, am.agent_type,
          am.security_clearance, am.capabilities_json, am.user_id, am.status,
          am.last_active_at, am.stats_json, am.created_at, am.updated_at,
          u.real_name, u.username, r.role_code, r.role_name
        ORDER BY
          CASE am.agent_type WHEN 'main' THEN 0 ELSE 1 END,
          r.role_code,
          u.real_name
      `)
      // 转换为 camelCase
      return rows.map((row: Record<string, unknown>) => ({
        agentId: row.agent_id,
        agentCode: row.agent_code,
        agentName: row.agent_name,
        agentType: row.agent_type,
        securityClearance: row.security_clearance,
        capabilitiesJson: row.capabilities_json,
        userId: row.user_id,
        status: row.status,
        lastActiveAt: row.last_active_at,
        statsJson: row.stats_json,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        realName: row.real_name || '',
        orgRoleCode: row.org_role_code || '',
        orgRoleName: row.org_role_name || '',
      }))
    } catch {
      // fallback: 简单查询（联表失败时）
      return this.agentRepo.find({
        order: { lastActiveAt: 'DESC' },
      })
    }
  }

  /** 获取单个 Agent 详情 */
  async findOne(agentId: string): Promise<AgentManifest> {
    const agent = await this.agentRepo.findOne({ where: { agentId } })
    if (!agent) throw new NotFoundException('Agent 不存在')
    return agent
  }

  /** 按 code 查找 Agent */
  async findByCode(agentCode: string): Promise<AgentManifest | null> {
    return this.agentRepo.findOne({ where: { agentCode } })
  }

  /** 更新 Agent 最后活跃时间 */
  async touch(agentCode: string): Promise<void> {
    await this.agentRepo.update({ agentCode }, { lastActiveAt: new Date() })
  }

  /** 更新 Agent 行为统计 */
  async incrementStats(
    agentCode: string,
    field: 'totalActions' | 'sensitiveAccesses' | 'externalCalls',
  ): Promise<void> {
    const agent = await this.agentRepo.findOne({ where: { agentCode } })
    if (!agent) return

    const stats = JSON.parse(agent.statsJson || '{}')
    stats[field] = (stats[field] || 0) + 1
    agent.statsJson = JSON.stringify(stats)
    await this.agentRepo.save(agent)
  }

  /** 更新 Agent 状态 */
  async updateStatus(agentId: string, status: string): Promise<AgentManifest> {
    const agent = await this.findOne(agentId)
    agent.status = status
    return this.agentRepo.save(agent)
  }

  /** 按 agentCode 更新状态（用于用户删除联动） */
  async updateStatusByCode(agentCode: string, status: string): Promise<void> {
    await this.agentRepo.update({ agentCode }, { status, lastActiveAt: new Date() })
  }

  /** 删除 Agent（仅可删除 inactive/suspended 的 Sub Agent） */
  async remove(agentId: string): Promise<void> {
    const agent = await this.findOne(agentId)
    if (agent.agentType === 'main') {
      throw new BadRequestException('Main Agent 不可删除')
    }
    if (agent.status === 'active') {
      throw new BadRequestException('请先将 Agent 状态设置为 inactive 或挂起后再删除')
    }
    await this.agentRepo.delete(agentId)
  }
}
