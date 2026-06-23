/* eslint-disable @typescript-eslint/no-explicit-any -- TODO: 需要类型化 */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like } from 'typeorm'
import { SubSku } from './entity/sub-sku.entity'
import { SubSkuCategory } from './entity/sub-sku-category.entity'
import {
  CreateSubSkuDto,
  UpdateSubSkuDto,
  CreateSubSkuCategoryDto,
  UpdateSubSkuCategoryDto,
  QuerySubSkuDto,
} from './dto/sub-sku.dto'
import { v4 as uuidv4 } from 'uuid'

@Injectable()
export class SubSkuService {
  constructor(
    @InjectRepository(SubSku)
    private subSkuRepo: Repository<SubSku>,
    @InjectRepository(SubSkuCategory)
    private categoryRepo: Repository<SubSkuCategory>,
  ) {}

  // ============ 分类 CRUD ============

  async getCategoryTree() {
    const categories = await this.categoryRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    })
    return this.buildTree(categories)
  }

  async getAllCategories() {
    return this.categoryRepo.find({ order: { sortOrder: 'ASC' } })
  }

  async createCategory(dto: CreateSubSkuCategoryDto) {
    const cat = this.categoryRepo.create({
      id: uuidv4(),
      ...dto,
    })
    return this.categoryRepo.save(cat)
  }

  async updateCategory(id: string, dto: UpdateSubSkuCategoryDto) {
    const cat = await this.categoryRepo.findOneBy({ id })
    if (!cat) throw new NotFoundException('分类不存在')
    Object.assign(cat, dto)
    return this.categoryRepo.save(cat)
  }

  async deleteCategory(id: string) {
    const cat = await this.categoryRepo.findOneBy({ id })
    if (!cat) throw new NotFoundException('分类不存在')
    cat.isActive = false
    return this.categoryRepo.save(cat)
  }

  // ============ SubSku CRUD ============

  async findAll(query: QuerySubSkuDto) {
    const where: Record<string, unknown> = {}
    if (query.categoryId) where.categoryId = query.categoryId
    if (query.isActive !== undefined) where.isActive = query.isActive

    const qb = this.subSkuRepo
      .createQueryBuilder('sku')
      .leftJoinAndSelect('sku.category', 'category')
      .orderBy('sku.sort_order', 'ASC')

    if (query.categoryId) {
      qb.andWhere('sku.category_id = :categoryId', { categoryId: query.categoryId })
    }
    if (query.keyword) {
      qb.andWhere('(sku.name LIKE :kw OR sku.code LIKE :kw)', { kw: `%${query.keyword}%` })
    }
    if (query.isActive !== undefined) {
      qb.andWhere('sku.is_active = :isActive', { isActive: query.isActive })
    }

    return qb.getMany()
  }

  async findOne(id: string) {
    const sku = await this.subSkuRepo.findOne({
      where: { id },
      relations: ['category'],
    })
    if (!sku) throw new NotFoundException('副品不存在')
    return sku
  }

  async create(dto: CreateSubSkuDto) {
    // 验证分类存在
    const cat = await this.categoryRepo.findOneBy({ id: dto.categoryId })
    if (!cat) throw new BadRequestException('分类不存在')

    const sku = this.subSkuRepo.create({
      id: uuidv4(),
      ...dto,
    })
    return this.subSkuRepo.save(sku)
  }

  async update(id: string, dto: UpdateSubSkuDto) {
    const sku = await this.subSkuRepo.findOneBy({ id })
    if (!sku) throw new NotFoundException('副品不存在')

    if (dto.categoryId) {
      const cat = await this.categoryRepo.findOneBy({ id: dto.categoryId })
      if (!cat) throw new BadRequestException('分类不存在')
    }

    Object.assign(sku, dto)
    return this.subSkuRepo.save(sku)
  }

  async remove(id: string) {
    const sku = await this.subSkuRepo.findOneBy({ id })
    if (!sku) throw new NotFoundException('副品不存在')
    sku.isActive = false
    return this.subSkuRepo.save(sku)
  }

  // ============ 展示名生成 ============

  /**
   * 根据规格参数自动生成展示名
   * 格式：品牌 - 功能 - 膜层 - 折射率俗称镜片
   */
  async generateDisplayName(dto: CreateSubSkuDto | UpdateSubSkuDto): Promise<string> {
    // 非镜片类商品：直接使用传入的 name
    if (!dto.specValues) return dto.name || ''

    const sv = dto.specValues as Record<string, string | undefined>
    const brand = '秒镜'
    const func = sv.lens_function_display || sv.lens_function || ''
    const coat = sv.coating_display || sv.coating || ''
    const ri = sv.refractive_index_display || sv.refractive_index || ''

    if (!func && !ri) return (dto.name as string) || ''

    const parts = [brand]
    if (func) parts.push(func)
    if (coat) parts.push(coat)
    if (ri) parts.push(`${ri}镜片`)

    return parts.join(' - ')
  }

  // ============ 辅助 ============

  private buildTree(categories: SubSkuCategory[]): Record<string, unknown>[] {
    interface TreeNode extends SubSkuCategory { children: TreeNode[] }
    const map = new Map<string, TreeNode>()
    const roots: TreeNode[] = []

    categories.forEach((c) => {
      map.set(c.id, { ...c, children: [] })
    })

    categories.forEach((c) => {
      const node = map.get(c.id)!
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId)!.children.push(node)
      } else {
        roots.push(node)
      }
    })

    return roots as unknown as Record<string, unknown>[]
  }
}
