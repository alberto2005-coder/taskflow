import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth-user';
import { DashboardService, DashboardSummary } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth('bearer')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({
    summary: 'Resumen del usuario: sus tareas y el progreso de los proyectos',
  })
  getSummary(@CurrentUser() user: AuthUser): Promise<DashboardSummary> {
    return this.dashboardService.getSummary(user);
  }
}
