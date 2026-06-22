/* eslint-disable @typescript-eslint/no-explicit-any -- Jest mock 生态刚需 */
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { DraftPoolService } from './draft-pool.service'
import { DraftSpu } from './entities/draft-spu.entity'
import { DraftSku } from './entities/draft-sku.entity'
import { DraftBatch } from './entities/draft-batch.entity'
import { DraftPublishBatch } from './entities/draft-publish-batch.entity'
import { AdvisoryReport } from './entities/advisory-report.entity'
import { DraftTask } from './entities/draft-task.entity'
import { ProductSpu } from '../product/entity/product-spu.entity'
import { ProductSku } from '../product/entity/product-sku.entity'
import { StructureStandard } from '../structure/entity/structure-standard.entity'

describe('DraftPoolService', () => {
  let service: DraftPoolService
  beforeEach(async () => {
    const mr = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn((e: any) => Promise.resolve(e)),
      create: jest.fn((d: any) => d),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    }
    const m = await Test.createTestingModule({
      providers: [
        DraftPoolService,
        { provide: getRepositoryToken(DraftSpu), useValue: mr },
        { provide: getRepositoryToken(DraftSku), useValue: mr },
        { provide: getRepositoryToken(DraftBatch), useValue: mr },
        { provide: getRepositoryToken(DraftPublishBatch), useValue: mr },
        { provide: getRepositoryToken(AdvisoryReport), useValue: mr },
        { provide: getRepositoryToken(DraftTask), useValue: mr },
        { provide: getRepositoryToken(ProductSpu), useValue: mr },
        { provide: getRepositoryToken(ProductSku), useValue: mr },
        { provide: getRepositoryToken(StructureStandard), useValue: mr },
        { provide: DataSource, useValue: { query: jest.fn() } },
      ],
    }).compile()
    service = m.get<DraftPoolService>(DraftPoolService)
  })
  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
