/* eslint-disable @typescript-eslint/no-explicit-any -- Jest mock 生态刚需 */
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { JwtService } from '@nestjs/jwt'
import { AuthService } from './auth.service'
import { User } from '../system/user/user.entity'
import * as bcrypt from 'bcrypt'

function mockRepo() {
  return {
    findOne: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  }
}

describe('AuthService', () => {
  let service: AuthService
  let userRepo: ReturnType<typeof mockRepo>
  let jwtService: { sign: jest.Mock }

  beforeEach(async () => {
    userRepo = mockRepo()
    jwtService = { sign: jest.fn().mockReturnValue('jwt-token') }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
  })

  describe('validateUser', () => {
    it('should return user on valid credentials', async () => {
      const hash = await bcrypt.hash('password', 10)
      userRepo.findOne.mockResolvedValue({
        userId: 'u1', username: 'admin', realName: 'Admin', status: 'active',
        passwordHash: hash, roles: [{ roleCode: 'admin' }],
      })

      const result = await service.validateUser('admin', 'password')
      expect(result).toBeDefined()
      expect(result.username).toBe('admin')
      expect(result.roles).toContain('admin')
    })

    it('should return null on wrong password', async () => {
      const hash = await bcrypt.hash('password', 10)
      userRepo.findOne.mockResolvedValue({
        userId: 'u1', passwordHash: hash, roles: [],
      })

      const result = await service.validateUser('admin', 'wrong')
      expect(result).toBeNull()
    })

    it('should return null when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null)
      const result = await service.validateUser('ghost', 'any')
      expect(result).toBeNull()
    })
  })

  describe('login', () => {
    it('should return access token', async () => {
      const result = await service.login({
        userId: 'u1', username: 'admin', realName: 'Admin', roles: ['admin'],
      })
      expect(result.accessToken).toBe('jwt-token')
      expect(result.user.username).toBe('admin')
      expect(userRepo.update).toHaveBeenCalled()
    })
  })

  describe('hashPassword', () => {
    it('should return bcrypt hash', async () => {
      const hash = await service.hashPassword('test')
      expect(hash).toBeDefined()
      expect(hash).toContain('$2')
    })
  })

  describe('getProfile', () => {
    it('should return user profile', async () => {
      userRepo.findOne.mockResolvedValue({
        userId: 'u1', username: 'admin', realName: 'Admin',
        roles: [{ roleCode: 'admin', roleName: '管理员' }],
      })
      const result = await service.getProfile('u1')
      expect(result).not.toBeNull()
      expect(result!.username).toBe('admin')
    })
  })
})
