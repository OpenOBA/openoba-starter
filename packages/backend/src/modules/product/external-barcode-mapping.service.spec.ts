/* eslint-disable @typescript-eslint/no-explicit-any -- Jest mock 生态刚需 */
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ExternalBarcodeMappingService } from './external-barcode-mapping.service'
import { ExternalBarcodeMapping } from './entity/external-barcode-mapping.entity'

describe('ExternalBarcodeMappingService', () => {
  let service: ExternalBarcodeMappingService
  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [ExternalBarcodeMappingService, { provide: getRepositoryToken(ExternalBarcodeMapping), useValue: { find: jest.fn().mockResolvedValue([]), findOne: jest.fn().mockResolvedValue(null), save: jest.fn((e:any)=>Promise.resolve(e)), create: jest.fn((d:any)=>d), delete: jest.fn().mockResolvedValue({affected:1}) } }],
    }).compile()
    service = m.get<ExternalBarcodeMappingService>(ExternalBarcodeMappingService)
  })
  it('should be defined', () => { expect(service).toBeDefined() })
})
