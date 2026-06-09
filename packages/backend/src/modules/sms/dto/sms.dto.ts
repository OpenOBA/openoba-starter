import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsOptional, IsEnum, Matches, MinLength, MaxLength } from 'class-validator'

export enum SmsPurpose {
  LOGIN = 'login',
  BIND_PHONE = 'bind_phone',
  RESET = 'reset',
}

export class SendSmsCodeDto {
  @ApiProperty({ description: '手机号' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string

  @ApiPropertyOptional({ description: '用途', enum: SmsPurpose, default: 'login' })
  @IsOptional()
  @IsEnum(SmsPurpose)
  purpose?: SmsPurpose
}

export class VerifySmsCodeDto {
  @ApiProperty({ description: '手机号' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string

  @ApiProperty({ description: '6 位验证码' })
  @IsString()
  @Matches(/^\d{6}$/, { message: '验证码必须为 6 位数字' })
  code: string

  @ApiPropertyOptional({ description: '用途', enum: SmsPurpose, default: 'login' })
  @IsOptional()
  @IsEnum(SmsPurpose)
  purpose?: SmsPurpose
}

export class SmsLoginDto {
  @ApiProperty({ description: '手机号' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string

  @ApiProperty({ description: '6 位验证码' })
  @IsString()
  @Matches(/^\d{6}$/, { message: '验证码必须为 6 位数字' })
  code: string
}

export class SmsRegisterDto {
  @ApiProperty({ description: '手机号' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string

  @ApiProperty({ description: '6 位验证码' })
  @IsString()
  @Matches(/^\d{6}$/, { message: '验证码必须为 6 位数字' })
  code: string

  @ApiProperty({ description: '联系人姓名' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  contactName: string

  @ApiPropertyOptional({ description: '昵称' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string
}
