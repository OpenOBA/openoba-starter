import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Customer } from '../customer/entity/customer.entity'

/** 官网账户状态（系统级枚举，非字典驱动） */
const ACCOUNT_STATUS = {
  NONE: 'none',
  ACTIVE: 'active',
  DEACTIVATED: 'deactivated',
  SUSPENDED: 'suspended',
} as const

@Injectable()
export class CustomerJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(Customer)
    private customerRepo: Repository<Customer>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('缺少认证信息')
    }

    const token = authHeader.split(' ')[1]
    try {
      // H08修复：使用JwtModule预配置的secret，不再每次读process.env
      const payload = this.jwtService.verify(token)
      const customer = await this.customerRepo.findOne({
        where: { customerId: payload.sub, isDeleted: false },
      })
      if (!customer) throw new UnauthorizedException('用户不存在')
      if (customer.accountStatus === ACCOUNT_STATUS.DEACTIVATED) throw new UnauthorizedException('账户已注销')
      if (customer.accountStatus === ACCOUNT_STATUS.SUSPENDED) throw new UnauthorizedException('账户已冻结')
      if (customer.accountStatus !== ACCOUNT_STATUS.ACTIVE) throw new UnauthorizedException('账户未注册')

      request.customer = customer
      request.customerId = customer.customerId
      return true
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e
      throw new UnauthorizedException('Token 无效或已过期')
    }
  }
}
