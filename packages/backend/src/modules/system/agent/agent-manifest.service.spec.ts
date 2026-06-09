import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { AgentManifestService } from './agent-manifest.service'
import { AgentManifest } from './agent-manifest.entity'

describe('AgentManifestService', () => {
  let service: AgentManifestService
  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [AgentManifestService, { provide: getRepositoryToken(AgentManifest), useValue: { find: jest.fn().mockResolvedValue([]), findOne: jest.fn().mockResolvedValue(null), save: jest.fn((e:any)=>Promise.resolve(e)), create: jest.fn((d:any)=>d), delete: jest.fn().mockResolvedValue({affected:1}) } }],
    }).compile()
    service = m.get<AgentManifestService>(AgentManifestService)
  })
  it('should be defined', () => { expect(service).toBeDefined() })
})
