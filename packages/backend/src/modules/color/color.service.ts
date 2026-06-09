import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { randomUUID } from 'crypto'
import { ColorMaterialMapping } from './entity/color-material-mapping.entity'
import { ColorSeasonalPalette } from './entity/color-seasonal-palette.entity'
import { ColorPaletteItem } from './entity/color-palette-item.entity'
import { ColorDesignProject } from './entity/color-design-project.entity'
import { ColorProjectColor } from './entity/color-project-color.entity'
import {
  CreateColorMaterialMappingDto,
  UpdateColorMaterialMappingDto,
  QueryColorMaterialMappingDto,
  CreateColorSeasonalPaletteDto,
  UpdateColorSeasonalPaletteDto,
  QueryColorSeasonalPaletteDto,
  CreatePaletteItemDto,
  CreateColorDesignProjectDto,
  UpdateColorDesignProjectDto,
  QueryColorDesignProjectDto,
  CreateProjectColorDto,
} from './dto/color.dto'
import { COLOR_STATUS } from './color.constants'

@Injectable()
export class ColorService {
  constructor(
    @InjectRepository(ColorMaterialMapping)
    private mappingRepo: Repository<ColorMaterialMapping>,
    @InjectRepository(ColorSeasonalPalette)
    private paletteRepo: Repository<ColorSeasonalPalette>,
    @InjectRepository(ColorPaletteItem)
    private paletteItemRepo: Repository<ColorPaletteItem>,
    @InjectRepository(ColorDesignProject)
    private projectRepo: Repository<ColorDesignProject>,
    @InjectRepository(ColorProjectColor)
    private projectColorRepo: Repository<ColorProjectColor>,
  ) {}

  // ============ Color Material Mapping CRUD ============

