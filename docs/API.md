# TaskFlow — Contrato de la API

> Fuente de verdad compartida entre `apps/api` (NestJS) y `apps/web` (React).
> Documentación interactiva en **`/api/docs`** (Swagger) cuando la API está levantada.

## Convenciones

- **Base**: `http://localhost:4000/api`
- **Autenticación**: cabecera `Authorization: Bearer <accessToken>`
- **Contenido**: `Content-Type: application/json`
- **Paginación** (listados): query `?page=1&limit=20` → respuesta:

```json
{
  "items": [],
  "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
}
```

- **Errores** (formato NestJS):

```json
{ "statusCode": 400, "message": ["email debe ser un email válido"], "error": "Bad Request" }
```

| Código | Cuándo                                                                     |
| ------ | -------------------------------------------------------------------------- |
| 400    | Validación de DTO fallida                                                  |
| 401    | Sin token, token inválido o refresh token revocado/caducado                |
| 403    | Rol insuficiente o recurso ajeno (p. ej. MEMBER tocando tarea no asignada) |
| 404    | Recurso inexistente o no visible para el usuario                           |
| 409    | Conflicto (email ya registrado)                                            |

## Enumeraciones

| Nombre          | Valores                           |
| --------------- | --------------------------------- |
| `Role`          | `ADMIN` \| `MANAGER` \| `MEMBER`  |
| `ProjectStatus` | `ACTIVE` \| `ARCHIVED`            |
| `TaskStatus`    | `TODO` \| `IN_PROGRESS` \| `DONE` |
| `TaskPriority`  | `LOW` \| `MEDIUM` \| `HIGH`       |

## Objetos

```ts
UserPublic  = { id, name, email, role, createdAt }
Project     = {
  id, name, description, status, createdAt, updatedAt,
  owner: UserPublic,
  members: UserPublic[],     // solo en detalle
  tasksCount, membersCount   // solo en listado
}
Task        = {
  id, title, description, status, priority, createdAt, updatedAt,
  project: { id, name },
  assignee: UserPublic | null,
  commentsCount
}
Comment     = { id, content, author: UserPublic, createdAt }
```

---

## 1. Autenticación

| Método | Ruta             | Acceso  | Body                        | Respuesta                                 |
| ------ | ---------------- | ------- | --------------------------- | ----------------------------------------- |
| POST   | `/auth/register` | público | `{ name, email, password }` | `201 { user, accessToken, refreshToken }` |
| POST   | `/auth/login`    | público | `{ email, password }`       | `200 { user, accessToken, refreshToken }` |
| POST   | `/auth/refresh`  | público | `{ refreshToken }`          | `200 { accessToken, refreshToken }`       |
| POST   | `/auth/logout`   | público | `{ refreshToken }`          | `204` (revoca el refresh token)           |
| GET    | `/auth/me`       | Bearer  | —                           | `200 UserPublic`                          |

`password`: mínimo 8 caracteres. El refresh token se guarda **hasheado (SHA-256)** en la tabla `RefreshToken` con `expiresAt`; al hacer `logout` se elimina, y un refresh token eliminado/caducado devuelve `401`.

## 2. Usuarios

| Método | Ruta              | Acceso                      | Body / Query              | Respuesta                |
| ------ | ----------------- | --------------------------- | ------------------------- | ------------------------ |
| GET    | `/users`          | `ADMIN`                     | `?page&limit&search&role` | paginado de `UserPublic` |
| GET    | `/users/:id`      | `ADMIN`                     | —                         | `UserPublic`             |
| PATCH  | `/users/:id/role` | `ADMIN`                     | `{ role }`                | `UserPublic`             |
| PATCH  | `/users/:id`      | `ADMIN` o el propio usuario | `{ name?, email? }`       | `UserPublic`             |
| DELETE | `/users/:id`      | `ADMIN`                     | —                         | `204`                    |

Reglas: no puedes eliminarte a ti mismo ni eliminar el último `ADMIN`.

## 3. Proyectos

