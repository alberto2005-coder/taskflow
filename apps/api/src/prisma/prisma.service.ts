import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Elimina todos los datos de las tablas de negocio.
   * Solo se usa en los tests de integraciÃ³n.
   */
  async cleanDatabase(): Promise<void> {
    await this.$transaction([
      this.refreshToken.deleteMany(),
      this.comment.deleteMany(),
      this.task.deleteMany(),
      this.projectMember.deleteMany(),
      this.project.deleteMany(),
      this.user.deleteMany(),
    ]);
  }
}
