import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Inventory } from './entity/inventory.entity'
import { InventoryTransaction } from './entity/inventory-transaction.entity'
import { InventoryDocument } from './entity/inventory-document.entity'
import { QueryInventoryDto, QueryTransactionDto } from './dto/inventory.dto'

/**
 * 库存查询子 Service
 * 负责：分页查询、单品查询、流水查询、单据查询、统计
 */
@Injectable()
export class InventoryQueryService {
  constructor(
    @InjectRepository(Inventory)
    private inventoryRepo: Repository<Inventory>,
    @InjectRepository(InventoryTransaction)
    private transactionRepo: Repository<InventoryTransaction>,
    @InjectRepository(InventoryDocument)
    private documentRepo: Repository<InventoryDocument>,
  ) {}

  async findAll(dto: QueryInventoryDto) {
    const page = dto.page || 1
    const pageSize = dto.pageSize || 20
    const qb = this.inventoryRepo.createQueryBuilder('inv')

    if (dto.skuCode) qb.andWhere('inv.skuCode LIKE :skuCode', { skuCode: `%${dto.skuCode}%` })
    if (dto.structureStandardCode) qb.andWhere('inv.structureStandardCode = :ssc', { ssc: dto.structureStandardCode })
    if (dto.warehouseCode) qb.andWhere('inv.warehouseCode = :wc', { wc: dto.warehouseCode })
    if (dto.warningOnly === 'true') qb.andWhere('inv.availableQuantity <= inv.warningQuantity')

    qb.orderBy('inv.updatedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [items, total] = await qb.getManyAndCount()
    return { items, total, page, pageSize }
  }

  async findBySku(skuId: string, warehouseCode = 'WH-MAIN') {
    const inv = await this.inventoryRepo.findOne({
      where: { skuId, warehouseCode },
    })
    if (!inv) throw new NotFoundException('库存记录不存在')
    return inv
  }

  async findBySkuCode(skuCode: string, warehouseCode = 'WH-MAIN') {
    const inv = await this.inventoryRepo.findOne({
      where: { skuCode, warehouseCode },
    })
    if (!inv) throw new NotFoundException('库存记录不存在')
    return inv
  }

  async findTransactions(dto: QueryTransactionDto) {
    const page = dto.page || 1
    const pageSize = dto.pageSize || 20
    const qb = this.transactionRepo.createQueryBuilder('t')

    if (dto.skuId) qb.andWhere('t.skuId = :skuId', { skuId: dto.skuId })
    if (dto.skuCode) qb.andWhere('t.skuCode LIKE :skuCode', { skuCode: `%${dto.skuCode}%` })
    if (dto.structureStandardCode) qb.andWhere('t.structureStandardCode = :lsc', { lsc: dto.structureStandardCode })
    if (dto.transactionType) qb.andWhere('t.transactionType = :type', { type: dto.transactionType })
    if (dto.referenceType) qb.andWhere('t.referenceType = :rt', { rt: dto.referenceType })
    if (dto.referenceId) qb.andWhere('t.referenceId = :rid', { rid: dto.referenceId })

    qb.orderBy('t.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [items, total] = await qb.getManyAndCount()
    return { items, total, page, pageSize }
  }

  async getStats() {
    const total = await this.inventoryRepo.count()
    const lowStock = await this.inventoryRepo
      .createQueryBuilder('inv')
      .where('inv.availableQuantity < inv.warningQuantity')
      .getCount()
    const zeroStock = await this.inventoryRepo.count({
      where: { availableQuantity: 0 },
    })
    return { total, lowStock, zeroStock }
  }

  async findDocuments(params: { status?: string; docType?: string; page?: number; pageSize?: number }) {
    const page = params.page || 1
    const pageSize = params.pageSize || 20
    const qb = this.documentRepo.createQueryBuilder('d')

    if (params.status) qb.andWhere('d.status = :status', { status: params.status })
    if (params.docType) qb.andWhere('d.docType = :docType', { docType: params.docType })

    qb.orderBy('d.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
    const [items, total] = await qb.getManyAndCount()
    return { items, total, page, pageSize }
  }

  async cleanOldTransactions(days = 90) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const result = await this.transactionRepo
      .createQueryBuilder()
      .delete()
      .where('created_at < :cutoff', { cutoff })
      .execute()
    return { deleted: result.affected || 0 }
  }
}
