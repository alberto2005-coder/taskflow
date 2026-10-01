import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/auth-user';
import type { PaginatedResult } from '../common/dto/pagination.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksDto } from './dto/list-tasks.dto';
import { TasksService, TaskSummary } from './tasks.service';

/**
 * Tareas anidadas bajo un proyecto:
 *   GET  /api/projects/:id/tasks
 *   POST /api/projects/:id/tasks
 */
@ApiTags('tareas')
@ApiBearerAuth('bearer')
@Controller('projects')
export class ProjectTasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get(':id/tasks')
  @ApiOperation({ summary: 'Listar las tareas de un proyecto' })
  findAll(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListTasksDto,
  ): Promise<PaginatedResult<TaskSummary>> {
    return this.tasksService.findAll(user, { ...query, projectId: id });
  }

  @Post(':id/tasks')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Crear una tarea en un proyecto (MANAGER, ADMIN)' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTaskDto,
  ): Promise<TaskSummary> {
    return this.tasksService.create(user, id, dto);
  }
}
