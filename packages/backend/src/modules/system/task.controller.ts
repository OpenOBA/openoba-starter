import { Controller, Get, Logger, UseGuards } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { ReportTarget } from '@openoba/core/dist/modules/eros/task/report-target.entity'

@Controller('eros/report-targets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TaskController {
  private readonly logger = new Logger(TaskController.name)

  constructor(
    @InjectRepository(ReportTarget)
    private readonly reportTargetRepo: Repository<ReportTarget>,
  ) {}

  @Get()
  @Roles('super_admin', 'admin', 'operator')
  async getReportTargets() {
    const targets = await this.reportTargetRepo.find({
      where: { isActive: true },
      order: { level: 'ASC', name: 'ASC' },
    })
    return targets
  }
}
