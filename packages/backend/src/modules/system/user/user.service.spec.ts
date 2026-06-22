/* eslint-disable @typescript-eslint/no-explicit-any -- Jest mock 生态刚需 */
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { UserService } from './user.service'
import { User } from './user.entity'
import { Role } from '../role/role.entity'
import { AgentManifestService } from '../agent/agent-manifest.service'

describe('UserService', () => {
  let service: UserService
  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn().mockResolvedValue(null), find: jest.fn().mockResolvedValue([]), save: jest.fn((e:any)=>Promise.resolve(e)), create: jest.fn((d:any)=>d), delete: jest.fn().mockResolvedValue({affected:1}), count: jest.fn().mockResolvedValue(0) } },
        { provide: getRepositoryToken(Role), useValue: { findOne: jest.fn().mockResolvedValue(null), find: jest.fn().mockResolvedValue([]) } },
        { provide: AgentManifestService, useValue: {} },
      ],
    }).compile()
    service = m.get<UserService>(UserService)
  })
  it('should be defined', () => { expect(service).toBeDefined() })
})
