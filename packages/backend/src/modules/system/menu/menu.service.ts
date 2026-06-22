import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Menu } from './menu.entity'

export interface CreateMenuDto {
  menuCode: string
  menuName: string
  parentId?: string
  menuType?: string
  path?: string
  icon?: string
  sortOrder?: number
  permissionCode?: string
  isVisible?: boolean
}

export interface UpdateMenuDto {
  menuCode?: string
  menuName?: string
  parentId?: string | null
  menuType?: string
  path?: string
  icon?: string
  sortOrder?: number
  permissionCode?: string
  isVisible?: boolean
}

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Menu)
    private menuRepo: Repository<Menu>,
  ) {}

  /** 获取菜单树 */
  async findTree(): Promise<Menu[]> {
    const allMenus = await this.menuRepo.find({
      where: { isDeleted: false },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    })
    return this.buildTree(allMenus)
  }

  /** 平铺列表 */
  async findAll(): Promise<Menu[]> {
    return this.menuRepo.find({
      where: { isDeleted: false },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    })
  }

  async findOne(menuId: string): Promise<Menu> {
    const menu = await this.menuRepo.findOne({
      where: { menuId, isDeleted: false },
    })
    if (!menu) throw new NotFoundException('菜单不存在')
    return menu
  }

  async create(dto: CreateMenuDto): Promise<Menu> {
    const menu = new Menu()
    menu.menuCode = dto.menuCode
    menu.menuName = dto.menuName
    menu.parentId = dto.parentId || null
    menu.menuType = dto.menuType || 'menu'
    menu.path = dto.path || ''
    menu.icon = dto.icon || ''
    menu.sortOrder = dto.sortOrder || 0
    menu.permissionCode = dto.permissionCode || ''
    menu.isVisible = dto.isVisible ?? true
    return this.menuRepo.save(menu)
  }

  async update(menuId: string, dto: UpdateMenuDto): Promise<Menu> {
    const menu = await this.findOne(menuId)
    if (dto.menuCode !== undefined) menu.menuCode = dto.menuCode
    if (dto.menuName !== undefined) menu.menuName = dto.menuName
    if (dto.parentId !== undefined) menu.parentId = dto.parentId
    if (dto.menuType !== undefined) menu.menuType = dto.menuType
    if (dto.path !== undefined) menu.path = dto.path
    if (dto.icon !== undefined) menu.icon = dto.icon
    if (dto.sortOrder !== undefined) menu.sortOrder = dto.sortOrder
    if (dto.permissionCode !== undefined) menu.permissionCode = dto.permissionCode
    if (dto.isVisible !== undefined) menu.isVisible = dto.isVisible
    return this.menuRepo.save(menu)
  }

  async softDelete(menuId: string): Promise<{ message: string }> {
    const menu = await this.findOne(menuId)
    menu.isDeleted = true
    await this.menuRepo.save(menu)
    return { message: '菜单已删除' }
  }

  /** 更新排序 */
  async updateSort(items: { menuId: string; sortOrder: number }[]): Promise<{ message: string }> {
    for (const item of items) {
      await this.menuRepo.update(item.menuId, { sortOrder: item.sortOrder } as Partial<Menu>)
    }
    return { message: '排序已更新' }
  }

  /** 递归构建菜单树 */
  private buildTree(menus: Menu[], parentId: string | null = null): Menu[] {
    return menus
      .filter((m) => (parentId === null ? !m.parentId : m.parentId === parentId))
      .map((m) => {
        const node = { ...m, children: [] as Menu[] }
        node.children = this.buildTree(menus, m.menuId)
        return node as Menu & { children?: Menu[] }
      }) as unknown as Menu[]
  }
}
