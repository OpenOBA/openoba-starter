import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { Role } from './role.entity'
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

    // 分配权限（通过 ManyToMany cascade）
    if (dto.permissionIds?.length) {
      role.permissions = await this.permissionRepo.findBy({
        permissionId: In(dto.permissionIds),
        isDeleted: false,
      })
    }

    return this.roleRepository.save(role)
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
    const role = await this.roleRepository.findOne({
      where: { roleId: id, isDeleted: false },
      relations: ['permissions'],
    })
    if (!role) throw new NotFoundException('角色不存在')
    return role
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.roleRepository.findOne({
      where: { roleId: id, isDeleted: false },
      relations: ['permissions'],
    })
    if (!role) throw new NotFoundException('角色不存在')

    if (dto.roleName !== undefined) role.roleName = dto.roleName
    if (dto.description !== undefined) role.description = dto.description
    if (dto.status !== undefined) role.status = dto.status

    // 更新权限分配
    if (dto.permissionIds !== undefined) {
      if (dto.permissionIds.length > 0) {
        role.permissions = await this.permissionRepo.findBy({
          permissionId: In(dto.permissionIds),
          isDeleted: false,
        })
      } else {
        role.permissions = []
      }
    }

    return this.roleRepository.save(role)
  }

  async softDelete(id: string) {
    const role = await this.findOne(id)
    if (role.isDeleted) throw new NotFoundException('角色不存在')

    role.isDeleted = true
    role.permissions = []
    await this.roleRepository.save(role)
    return { message: '角色已删除' }
  }

  /** 获取角色的权限 ID 列表 */
  async getPermissionIds(roleId: string): Promise<string[]> {
    const role = await this.roleRepository.findOne({
      where: { roleId, isDeleted: false },
      relations: ['permissions'],
    })
    if (!role) return []
    return (role.permissions || []).map(p => p.permissionId)
  }

  /** 获取角色的完整权限信息 */
  async getPermissions(roleId: string): Promise<Permission[]> {
    const role = await this.roleRepository.findOne({
      where: { roleId, isDeleted: false },
      relations: ['permissions'],
    })
    return role?.permissions || []
  }
}
