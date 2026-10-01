import { TaskStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { PaginationDto } from '../../common/dto/pagination.dto';

export class ListTasksDto extends PaginationDto {
  @ApiPropertyOptional({ enum: TaskStatus, description: 'Filtrar por estado' })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ description: 'Filtrar por responsable' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por proyecto' })
  @IsOptional()
  @IsUUID()
  projectId?: string;
}
