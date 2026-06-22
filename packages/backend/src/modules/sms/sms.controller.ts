/* eslint-disable @typescript-eslint/no-explicit-any -- 遗留 any，待 DTO 专项处理 */
import { Request } from 'express'
import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { SmsService } from './sms.service'
import { Public } from '../../common/decorators/public.decorator'
import { SendSmsCodeDto, VerifySmsCodeDto } from './dto/sms.dto'

@ApiTags('短信验证码')
@Public()
@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post('send-code')
  @ApiOperation({ summary: '发送验证码' })
  async sendCode(@Body() dto: SendSmsCodeDto, @Req() req: Request) {
    const ip = req.ip || req.connection?.remoteAddress
    return this.smsService.sendCode(dto, ip)
  }

  @Post('verify-code')
  @ApiOperation({ summary: '验证验证码' })
  async verifyCode(@Body() dto: VerifySmsCodeDto) {
    await this.smsService.verifyCode(dto)
    return { message: '验证成功' }
  }
}
