import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { Customer } from '../customer/entity/customer.entity'
import { SmsModule } from '../sms/sms.module'
import { CustomerAuthService } from './customer-auth.service'
import { CustomerAuthController } from './customer-auth.controller'
import { CustomerAuthAdminController } from './customer-auth-admin.controller'
import { CustomerJwtGuard } from './customer-auth.guard'
import { CustomerLoginLog } from './entity/customer-login-log.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, CustomerLoginLog]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // P0修复(C11)：移除硬编码fallback，生产漏配时启动失败
        secret: config.getOrThrow('CUSTOMER_JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
    SmsModule,
  ],
  controllers: [CustomerAuthController, CustomerAuthAdminController],
  providers: [CustomerAuthService, CustomerJwtGuard],
  exports: [CustomerAuthService],
})
export class CustomerAuthModule {}
