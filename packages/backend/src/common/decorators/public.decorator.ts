import { SetMetadata } from '@nestjs/common'

/** 标记接口为公开访问，无需 JWT 认证 */
export const IS_PUBLIC_KEY = 'isPublic'
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
