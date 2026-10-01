import { OmitType, PartialType } from '@nestjs/swagger';

import { CreateTaskDto } from './create-task.dto';

/** Edición de tarea: el estado se cambia en `PATCH /tasks/:id/status`. */
export class UpdateTaskDto extends PartialType(OmitType(CreateTaskDto, ['status'] as const)) {}
