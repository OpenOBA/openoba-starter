/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { User } from '../system/user/user.entity'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { username, isDeleted: false },
      relations: ['roles'],
    })
    if (!user) return null

    const match = await bcrypt.compare(password, user.passwordHash)
    if (!match) return null

    return {
      userId: user.userId,
      username: user.username,
      realName: user.realName,
      status: user.status,
      roles: (user.roles || []).map((r) => r.roleCode),
    }
  }

  async login(userData: any) {
    await this.userRepository.update({ userId: userData.userId }, { lastLoginAt: new Date() })

    // P0修复：JWT payload 携带 roles，确保 RolesGuard 可正常校验
    const payload = {
      sub: userData.userId,
      username: userData.username,
      roles: userData.roles || [],
    }
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        userId: userData.userId,
        username: userData.username,
        realName: userData.realName,
        roles: userData.roles || [],
      },
    }
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10)
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { userId, isDeleted: false },
    })
    if (!user) return null
    return {
      userId: user.userId,
      username: user.username,
      realName: user.realName,
      status: user.status,
    }
  }

  // 统计活跃用户总数（含 admin/harold 等初始账号）
  async countActiveUsers(): Promise<number> {
    return this.userRepository.count({ where: { isDeleted: false } })
  }

  // 检查某个用户是否已存在且活跃
  async isUserActive(userId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { userId, isDeleted: false, status: 'active' },
    })
    return !!user
  }
}
