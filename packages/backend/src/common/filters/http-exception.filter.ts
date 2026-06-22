import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { Request, Response } from 'express'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR

    const message = exception instanceof HttpException ? exception.getResponse() : 'Internal Server Error'

    // 记录详细错误日志
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      const logger = new Logger('ExceptionFilter')
      // H04修复：生产环境不泄露堆栈到console，仅Logger记录
      if (exception instanceof Error) {
        logger.error(`Exception: ${exception.message}`, exception.stack)
      } else {
        logger.error(`Unknown error: ${JSON.stringify(exception)}`)
      }
    }

    response.status(status).json({
      code: status,
      message: typeof message === 'string' ? message : (message as { message: string }).message,
      data: null,
      timestamp: Date.now(),
      path: request.url,
    })
  }
}
