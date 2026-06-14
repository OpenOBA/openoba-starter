import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { Public } from '../../common/decorators/public.decorator'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: 'Liveness check' })
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() }
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check (DB connectivity)' })
  async ready() {
    try {
      await this.dataSource.query('SELECT 1')
      return { status: 'ready', db: 'connected', timestamp: new Date().toISOString() }
    } catch {
      return { status: 'not ready', db: 'disconnected', timestamp: new Date().toISOString() }
    }
  }
}
