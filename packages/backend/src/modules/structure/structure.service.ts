import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import * as crypto from 'crypto'
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm'
import { Repository, Like, DataSource } from 'typeorm'
import { StructureStandard } from './entity/structure-standard.entity'
import { StructureStandardAttachment } from './entity/structure-standard-attachment.entity'
import { StructureCompatibility } from './entity/structure-compatibility.entity'
import {
  CreateStructureStandardDto,
  UpdateStructureStandardDto,
  CreateAttachmentDto,
  CreateCompatibilityDto,
  QueryStructureDto,
} from './dto/structure.dto'

@Injectable()
export class StructureService {
  constructor(
    @InjectRepository(StructureStandard)
    private structureRepo: Repository<StructureStandard>,
    @InjectRepository(StructureStandardAttachment)
    private attachRepo: Repository<StructureStandardAttachment>,
    @InjectRepository(StructureCompatibility)
    private compatRepo: Repository<StructureCompatibility>,
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  // ============ Structure Standard CRUD ============

  async findAll(query: QueryStructureDto) {
    const { keyword, shapeCode, seriesCode, status, page = 1, pageSize = 20 } = query
    const qb = this.structureRepo.createQueryBuilder('s').where('s.is_deleted = :deleted', { deleted: false })

    if (keyword) qb.andWhere('(s.external_code LIKE :kw OR s.internal_code LIKE :kw OR s.description LIKE :kw)', { kw: `%${keyword}%` })
    if (shapeCode) qb.andWhere('s.shape_code = :shape', { shape: shapeCode })
    if (seriesCode) qb.andWhere('s.series_code = :series', { series: seriesCode })
    if (status) qb.andWhere('s.status = :status', { status })

    const [items, total] = await qb
      .orderBy('s.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()

    // 批量查询造型/系列名称（避免 N+1）
    const shapeCodes = [...new Set(items.map((i) => i.shapeCode).filter(Boolean))]
    const seriesCodes = [...new Set(items.map((i) => i.seriesCode).filter(Boolean))]

    const shapeNames: Record<string, string> = {}
    const seriesNames: Record<string, string> = {}

    if (shapeCodes.length > 0) {
      const rows = await this.dataSource.query(
        `SELECT shape_code, shape_name FROM structure_shape WHERE shape_code IN (${shapeCodes.map(() => '?').join(', ')})`,
        shapeCodes,
      )
      for (const r of rows) shapeNames[r.shape_code] = r.shape_name
    }
    if (seriesCodes.length > 0) {
      const rows = await this.dataSource.query(
        `SELECT series_code, series_name FROM structure_series WHERE series_code IN (${seriesCodes.map(() => '?').join(', ')})`,
        seriesCodes,
      )
      for (const r of rows) seriesNames[r.series_code] = r.series_name
    }

    // 附加名称字段到每条记录
    for (const item of items) {
      if (item.shapeCode && shapeNames[item.shapeCode]) {
        ;(item as any).shape_name = shapeNames[item.shapeCode]
      }
      if (item.seriesCode && seriesNames[item.seriesCode]) {
        ;(item as any).series_name = seriesNames[item.seriesCode]
      }
    }

    return { items, total, page, pageSize }
  }

  async findOne(id: string) {
    const item = await this.structureRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.attachments', 'a')
      .leftJoinAndSelect('s.compatibilities', 'c')
      .where('s.structure_id = :id AND s.is_deleted = :deleted', { id, deleted: false })
      .getOne()
    if (!item) throw new NotFoundException(`结构标准 ${id} 不存在`)
    return item
  }

  async create(dto: CreateStructureStandardDto) {
    const externalCode = `S${String(Math.floor(dto.width)).padStart(2,'0')}${String(Math.floor(dto.height)).padStart(2,'0')}-${dto.shapeCode}`
    const internalCode = `${externalCode}-${Math.floor(dto.circumference)}-${dto.bridgeWidth || 0}-${dto.baseCurve || 200}C`

    // 检查是否已存在相同编码（同宽高+同造型+同周长 = 重复）
    const existing = await this.structureRepo.findOne({
      where: { externalCode, isDeleted: false } as any
    })
    if (existing) {
      throw new BadRequestException(
        `已存在相同规格的结构标准「${externalCode}」（周长 ${existing.circumference}mm）。` +
        `结构标准已覆盖此物理规格，无需重复创建。如需不同系列，直接使用该标准即可。`
      )
    }

    const entity = this.structureRepo.create({
      ...dto,
      externalCode,
      internalCode,
      isDeleted: false,
    })
    return this.structureRepo.save(entity)
  }

  async update(id: string, dto: UpdateStructureStandardDto) {
    const existing = await this.structureRepo.findOne({ where: { structureId: id, isDeleted: false } })
    if (!existing) throw new NotFoundException(`结构标准 ${id} 不存在`)

    // 后端兜底：编辑模式下前端不发送物理字段，若收到则直接拒绝
    if (dto.shapeCode != null || dto.width != null || dto.height != null
      || dto.circumference != null || dto.bridgeWidth != null || (dto as any).baseCurve != null) {
      throw new BadRequestException('物理属性不支持编辑修改。如需变更物理规格，请废弃当前标准（status=deprecated）后新建。')
    }

    if (dto.description !== undefined) existing.description = dto.description
    if (dto.status !== undefined) existing.status = dto.status
    if (dto.surfaceTypes !== undefined) existing.surfaceTypes = dto.surfaceTypes
    if (dto.refractiveIndexes !== undefined) existing.refractiveIndexes = dto.refractiveIndexes
    if (dto.seriesCode !== undefined) existing.seriesCode = dto.seriesCode ?? undefined
    return this.structureRepo.save(existing)
  }

  async remove(id: string) {
    const existing = await this.structureRepo.findOne({ where: { structureId: id, isDeleted: false } })
    if (!existing) throw new NotFoundException(`结构标准 ${id} 不存在`)
    return this.structureRepo.remove(existing)
  }

  // ============ Attachments ============

  async addAttachment(dto: CreateAttachmentDto) {
    const entity = this.attachRepo.create({ ...dto, attachmentId: `att-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 8)}` })
    return this.attachRepo.save(entity)
  }

  async removeAttachment(id: string) {
    return this.attachRepo.delete(id)
  }

  // ============ Compatibilities ============

  async addCompatibility(dto: CreateCompatibilityDto) {
    const entity = this.compatRepo.create({
      ...dto,
      compatId: `comp-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 8)}`,
      isActive: true,
    })
    return this.compatRepo.save(entity)
  }

  async removeCompatibility(id: string) {
    return this.compatRepo.delete(id)
  }

  async getCompatibleFrames(structureStandardCode: string) {
    return this.compatRepo.find({
      where: { structureStandardCode, isActive: true },
      order: { createdAt: 'DESC' },
    })
  }
}