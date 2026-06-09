import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsOptional, IsEmail, MinLength, MaxLength, Matches } from 'class-validator'

export class RegisterCustomerDto {
  @ApiProperty({ description: '手机号（登录账号）' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string

  @ApiProperty({ minLength: 6, maxLength: 32 })
  @IsString()
  @MinLength(6)
  @MaxLength(32)
  password: string

  @ApiProperty({ description: '联系人姓名' })
  @IsString()
  contactName: string

  @ApiPropertyOptional({ description: '电子邮箱' })
  @IsOptional()
  @IsEmail()
  email?: string

  @ApiPropertyOptional({ description: '昵称' })
  @IsOptional()
  @IsString()
  nickname?: string
}

export class LoginCustomerDto {
  @ApiProperty({ description: '手机号' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string

  @ApiProperty()
  @IsString()
  password: string
}

export class ChangePasswordDto {
  @ApiProperty({ description: '当前密码' })
  @IsString()
  oldPassword: string

  @ApiProperty({ description: '新密码', minLength: 6, maxLength: 32 })
  @IsString()
  @MinLength(6)
  @MaxLength(32)
  newPassword: string
}

export class ResetPasswordRequestDto {
  @ApiProperty({ description: '手机号' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string
}

export class ResetPasswordConfirmDto {
  @ApiProperty({ description: '重置 Token' })
  @IsString()
  token: string

  @ApiProperty({ description: '新密码', minLength: 6, maxLength: 32 })
  @IsString()
  @MinLength(6)
  @MaxLength(32)
  newPassword: string
}

// ===== SMS 登录/注册 =====

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
