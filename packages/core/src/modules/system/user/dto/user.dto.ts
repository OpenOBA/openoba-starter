import { IsString, IsOptional, IsEnum, IsArray, IsEmail, IsNotEmpty, MinLength, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { USER_STATUS } from '../../../../common/system-status'

export class CreateUserDto {
  @ApiProperty({ description: '用户名' })
  @IsString()
  @IsNotEmpty()
  username: string

  @ApiProperty({ description: '密码（明文，后端自动哈希）' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(64)
  password: string

  @ApiPropertyOptional({ description: '真实姓名' })
  @IsString()
  @IsOptional()
  realName?: string

  @ApiPropertyOptional({ description: '邮箱' })
  @IsEmail()
  @IsOptional()
  email?: string

  @ApiPropertyOptional({ description: '手机号' })
  @IsString()
  @IsOptional()
  phone?: string

  @ApiPropertyOptional({ description: '角色 ID 列表' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roleIds?: string[]
}

export class UpdateUserDto {
  @ApiPropertyOptional({ description: '用户名' })
  @IsString()
  @IsOptional()
  username?: string

  @ApiPropertyOptional({ description: '真实姓名' })
  @IsString()
  @IsOptional()
  realName?: string

  @ApiPropertyOptional({ description: '邮箱' })
  @IsEmail()
  @IsOptional()
  email?: string

  @ApiPropertyOptional({ description: '手机号' })
  @IsString()
  @IsOptional()
  phone?: string

  @ApiPropertyOptional({ description: '状态', enum: USER_STATUS })
  @IsEnum(USER_STATUS)
  @IsOptional()
  status?: string

  @ApiPropertyOptional({ description: '角色 ID 列表' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roleIds?: string[]
}

export class ChangePasswordDto {
  @ApiProperty({ description: '旧密码' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(64)
  oldPassword: string

  @ApiProperty({ description: '新密码' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(64)
  newPassword: string
}

export class ResetPasswordDto {
  @ApiProperty({ description: '用户 ID' })
  @IsString()
  @IsNotEmpty()
  userId: string

  @ApiProperty({ description: '新密码' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(64)
  newPassword: string
}

export class UserQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  page?: number

  @ApiPropertyOptional({ description: '每页条数', default: 20 })
  @IsOptional()
  pageSize?: number

  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsString()
  @IsOptional()
  keyword?: string

  @ApiPropertyOptional({ description: '状态筛选' })
  @IsString()
  @IsOptional()
  status?: string
}