| Método | Ruta                            | Acceso                    | Body / Query                       | Respuesta                 |
| ------ | ------------------------------- | ------------------------- | ---------------------------------- | ------------------------- |
| GET    | `/projects`                     | autenticado               | `?page&limit&status&search`        | paginado de `Project`     |
| POST   | `/projects`                     | `MANAGER`, `ADMIN`        | `{ name, description? }`           | `201 Project`             |
| GET    | `/projects/:id`                 | miembro/owner/`ADMIN`     | —                                  | `Project` (con `members`) |
| PATCH  | `/projects/:id`                 | owner `MANAGER` o `ADMIN` | `{ name?, description?, status? }` | `Project`                 |
| DELETE | `/projects/:id`                 | owner `MANAGER` o `ADMIN` | —                                  | `204`                     |
| POST   | `/projects/:id/members`         | owner `MANAGER` o `ADMIN` | `{ userId }`                       | `Project`                 |
| DELETE | `/projects/:id/members/:userId` | owner `MANAGER` o `ADMIN` | —                                  | `Project`                 |

Visibilidad: `ADMIN` ve todos; `MANAGER` ve los que posee **y** los que es miembro; `MEMBER` solo los que es miembro.

## 4. Tareas

| Método | Ruta                  | Acceso                                            | Body / Query                                               | Respuesta          |
| ------ | --------------------- | ------------------------------------------------- | ---------------------------------------------------------- | ------------------ |
| GET    | `/tasks`              | autenticado                                       | `?page&limit&status&assigneeId&projectId`                  | paginado de `Task` |
| POST   | `/projects/:id/tasks` | owner `MANAGER` o `ADMIN`                         | `{ title, description?, assigneeId?, status?, priority? }` | `201 Task`         |
| GET    | `/tasks/:id`          | miembro del proyecto                              | —                                                          | `Task`             |
| PATCH  | `/tasks/:id`          | owner `MANAGER`, `ADMIN`, o `MEMBER` **asignado** | `{ title?, description?, assigneeId?, priority? }`         | `Task`             |
| PATCH  | `/tasks/:id/status`   | miembro del proyecto                              | `{ status }`                                               | `Task`             |
| DELETE | `/tasks/:id`          | owner `MANAGER` o `ADMIN`                         | —                                                          | `204`              |
| GET    | `/tasks/:id/comments` | miembro del proyecto                              | —                                                          | `Comment[]`        |
| POST   | `/tasks/:id/comments` | miembro del proyecto                              | `{ content }`                                              | `201 Comment`      |

Listado `/tasks`: `ADMIN` ve todas; `MANAGER` las de sus proyectos; `MEMBER` solo las asignadas a él de sus proyectos.

## 5. Dashboard

| Método | Ruta         | Acceso      | Respuesta |
| ------ | ------------ | ----------- | --------- |
| GET    | `/dashboard` | autenticado | ver abajo |

```jsonc
{
  "myTasks": {
    "total": 7,
    "byStatus": { "TODO": 3, "IN_PROGRESS": 2, "DONE": 2 },
    "items": [/* 5 tareas más recientes asignadas al usuario */],
  },
  "projects": [
    // solo ADMIN y MANAGER
    {
      "id": "...",
      "name": "...",
      "status": "ACTIVE",
      "progress": { "TODO": 4, "IN_PROGRESS": 3, "DONE": 9 },
      "membersCount": 3,
      "tasksCount": 16,
    },
  ],
}
```

`projects` es `null` para `MEMBER`.

---

## Matriz de permisos

| Acción                     | ADMIN |      MANAGER      |         MEMBER         |
| -------------------------- | :---: | :---------------: | :--------------------: |
| Gestionar usuarios y roles |  ✅   |        ❌         |           ❌           |
| Crear proyecto             |  ✅   |        ✅         |           ❌           |
| Editar/archivar proyecto   |  ✅   | solo el que posee |           ❌           |
| Añadir/quitar miembros     |  ✅   | solo su proyecto  |           ❌           |
| Crear/editar/borrar tarea  |  ✅   | solo su proyecto  |           ❌           |
| Cambiar estado de tarea    |  ✅   | solo su proyecto  | solo las **asignadas** |
| Comentar                   |  ✅   |        sí         | sí (en sus proyectos)  |
| Ver progreso de proyectos  |  ✅   |        ✅         |           ❌           |
