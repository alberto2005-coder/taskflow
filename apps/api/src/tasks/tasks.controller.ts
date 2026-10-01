import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth-user';
import type { PaginatedResult } from '../common/dto/pagination.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ListTasksDto } from './dto/list-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { TasksService, CommentSummary, TaskSummary } from './tasks.service';

@ApiTags('tareas')
@ApiBearerAuth('bearer')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'Listar tareas con filtros por estado, responsable y proyecto' })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: ListTasksDto,
  ): Promise<PaginatedResult<TaskSummary>> {
    return this.tasksService.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una tarea' })
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TaskSummary> {
    return this.tasksService.findOne(user, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cambiar el estado de una tarea' })
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskStatusDto,
  ): Promise<TaskSummary> {
    return this.tasksService.updateStatus(user, id, dto.status);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar tÃ­tulo, descripciÃ³n, prioridad o responsable' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<TaskSummary> {
    return this.tasksService.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una tarea' })
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.tasksService.remove(user, id);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Comentarios de una tarea' })
  findComments(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CommentSummary[]> {
    return this.tasksService.findComments(user, id);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'AÃ±adir un comentario a una tarea' })
  addComment(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentSummary> {
    return this.tasksService.addComment(user, id, dto);
  }
}
