import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { RuleEngineService } from './rule-engine.service'
import { AestheticRule } from './entities/aesthetic-rule.entity'
import { AestheticCompatMatrix } from './entities/aesthetic-compat-matrix.entity'

describe('RuleEngineService', () => {
  let service: RuleEngineService
  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        RuleEngineService,
        { provide: getRepositoryToken(AestheticRule), useValue: { find: jest.fn().mockResolvedValue([]) } },
        { provide: getRepositoryToken(AestheticCompatMatrix), useValue: { find: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile()
    service = m.get<RuleEngineService>(RuleEngineService)
  })
  it('should be defined', () => { expect(service).toBeDefined() })
})
