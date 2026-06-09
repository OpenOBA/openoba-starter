import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Category } from './category.entity'
import { CreateCategoryDto, UpdateCategoryDto } from './category.dto'
import { generateCategoryCode } from '../product/utils/category-code.generator'

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name)

  constructor(
    @InjectRepository(Category) private repo: Repository<Category>,
  ) {}

  // ===== 查询 =====

  /** 获取全部分类（按排序） */
  async findAll(): Promise<Category[]> {
    return this.repo
      .createQueryBuilder('c')
      .orderBy('c.sort_order', 'ASC')
      .addOrderBy('c.createdAt', 'DESC')
      .getMany()
  }

  /** 树形结构查询 */
  async findTree(): Promise<Category[]> {
    const all = await this.findAll()
    return this.buildTree(all)
  }

  /** 根据 ID 查询单个 */
  async findOne(id: string): Promise<Category> {
    const item = await this.repo.findOne({ where: { categoryId: id } })
    if (!item) throw new NotFoundException('分类不存在')
    return item
  }

  /** 根据编码查询 */
  async findOneByCode(code: string): Promise<Category | null> {
    return this.repo.findOne({ where: { categoryCode: code } })
  }

  // ===== 新增 =====

  async create(dto: CreateCategoryDto): Promise<Category> {
    // 自动生成编码
    if (!dto.categoryCode || dto.categoryCode.trim() === '') {
      dto.categoryCode = await generateCategoryCode(this.repo as any)
    }
    // boolean → number for isRecommended
    if (typeof dto.isRecommended === 'boolean') {
      dto.isRecommended = dto.isRecommended ? 1 : 0
    }
    const entity = this.repo.create(dto)
    return this.repo.save(entity)
  }

  // ===== 更新 =====

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const item = await this.findOne(id)
    // boolean → number for isRecommended
    if (typeof dto.isRecommended === 'boolean') {
      dto.isRecommended = dto.isRecommended ? 1 : 0
    }
    Object.assign(item, dto)
    return this.repo.save(item)
  }

  // ===== 删除 =====

  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id)
    // 检查是否有子分类
    const children = await this.repo.find({ where: { parentId: id, isDeleted: false } })
    if (children.length > 0) {
      throw new BadRequestException('该分类下存在子分类，无法删除')
    }
    await this.repo.softDelete(id)
    return { message: '已删除' }
  }

  // ===== 批量排序 =====

  async batchSort(orderedIds: string[]): Promise<Category[]> {
    const queryRunner = this.repo.manager.connection.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()
    try {
      for (let i = 0; i < orderedIds.length; i++) {
        await queryRunner.manager.update(Category, { categoryId: orderedIds[i] }, { sortOrder: i })
      }
      await queryRunner.commitTransaction()
      return this.findAll()
    } catch (err) {
      await queryRunner.rollbackTransaction()
      throw err
    } finally {
      await queryRunner.release()
    }
  }

  // ===== 工具方法 =====

  /** 将扁平列表转为树形结构 */
  private buildTree(items: Category[]): Category[] {
    const map = new Map<string, Category & { children?: Category[] }>()
    const roots: (Category & { children?: Category[] })[] = []

    // 初始化
    items.forEach(item => {
      map.set(item.categoryId, { ...item, children: [] })
    })

    // 构建父子关系
    items.forEach(item => {
      const node = map.get(item.categoryId)!
      if (item.parentId && map.has(item.parentId)) {
        const parent = map.get(item.parentId)!
        parent.children = parent.children || []
        parent.children.push(node)
      } else {
        roots.push(node)
      }
    })

    return roots
  }
}
