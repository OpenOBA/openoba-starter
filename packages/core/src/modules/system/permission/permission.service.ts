import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Permission } from './permission.entity'

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
  ) {}

  async findAll() {
    return this.permissionRepository.find({
      where: { isDeleted: false },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    })
  }

  async findOne(id: string) {
    const perm = await this.permissionRepository.findOne({
      where: { permissionId: id, isDeleted: false },
    })
    if (!perm) throw new NotFoundException('权限不存在')
    return perm
  }

  async create(dto: Partial<Permission>) {
    const perm = this.permissionRepository.create(dto)
    return this.permissionRepository.save(perm)
  }

  async update(id: string, dto: Partial<Permission>) {
    const perm = await this.findOne(id)
    Object.assign(perm, dto)
    return this.permissionRepository.save(perm)
  }

  async softDelete(id: string) {
    const perm = await this.findOne(id)
    perm.isDeleted = true
    await this.permissionRepository.save(perm)
    return { message: '权限已删除' }
  }
}