  async findAllMappings(query: QueryColorMaterialMappingDto) {
    const { materialCode, colorCode, feasibility, page = 1, pageSize = 20 } = query
    const qb = this.mappingRepo.createQueryBuilder('m').where('1=1')

    if (materialCode) qb.andWhere('m.material_code = :mc', { mc: materialCode })
    if (colorCode) qb.andWhere('m.color_code = :cc', { cc: colorCode })
    if (feasibility) qb.andWhere('m.feasibility = :f', { f: feasibility })

    const [items, total] = await qb
      .orderBy('m.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()
    return { items, total, page, pageSize }
  }

  async findOneMapping(id: string) {
    const item = await this.mappingRepo.findOne({ where: { mappingId: id } })
    if (!item) throw new NotFoundException(`材质-色彩映射 ${id} 不存在`)
    return item
  }

  async createMapping(dto: CreateColorMaterialMappingDto) {
    const entity = this.mappingRepo.create({
      ...dto,
      mappingId: randomUUID(),
      isActive: true,
    })
    return this.mappingRepo.save(entity)
  }

  async updateMapping(id: string, dto: UpdateColorMaterialMappingDto) {
    const existing = await this.mappingRepo.findOne({ where: { mappingId: id } })
    if (!existing) throw new NotFoundException(`材质-色彩映射 ${id} 不存在`)
    Object.assign(existing, dto)
    return this.mappingRepo.save(existing)
  }

  async removeMapping(id: string) {
    const result = await this.mappingRepo.delete(id)
    if (result.affected === 0) throw new NotFoundException(`材质-色彩映射 ${id} 不存在`)
    return { message: '删除成功' }
  }

  // Query by material: get all feasible colors for a material
  async getFeasibleColors(materialCode: string) {
    return this.mappingRepo.find({
      where: { materialCode, feasibility: 'feasible', isActive: true },
      order: { createdAt: 'DESC' },
    })
  }

  // ============ Color Seasonal Palette CRUD ============

  async findAllPalettes(query: QueryColorSeasonalPaletteDto) {
    const { season, status, keyword, page = 1, pageSize = 20 } = query
    const qb = this.paletteRepo.createQueryBuilder('p').where('1=1')

    if (season) qb.andWhere('p.season = :s', { s: season })
    if (status) qb.andWhere('p.status = :st', { st: status })
    if (keyword) qb.andWhere('(p.palette_name LIKE :kw OR p.theme LIKE :kw)', { kw: `%${keyword}%` })

    const [items, total] = await qb
      .orderBy('p.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()
    return { items, total, page, pageSize }
  }

  async findOnePalette(id: string) {
    const item = await this.paletteRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.items', 'i')
      .where('p.palette_id = :id', { id })
      .orderBy('i.sort_order', 'ASC')
      .getOne()
    if (!item) throw new NotFoundException(`色盘 ${id} 不存在`)
    return item
  }

  async createPalette(dto: CreateColorSeasonalPaletteDto) {
    const entity = this.paletteRepo.create({
      ...dto,
      paletteId: randomUUID(),
      status: COLOR_STATUS.draft,
    })
    return this.paletteRepo.save(entity)
  }

  async updatePalette(id: string, dto: UpdateColorSeasonalPaletteDto) {
    const existing = await this.paletteRepo.findOne({ where: { paletteId: id } })
    if (!existing) throw new NotFoundException(`色盘 ${id} 不存在`)
    Object.assign(existing, dto)
    return this.paletteRepo.save(existing)
  }

  async removePalette(id: string) {
    const result = await this.paletteRepo.delete(id)
    if (result.affected === 0) throw new NotFoundException(`色盘 ${id} 不存在`)
    return { message: '删除成功' }
  }

  // ============ Palette Item CRUD ============

  async addPaletteItem(dto: CreatePaletteItemDto) {
    const entity = this.paletteItemRepo.create({
      ...dto,
      itemId: randomUUID(),
    })
    return this.paletteItemRepo.save(entity)
  }

  async removePaletteItem(id: string) {
    const result = await this.paletteItemRepo.delete(id)
    if (result.affected === 0) throw new NotFoundException(`色盘颜色项 ${id} 不存在`)
    return { message: '删除成功' }
  }

  // ============ Color Design Project CRUD ============

  async findAllProjects(query: QueryColorDesignProjectDto) {
    const { status, targetSeason, priority, keyword, page = 1, pageSize = 20 } = query
    const qb = this.projectRepo.createQueryBuilder('p').where('1=1')

    if (status) qb.andWhere('p.status = :st', { st: status })
    if (targetSeason) qb.andWhere('p.target_season = :ts', { ts: targetSeason })
    if (priority) qb.andWhere('p.priority = :pr', { pr: priority })
    if (keyword) qb.andWhere('(p.project_name LIKE :kw OR p.project_code LIKE :kw)', { kw: `%${keyword}%` })

    const [items, total] = await qb
      .orderBy('p.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()
    return { items, total, page, pageSize }
  }

  async findOneProject(id: string) {
    const item = await this.projectRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.colors', 'c')
      .leftJoinAndSelect('p.palette', 'pal')
      .where('p.project_id = :id', { id })
      .orderBy('c.sort_order', 'ASC')
      .getOne()
    if (!item) throw new NotFoundException(`色彩设计项目 ${id} 不存在`)
    return item
  }

  async createProject(dto: CreateColorDesignProjectDto) {
    const entity = this.projectRepo.create({
      ...dto,
      projectId: randomUUID(),
      status: COLOR_STATUS.draft,
      targetLaunchDate: dto.targetLaunchDate ? new Date(dto.targetLaunchDate) : undefined,
    })
    return this.projectRepo.save(entity)
  }

  async updateProject(id: string, dto: UpdateColorDesignProjectDto) {
    const existing = await this.projectRepo.findOne({ where: { projectId: id } })
    if (!existing) throw new NotFoundException(`色彩设计项目 ${id} 不存在`)
    Object.assign(existing, {
      ...dto,
      targetLaunchDate: dto.targetLaunchDate ? new Date(dto.targetLaunchDate) : existing.targetLaunchDate,
      approvedAt: dto.status === 'approved' && !existing.approvedAt ? new Date() : existing.approvedAt,
    })
    return this.projectRepo.save(existing)
  }

  async removeProject(id: string) {
    const result = await this.projectRepo.delete(id)
    if (result.affected === 0) throw new NotFoundException(`色彩设计项目 ${id} 不存在`)
    return { message: '删除成功' }
  }

  // ============ Project Color CRUD ============

  async addProjectColor(dto: CreateProjectColorDto) {
    const entity = this.projectColorRepo.create({
      ...dto,
      projectColorId: randomUUID(),
    })
    return this.projectColorRepo.save(entity)
  }

  async removeProjectColor(id: string) {
    const result = await this.projectColorRepo.delete(id)
    if (result.affected === 0) throw new NotFoundException(`项目颜色项 ${id} 不存在`)
    return { message: '删除成功' }
  }

  async getProjectColors(projectId: string) {
    return this.projectColorRepo.find({
      where: { projectId },
      order: { sortOrder: 'ASC' },
    })
  }
}
