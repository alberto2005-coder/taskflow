import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role, User } from '@prisma/client';

import type { PrismaService } from '../src/prisma/prisma.service';
import { UsersService } from '../src/users/users.service';

type MockedPrisma = {
  user: {
    findUnique: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
    findMany: jest.Mock;
  };
  $transaction: jest.Mock;
};

const admin: User = {
  id: 'admin-1',
  email: 'admin@taskflow.dev',
  name: 'Admin',
  passwordHash: 'hash',
  role: Role.ADMIN,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function buildService(): { service: UsersService; prisma: MockedPrisma } {
  const prisma: MockedPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn().mockResolvedValue([0, []]),
  };

  const service = new UsersService(prisma as unknown as PrismaService);

  return { service, prisma };
}

describe('UsersService', () => {
  describe('updateRole', () => {
    it('asigna un rol nuevo', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue({ ...admin, role: Role.MEMBER });
      prisma.user.count.mockResolvedValue(3);
      prisma.user.update.mockImplementation(({ data }: { data: { role: Role } }) =>
        Promise.resolve({ ...admin, ...data }),
      );

      const result = await service.updateRole('admin-1', Role.MANAGER);

      expect(result.role).toBe(Role.MANAGER);
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('impide quedar sin administradores', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue(admin);
      prisma.user.count.mockResolvedValue(0); // ningÃºn ADMIN restante

      await expect(service.updateRole('admin-1', Role.MEMBER)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('lanza 404 si el usuario no existe', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.updateRole('nope', Role.MANAGER)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('actualiza el nombre y el email', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValueOnce(admin).mockResolvedValueOnce(null); // comprobaciÃ³n de email duplicado
      prisma.user.update.mockResolvedValue({ ...admin, name: 'Nuevo', email: 'nuevo@x.dev' });

      const result = await service.update('admin-1', {
        name: 'Nuevo',
        email: 'NUEVO@x.dev',
      });

      expect(result.name).toBe('Nuevo');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: 'Nuevo', email: 'nuevo@x.dev' },
        }),
      );
    });

    it('rechaza un email ya registrado', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique
        .mockResolvedValueOnce(admin)
        .mockResolvedValueOnce({ ...admin, id: 'otro' });

      await expect(service.update('admin-1', { email: 'ocupado@taskflow.dev' })).rejects.toThrow(
        'El email ya estÃ¡ registrado',
      );
    });
  });

  describe('remove', () => {
    it('no deja eliminar la propia cuenta', async () => {
      const { service } = buildService();

      await expect(service.remove('admin-1', { id: 'admin-1' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('no deja eliminar el Ãºltimo administrador', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue(admin);
      prisma.user.count.mockResolvedValue(0);

      await expect(service.remove('admin-1', { id: 'otro-usuario' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('elimina un usuario normal', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue({ ...admin, role: Role.MEMBER });

      await expect(service.remove('admin-1', { id: 'otro-usuario' })).resolves.toBeUndefined();
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'admin-1' } });
    });

    it('lanza 404 si el usuario no existe', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.remove('nope', { id: 'yo' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
