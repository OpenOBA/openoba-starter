import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { Public } from '../../common/decorators/public.decorator'

@ApiTags('健康检查')
@Public()
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: '系统健康检查' })
  check() {
    return {
      status: 'ok',
      service: 'OpenOBA Starter 后端',
      version: '3.0.0',
      timestamp: new Date().toISOString(),
    }
  }
}
