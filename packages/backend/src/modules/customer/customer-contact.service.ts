import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CustomerContact } from './entity/customer-contact.entity'
import { CustomerAddress } from './entity/customer-address.entity'
import { CreateContactDto, UpdateContactDto, CreateAddressDto, UpdateAddressDto } from './dto/customer.dto'

/**
 * 瀹㈡埛鑱旂郴浜?& 鍦板潃瀛?Service
 */
@Injectable()
export class CustomerContactService {
  constructor(
    @InjectRepository(CustomerContact) private contactRepo: Repository<CustomerContact>,
    @InjectRepository(CustomerAddress) private addressRepo: Repository<CustomerAddress>,
  ) {}

  // ===== 鑱旂郴浜?=====
  async addContact(dto: CreateContactDto) {
    const id = `con-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 6)}`
    return this.contactRepo.save(this.contactRepo.create({ ...dto, contactId: id, isDeleted: false }))
  }

  async updateContact(id: string, dto: UpdateContactDto) {
    const existing = await this.contactRepo.findOne({ where: { contactId: id, isDeleted: false } })
    if (!existing) throw new NotFoundException(`鑱旂郴浜?${id} 涓嶅瓨鍦╜)
    Object.assign(existing, dto)
    return this.contactRepo.save(existing)
  }

  async removeContact(id: string) {
    const existing = await this.contactRepo.findOne({ where: { contactId: id, isDeleted: false } })
    if (!existing) throw new NotFoundException(`鑱旂郴浜?${id} 涓嶅瓨鍦╜)
    existing.isDeleted = true
    return this.contactRepo.save(existing)
  }

  async getContacts(customerId: string) {
    return this.contactRepo.find({ where: { customerId, isDeleted: false }, order: { isPrimary: 'DESC', createdAt: 'DESC' } })
  }

  // ===== 鍦板潃 =====
  async addAddress(dto: CreateAddressDto) {
    const id = `addr-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 6)}`
    if (dto.isDefault) await this.addressRepo.update({ customerId: dto.customerId, isDeleted: false }, { isDefault: false })
    return this.addressRepo.save(this.addressRepo.create({ ...dto, addressId: id, isDeleted: false }))
  }

  async updateAddress(id: string, dto: UpdateAddressDto) {
    const existing = await this.addressRepo.findOne({ where: { addressId: id, isDeleted: false } })
    if (!existing) throw new NotFoundException(`鍦板潃 ${id} 涓嶅瓨鍦╜)
    if (dto.isDefault && existing.customerId)
      await this.addressRepo.update({ customerId: existing.customerId, isDeleted: false }, { isDefault: false })
    Object.assign(existing, dto)
    return this.addressRepo.save(existing)
  }

  async removeAddress(id: string) {
    const existing = await this.addressRepo.findOne({ where: { addressId: id, isDeleted: false } })
    if (!existing) throw new NotFoundException(`鍦板潃 ${id} 涓嶅瓨鍦╜)
    existing.isDeleted = true
    return this.addressRepo.save(existing)
  }

  async getAddresses(customerId: string) {
    return this.addressRepo.find({ where: { customerId, isDeleted: false }, order: { isDefault: 'DESC', createdAt: 'DESC' } })
  }
}
