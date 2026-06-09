import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SmsVerificationCode } from './entity/sms-verification-code.entity'
import { SmsService } from './sms.service'
import { SmsController } from './sms.controller'
import { AliyunSmsService } from './aliyun-sms.service'

@Module({
  imports: [TypeOrmModule.forFeature([SmsVerificationCode])],
  controllers: [SmsController],
  providers: [SmsService, AliyunSmsService],
  exports: [SmsService, AliyunSmsService],
})
export class SmsModule {}
