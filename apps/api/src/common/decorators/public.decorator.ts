import { SetMetadata } from '@nestjs/common';

/** Clave de metadatos que marca un endpoint como público (sin JWT). */
export const IS_PUBLIC_KEY = 'isPublic';

/** Marca un controlador o método como accesible sin autenticación. */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
