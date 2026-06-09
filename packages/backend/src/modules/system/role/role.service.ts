import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { Role } from './role.entity'
import { RolePermission } from './role-permission.entity'
import { Permission } from '../permission/permission.entity'
import { ROLE_STATUS } from '../../../common/system-status'

export class CreateRoleDto {
  roleCode: string
  roleName: string
  description?: string
  permissionIds?: string[]
}

export class UpdateRoleDto {
  roleName?: string
  description?: string
  status?: string
  permissionIds?: string[]
}

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(RolePermission)
    private rpRepo: Repository<RolePermission>,
    @InjectRepository(Permission)
    private permissionRepo: Repository<Permission>,
  ) {}

  async create(dto: CreateRoleDto) {
    const exists = await this.roleRepository.findOne({
      where: { roleCode: dto.roleCode, isDeleted: false },
    })
    if (exists) throw new ConflictException('角色编码已存在')

    const role = new Role()
    role.roleCode = dto.roleCode
    role.roleName = dto.roleName
    role.description = dto.description || undefined
    role.status = ROLE_STATUS[0] // active
    role.isDeleted = false

    const saved = await this.roleRepository.save(role)

    // 分配权限
    if (dto.permissionIds?.length) {
      await this.assignPermissions(saved.roleId, dto.permissionIds)
    }

    return saved
  }

  async findAll() {
    return this.roleRepository.find({
      where: { isDeleted: false },
      order: { createdAt: 'DESC' },
    })
  }

  async findOne(id: string) {
    const role = await this.roleRepository.findOne({
      where: { roleId: id, isDeleted: false },
    })
    if (!role) throw new NotFoundException('角色不存在')
    return role
  }

  /** 获取角色详情（含权限列表） */
  async findOneWithPermissions(id: string) {
    const role = await this.findOne(id)
    const rps = await this.rpRepo.find({ where: { roleId: id } })
    const permissionIds = rps.map((rp) => rp.permissionId)
    const permissions = permissionIds.length
      ? await this.permissionRepo.find({
          where: { permissionId: In(permissionIds), isDeleted: false },
        })
      : []
    return { ...role, permissions }
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.findOne(id)

    if (dto.roleName !== undefined) role.roleName = dto.roleName
    if (dto.description !== undefined) role.description = dto.description
    if (dto.status !== undefined) role.status = dto.status

    await this.roleRepository.save(role)

    // 更新权限分配
    if (dto.permissionIds !== undefined) {
      await this.rpRepo.delete({ roleId: id })
      if (dto.permissionIds.length) {
        await this.assignPermissions(id, dto.permissionIds)
      }
    }

    return role
  }

  async softDelete(id: string) {
    const role = await this.findOne(id)
    if (role.isDeleted) throw new NotFoundException('角色不存在')

    role.isDeleted = true
    await this.roleRepository.save(role)
    return { message: '角色已删除' }
  }

  /** 获取角色的权限 ID 列表 */
  async getPermissionIds(roleId: string): Promise<string[]> {
    const rps = await this.rpRepo.find({ where: { roleId } })
    return rps.map((rp) => rp.permissionId)
  }

  /** 获取角色的完整权限信息 */
  async getPermissions(roleId: string): Promise<Permission[]> {
    const rps = await this.rpRepo.find({ where: { roleId } })
    if (!rps.length) return []
    return this.permissionRepo.find({
      where: { permissionId: In(rps.map((rp) => rp.permissionId)), isDeleted: false },
    })
  }

  private async assignPermissions(roleId: string, permissionIds: string[]) {
    const entities = permissionIds.map((pid) =>
      this.rpRepo.create({ roleId, permissionId: pid }),
    )
    await this.rpRepo.save(entities)
  }
}
