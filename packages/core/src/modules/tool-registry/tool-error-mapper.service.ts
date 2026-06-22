/* eslint-disable @typescript-eslint/no-explicit-any -- CORE 泛型/第三方库约束 */
/**
 * 秒镜 AI-BOS · ToolRegistry — 异常映射服务
 *
 * @file 将 NestJS/TypeORM 异常映射为安全的 ToolError
 *       核心原则：绝不暴露堆栈、SQL、内部路径
 * @author 唐浩然（秒镜 AI 联合创始人）
 * @since 2026-05-19
 */

import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException, HttpException } from '@nestjs/common'
import { TypeORMError, QueryFailedError } from 'typeorm'
import { ToolError } from './types/tool.interface'

@Injectable()
export class ToolErrorMapper {
  private readonly logger = new Logger(ToolErrorMapper.name)

  /**
   * 将任意异常映射为安全的 ToolError
   */
  map(error: unknown): ToolError {
    // ---- 已知 HTTP 异常 ----
    if (error instanceof NotFoundException) {
      return {
        code: 'NOT_FOUND',
        message: this.sanitizeMessage(error.message),
        safeForLLM: true,
      }
    }

    if (error instanceof BadRequestException) {
      const resp = error.getResponse()
      const message = typeof resp === 'string' ? resp : (resp as any)?.message || error.message
      return {
        code: 'BAD_REQUEST',
        message: Array.isArray(message) ? message.join('; ') : this.sanitizeMessage(String(message)),
        safeForLLM: true,
      }
    }

    if (error instanceof ForbiddenException) {
      return {
        code: 'FORBIDDEN',
        message: '权限不足，无法执行此操作',
        safeForLLM: true,
      }
    }

    if (error instanceof HttpException) {
      return {
        code: 'HTTP_ERROR',
        message: this.sanitizeMessage(error.message),
        safeForLLM: true,
      }
    }

    // ---- 数据库异常（不泄露 SQL）-—-
    if (error instanceof QueryFailedError) {
      this.logger.error(`QueryFailedError masked: ${error.message.substring(0, 200)}`)
      return {
        code: 'DATABASE_ERROR',
        message: '数据库操作失败，请稍后重试',
        safeForLLM: true,
      }
    }

    if (error instanceof TypeORMError) {
      this.logger.error(`TypeORMError masked: ${error.message.substring(0, 200)}`)
      return {
        code: 'DATABASE_ERROR',
        message: '数据库操作失败，请稍后重试',
        safeForLLM: true,
      }
    }

    // ---- 未知异常（严格保密）-—-
    if (error instanceof Error) {
      this.logger.error(`Unhandled error: ${error.message}`, error.stack)
      return {
        code: 'INTERNAL_ERROR',
        message: '系统内部错误，请联系管理员',
        safeForLLM: true,
      }
    }

    // 非 Error 对象
    this.logger.error(`Non-Error thrown: ${String(error)}`)
    return {
      code: 'INTERNAL_ERROR',
      message: '系统内部错误，请联系管理员',
      safeForLLM: true,
    }
  }

  /**
   * 创建工具不存在错误
   */
  static toolNotFound(toolName: string): ToolError {
    return {
      code: 'TOOL_NOT_FOUND',
      message: `未知工具: ${toolName}`,
      safeForLLM: true,
    }
  }

  /**
   * 创建缺少参数错误
   */
  static missingParam(param: string): ToolError {
    return {
      code: 'MISSING_PARAM',
      message: `缺少必填参数: ${param}`,
      safeForLLM: true,
    }
  }

  /**
   * 清理消息中的敏感信息
   */
  private sanitizeMessage(message: string): string {
    return message.replace(/SQL\s*:/gi, '').replace(/at\s+[\w./]+:\d+:\d+/g, '').trim().substring(0, 500)
  }
}
