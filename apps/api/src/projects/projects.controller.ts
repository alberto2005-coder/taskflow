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
import { Role } from '@prisma/client';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/auth-user';
import type { PaginatedResult } from '../common/dto/pagination.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsDto } from './dto/list-projects.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService, ProjectDetail, ProjectSummary } from './projects.service';

@ApiTags('proyectos')
@ApiBearerAuth('bearer')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar proyectos visibles para el usuario' })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: ListProjectsDto,
  ): Promise<PaginatedResult<ProjectSummary>> {
    return this.projectsService.findAll(user, query);
  }

  @Post()
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Crear un proyecto (MANAGER, ADMIN)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProjectDto): Promise<ProjectDetail> {
    return this.projectsService.create(user, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un proyecto con sus miembros' })
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProjectDetail> {
    return this.projectsService.findOne(user, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar nombre, descripciÃ³n o estado del proyecto' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<ProjectDetail> {
    return this.projectsService.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un proyecto' })
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.projectsService.remove(user, id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'AÃ±adir un miembro al proyecto' })
  addMember(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMemberDto,
  ): Promise<ProjectDetail> {
    return this.projectsService.addMember(user, id, dto.userId);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Quitar un miembro del proyecto' })
  removeMember(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<ProjectDetail> {
    return this.projectsService.removeMember(user, id, userId);
  }
}
