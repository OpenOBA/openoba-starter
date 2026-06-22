/* eslint-disable @typescript-eslint/no-explicit-any -- CORE 泛型/第三方库约束 */
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, SetMetadata } from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

/**
 * 跳过响应格式转换的装饰器
 * 用于官网前台 API，返回原始数据而非 {code, message, data, timestamp} 包装格式
 */
export const SkipTransform = () => SetMetadata('skipTransform', true)

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // 检查是否标记了跳过转换（官网 API）
    const skipTransform = context.getHandler() ? Reflect.getMetadata('skipTransform', context.getHandler()) : false

    if (skipTransform) {
      return next.handle()
    }

    return next.handle().pipe(
      map((data) => ({
        code: 0,
        message: 'success',
        data,
        timestamp: Date.now(),
      })),
    )
  }
}
