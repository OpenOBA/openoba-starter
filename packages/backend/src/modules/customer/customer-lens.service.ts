/* eslint-disable @typescript-eslint/no-explicit-any -- TODO: 需要类型化 */
import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { Customer } from './entity/customer.entity'
import { VisionPrescription } from './entity/vision-prescription.entity'
import { CustomerLens } from './entity/customer-lens.entity'
import { CustomerConsumptionProfile } from './entity/customer-consumption-profile.entity'
import { CUSTOMER_STATUS } from './entity/customer.entity'

/**
 * 客户镜片资产子 Service
 * 负责：验光处方 / 客户镜片 / 消费档案
 */
@Injectable()
export class CustomerLensService {
  constructor(
    @InjectRepository(VisionPrescription) private prescriptionRepo: Repository<VisionPrescription>,
    @InjectRepository(CustomerLens) private customerLensRepo: Repository<CustomerLens>,
    @InjectRepository(CustomerConsumptionProfile) private consumptionProfileRepo: Repository<CustomerConsumptionProfile>,
    private dataSource: DataSource,
  ) {}

  // ===== 验光处方 =====
  async createPrescription(customerId: string, dto: any) {
    const id = `rx-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 6)}`
    return this.prescriptionRepo.save(
      this.prescriptionRepo.create({
        ...dto, prescriptionId: id, customerId,
        prescriptionDate: dto.prescriptionDate ? new Date(dto.prescriptionDate) : null,
        expireDate: dto.expireDate ? new Date(dto.expireDate) : null,
        isDeleted: false, ocrVerified: false,
      }),
    )
  }

  async getPrescriptions(customerId: string) {
    return this.prescriptionRepo.find({ where: { customerId, isDeleted: false }, order: { createdAt: 'DESC' } })
  }

  async removePrescription(id: string) {
    const existing = await this.prescriptionRepo.findOne({ where: { prescriptionId: id, isDeleted: false } })
    if (!existing) throw new NotFoundException(`处方 ${id} 不存在`)
    existing.isDeleted = true
    return this.prescriptionRepo.save(existing)
  }

  // ===== 客户镜片 =====
  async createCustomerLens(customerId: string, dto: any) {
    const id = `cl-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 6)}`
    return this.customerLensRepo.save(
      this.customerLensRepo.create({
        ...dto, customerLensId: id, customerId,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        status: CUSTOMER_STATUS[0], isDeleted: false,
      }),
    )
  }

  async getCustomerLenses(customerId: string) {
    return this.customerLensRepo.find({ where: { customerId, isDeleted: false }, order: { createdAt: 'DESC' } })
  }

  async getCustomerLensSummary(customerId: string) {
    const lenses = await this.customerLensRepo
      .createQueryBuilder('cl')
      .leftJoinAndSelect('cl.prescription', 'rx')
      .where('cl.customer_id = :customerId AND cl.is_deleted = :deleted', { customerId, deleted: false })
      .orderBy('cl.created_at', 'DESC')
      .getMany()

    const codes = [...new Set(lenses.map((l) => l.structureStandardCode).filter(Boolean))]
    const lensMap = new Map<string, any>()
    if (codes.length > 0) {
      const placeholders = codes.map(() => '?').join(',')
      const rows = await this.dataSource.query(
        `SELECT external_code, shape_code, width, height, surface_types, refractive_indexes FROM structure_standard WHERE external_code IN (${placeholders})`,
        codes,
      )
      rows.forEach((r: any) => lensMap.set(r.external_code, r))
    }

    return {
      total: lenses.length,
      active: lenses.filter((l) => l.status === CUSTOMER_STATUS[0]).length,
      lenses: lenses.map((l) => {
        const std = lensMap.get(l.structureStandardCode)
        return {
          customerLensId: l.customerLensId,
          structureStandardCode: l.structureStandardCode,
          structureStandard: std ? { externalCode: std.external_code, shapeCode: std.shape_code, width: std.width, height: std.height, surfaceType: std.surface_type, refractiveIndex: std.refractive_index } : null,
          status: l.status, prescriptionId: l.prescriptionId,
          prescriptionLabel: l.prescription?.label || null,
          purchaseDate: l.purchaseDate, orderId: l.orderId, frameCount: 0, createdAt: l.createdAt,
        }
      }),
    }
  }

  async removeCustomerLens(id: string) {
    const existing = await this.customerLensRepo.findOne({ where: { customerLensId: id, isDeleted: false } })
    if (!existing) throw new NotFoundException(`客户镜片 ${id} 不存在`)
    existing.isDeleted = true
    return this.customerLensRepo.save(existing)
  }

  // ===== 消费档案 =====
  async createConsumptionProfile(customerLensId: string, dto: any) {
    const id = `cp-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 6)}`
    return this.consumptionProfileRepo.save(
      this.consumptionProfileRepo.create({
        ...dto, consumptionProfileId: id, customerLensId,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        useStatus: dto.useStatus || CUSTOMER_STATUS[0], isDeleted: false,
      }),
    )
  }

  async getConsumptionProfiles(customerLensId: string) {
    return this.consumptionProfileRepo.find({ where: { customerLensId, isDeleted: false }, order: { createdAt: 'DESC' } })
  }

  async removeConsumptionProfile(id: string) {
    const existing = await this.consumptionProfileRepo.findOne({ where: { consumptionProfileId: id, isDeleted: false } })
    if (!existing) throw new NotFoundException(`消费档案 ${id} 不存在`)
    existing.isDeleted = true
    return this.consumptionProfileRepo.save(existing)
  }
}
