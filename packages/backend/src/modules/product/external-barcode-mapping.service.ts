/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Injectable, NotFoundException } from '@nestjs/common'
import * as crypto from 'crypto'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ExternalBarcodeMapping } from './entity/external-barcode-mapping.entity'
import { STRUCT_STATUS } from '../../common/system-status'

@Injectable()
export class ExternalBarcodeMappingService {
  constructor(
    @InjectRepository(ExternalBarcodeMapping)
    private repo: Repository<ExternalBarcodeMapping>,
  ) {}

  async findAll(query: any) {
    const { page = 1, pageSize = 20, keyword, structureStandardCode, status } = query
    const qb = this.repo.createQueryBuilder('m').where('1=1')
    if (keyword)
      qb.andWhere('(m.external_barcode LIKE :kw OR m.external_brand LIKE :kw OR m.external_product LIKE :kw)', { kw: `%${keyword}%` })
    if (structureStandardCode) qb.andWhere('m.structure_standard_code = :ssc', { ssc: structureStandardCode })
    if (status) qb.andWhere('m.status = :st', { st: status })
    qb.orderBy('m.createdAt', 'DESC')
    const [items, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()
    return { items, total, page: +page, pageSize: +pageSize }
  }

  async findOne(id: string) {
    const item = await this.repo.findOne({ where: { mappingId: id } })
    if (!item) throw new NotFoundException('映射记录不存在')
    return item
  }

  async findByBarcode(barcode: string) {
    const item = await this.repo.findOne({ where: { externalBarcode: barcode } })
    if (!item) throw new NotFoundException(`外部条码 ${barcode} 未找到映射`)
    return item
  }

  async create(dto: any) {
    const mappingId = dto.mappingId || `ebm-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 8)}`
    // 字段映射：请求用 barcode/skuId，Entity 用 externalBarcode/skuId
    const entity = this.repo.create({
      mappingId,
      skuId: dto.skuId,
      externalBarcode: dto.barcode || dto.externalBarcode,
      externalBrand: dto.externalBrand || dto.brand,
      externalProduct: dto.externalProduct || dto.product,
      structureStandardCode: dto.structureStandardCode,
      inventorySkuId: dto.inventorySkuId,
      unitCost: dto.unitCost,
      source: dto.source,
      status: dto.status || STRUCT_STATUS[0], // @see STRUCT_STATUS
    })
    return this.repo.save(entity)
  }

  async update(id: string, dto: any) {
    const item = await this.findOne(id)
    Object.assign(item, dto)
    return this.repo.save(item)
  }

  async delete(id: string) {
    await this.findOne(id)
    await this.repo.delete(id)
    return { message: '已删除' }
  }
}