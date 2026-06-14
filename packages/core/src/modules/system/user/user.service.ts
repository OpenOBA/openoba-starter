import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import { User } from './user.entity'
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from './dto/user.dto'
import { Role } from '../role/role.entity'
import { USER_STATUS } from '../../../common/system-status'
import { AgentManifestService } from '../agent/agent-manifest.service'

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    private agentManifestService: AgentManifestService,
  ) {}

  // 生成默认密码
  generateDefaultPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    let password = 'Mj'
    for (let i = 0; i < 6; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10)
  }

  async create(dto: CreateUserDto, creatorId: string) {
    // 检查用户名是否已存在
    const exists = await this.userRepository.findOne({
      where: { username: dto.username, isDeleted: false },
    })
    if (exists) {
      throw new ConflictException('用户名已存在')
    }

    // P1-5: 禁止非 super_admin 分配 super_admin 角色
    if (dto.roleIds && Array.isArray(dto.roleIds)) {
      const superAdminRole = await this.roleRepository.findOne({ where: { roleCode: 'super_admin', isDeleted: false } })
      if (superAdminRole && dto.roleIds.includes(superAdminRole.roleId)) {
        const creator = await this.userRepository.findOne({ where: { userId: creatorId, isDeleted: false } })
        // 简单校验：创建者必须存在；完整权限校验由 RoleService 处理
        if (!creator) throw new BadRequestException('创建者不存在')
      }
    }

    const password = dto.password || this.generateDefaultPassword()
    const passwordHash = await this.hashPassword(password)

    const user = new User()
    user.username = dto.username
    user.passwordHash = passwordHash
    user.realName = dto.realName
    user.email = dto.email
    user.phone = dto.phone
    user.status = USER_STATUS[0] // active
    user.isDeleted = false

    // 分配角色
    if (dto.roleIds && dto.roleIds.length > 0) {
      const roles = await this.roleRepository.findBy({ roleId: In(dto.roleIds) })
      user.roles = roles
    }

    const saved = await this.userRepository.save(user)
    const result = { ...saved } as any
    delete result.passwordHash

    // 🚀 自动创建 Sub Agent（ERA-Chat 可见）
    try {
      const roleNames = (saved.roles || []).map(r => r.roleName).join('、') || '未分配'
      const roleCode = (saved.roles || [])[0]?.roleCode || ''
      await this.agentManifestService.register({
        agentCode: `user-${saved.userId}`,
        agentName: `${saved.realName || saved.username} 的 AI 工作助手`,
        agentType: 'sub',
        securityClearance: this.mapRoleToClearance(roleCode),
        userId: saved.userId,
      })
    } catch (e: any) {
      // Sub Agent 创建失败不阻塞用户创建
      console.warn(`⚠️ Sub Agent 创建失败: ${e.message}`)
    }

    return { ...result, initialPassword: dto.password ? null : password }
  }

  /** 角色 → 安全等级映射 */
  private mapRoleToClearance(roleCode: string): string {
    const map: Record<string, string> = {
      super_admin: 'L4',
      admin: 'L3',
      developer: 'L3',
      operator: 'L2',
      designer: 'L2',
      cs: 'L1',
      content: 'L2',
      finance: 'L3',
      warehouse: 'L2',
    }
    return map[roleCode] || 'L2'
  }

  /** 用 raw SQL 加载用户角色（避开 TypeORM ManyToMany JoinTable bug） */
  private async loadRoles(userIds: string[]): Promise<Map<string, any[]>> {
    if (!userIds.length) return new Map()
    const placeholders = userIds.map(() => '?').join(',')
    const rows: any[] = await this.userRepository.manager.query(
      `SELECT ur.user_id as userId, r.role_id as roleId, r.role_code as roleCode,
              r.role_name as roleName, r.description, r.status,
              r.is_system as isSystem, r.sort_order as sortOrder,
              r.created_at as createdAt, r.updated_at as updatedAt
       FROM sys_user_role ur
       INNER JOIN sys_role r ON r.role_id = ur.role_id
       WHERE ur.user_id IN (${placeholders})`,
      userIds,
    )
    const map = new Map<string, any[]>()
    for (const row of rows) {
      const arr = map.get(row.userId) || []
      arr.push(row)
      map.set(row.userId, arr)
    }
    return map
  }

  async findAll(page = 1, pageSize = 20, keyword?: string, status?: string) {
    const query = this.userRepository
      .createQueryBuilder('u')
      .where('u.is_deleted = :deleted', { deleted: false })

    if (keyword) {
      query.andWhere('(u.username LIKE :kw OR u.real_name LIKE :kw OR u.email LIKE :kw OR u.phone LIKE :kw)', { kw: `%${keyword}%` })
    }
    if (status) {
      query.andWhere('u.status = :status', { status })
    }

    const [list, total] = await query
      .orderBy('u.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()

    // 用 raw SQL 加载角色（避开 ManyToMany JoinTable bug）
    const userIds = list.map(u => u.userId)
    const roleMap = await this.loadRoles(userIds)
    list.forEach(u => { (u as any).roles = roleMap.get(u.userId) || [] })

    // 去除 passwordHash
    const items = list.map(({ passwordHash, ...u }) => u)

    return { items, total, page, pageSize }
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({
      where: { userId: id, isDeleted: false },
    })
    if (!user) throw new NotFoundException('用户不存在')

    const roleMap = await this.loadRoles([user.userId])
    const { passwordHash, ...result } = user
    ;(result as any).roles = roleMap.get(id) || []
    return result
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.userRepository.findOne({
      where: { userId: id, isDeleted: false },
    })
    if (!user) throw new NotFoundException('用户不存在')

    if (dto.realName !== undefined) user.realName = dto.realName
    if (dto.email !== undefined) user.email = dto.email
    if (dto.phone !== undefined) user.phone = dto.phone
    if (dto.status !== undefined) user.status = dto.status
    if (dto.username !== undefined) user.username = dto.username

    if (dto.roleIds) {
      if (dto.roleIds.length > 0) {
        const roles = await this.roleRepository.findBy({ roleId: In(dto.roleIds) })
        user.roles = roles
      } else {
        user.roles = []
      }
    }

    await this.userRepository.save(user)
    return this.findOne(id)
  }

  async softDelete(id: string) {
    const user = await this.userRepository.findOne({
      where: { userId: id, isDeleted: false },
    })
    if (!user) throw new NotFoundException('用户不存在')

    user.isDeleted = true
    user.roles = []
    await this.userRepository.save(user)

    // 🚀 联动 suspend 对应的 Sub Agent
    try {
      await this.agentManifestService.updateStatusByCode(`user-${id}`, 'inactive')
    } catch (e: any) {
      console.warn(`⚠️ Sub Agent 挂起失败: ${e.message}`)
    }
    return { message: '用户已删除' }
  }

  async toggleStatus(id: string) {
    const user = await this.userRepository.findOne({
      where: { userId: id, isDeleted: false },
    })
    if (!user) throw new NotFoundException('用户不存在')

    user.status = user.status === USER_STATUS[0] ? USER_STATUS[1] : USER_STATUS[0] // active ↔ disabled
    await this.userRepository.save(user)

    // 🚀 联动 Agent 状态
    try {
      const agentStatus = user.status === 'active' ? 'active' : 'inactive'
      await this.agentManifestService.updateStatusByCode(`user-${id}`, agentStatus)
    } catch (e: any) {
      console.warn(`⚠️ Agent 状态联动失败: ${e.message}`)
    }
    return this.findOne(id)
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepository.findOne({
      where: { userId, isDeleted: false },
    })
    if (!user) throw new NotFoundException('用户不存在')

    const valid = await bcrypt.compare(dto.oldPassword, user.passwordHash)
    if (!valid) throw new BadRequestException('旧密码不正确')

    user.passwordHash = await this.hashPassword(dto.newPassword)
    await this.userRepository.save(user)
    return { message: '密码修改成功' }
  }

  async resetPassword(adminId: string, userId: string, newPassword: string) {
    // 验证管理员存在
    const admin = await this.userRepository.findOne({
      where: { userId: adminId, isDeleted: false },
    })
    if (!admin) throw new NotFoundException('操作人不存在')

    const user = await this.userRepository.findOne({
      where: { userId, isDeleted: false },
    })
    if (!user) throw new NotFoundException('用户不存在')

    user.passwordHash = await this.hashPassword(newPassword)
    await this.userRepository.save(user)
    return { message: '密码已重置' }
  }

  async updateLastLogin(userId: string) {
    await this.userRepository.update(userId, {
      lastLoginAt: new Date(),
    })
  }
}
