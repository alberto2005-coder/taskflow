# TaskFlow 🗂️

> Gestor de tareas colaborativo con autenticación, roles y base de datos relacional.
> Proyecto full-stack en TypeScript: **NestJS + Prisma + PostgreSQL** en el backend y **React + Vite + Tailwind** en el frontend.

[![CI](https://img.shields.io/github/actions/workflow/status/alberto2005-coder/taskflow/ci.yml?branch=main&label=CI&logo=github)](https://github.com/alberto2005-coder/taskflow/actions/workflows/ci.yml)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
[![Licencia](https://img.shields.io/badge/Licencia-No%20comercial-CB0000)](LICENSE)

---

## 📑 Índice

1. [Descripción](#-descripción)
2. [Stack tecnológico](#-stack-tecnológico)
3. [Arquitectura](#-arquitectura)
4. [Capturas](#-capturas)
5. [Requisitos previos](#-requisitos-previos)
6. [Puesta en marcha (un solo comando)](#-puesta-en-marcha-un-solo-comando)
7. [Arranque manual (desarrollo local)](#-arranque-manual-desarrollo-local)
8. [Variables de entorno](#-variables-de-entorno)
9. [Modelo de datos](#-modelo-de-datos)
10. [Roles y permisos](#-roles-y-permisos)
11. [Endpoints de la API](#-endpoints-de-la-api)
12. [Estructura del proyecto](#-estructura-del-proyecto)
13. [Scripts disponibles](#-scripts-disponibles)
14. [Pruebas y cobertura](#-pruebas-y-cobertura)
15. [Integración continua](#-integración-continua)
16. [Documentación](#-documentación)
17. [Solución de problemas](#-solución-de-problemas)
18. [Licencia](#-licencia)

---

## 📖 Descripción

**TaskFlow** permite a equipos pequeños organizar su trabajo con proyectos, tareas y comentarios,
apoyándose en tres roles con permisos distintos:

| Funcionalidad            | Descripción                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------- |
| 🔐 **Autenticación JWT** | Registro, inicio de sesión, _refresh token_ con rotación y revocación (_logout_).     |
| 👥 **Roles**             | `ADMIN` · `MANAGER` · `MEMBER` con autorización verificada **siempre en el backend**. |
| 📁 **Proyectos**         | Crear, editar, archivar, eliminar y gestionar miembros.                               |
| 📋 **Tablero Kanban**    | Columnas `TODO` → `IN_PROGRESS` → `DONE` con cambio de estado en un clic.             |
| 💬 **Comentarios**       | Hilo de comentarios por tarea.                                                        |
| 📊 **Dashboard**         | Resumen de _mis tareas_ por estado y progreso por proyecto (solo `ADMIN`/`MANAGER`).  |
| 🧑‍💼 **Administración**    | Gestión de usuarios y roles (solo `ADMIN`).                                           |
| 📄 **Swagger**           | Documentación interactiva en `/api/docs`.                                             |

---

## 🧰 Stack tecnológico

### Backend — `apps/api`

| Capa          | Tecnología                                       |
| ------------- | ------------------------------------------------ |
| Framework     | **NestJS 11** (Express 5)                        |
| ORM           | **Prisma 6**                                     |
| Base de datos | **PostgreSQL 16**                                |
| Auth          | JWT (`@nestjs/jwt`) + Passport + **bcrypt**      |
| Validación    | `class-validator` + `ValidationPipe` (whitelist) |
| Documentación | **Swagger / OpenAPI** (`@nestjs/swagger`)        |
| Seguridad     | `helmet`, CORS restringido, `compression`        |
| Tests         | **Jest** + **Supertest**                         |

### Frontend — `apps/web`

| Capa                | Tecnología                     |
| ------------------- | ------------------------------ |
| UI                  | **React 18** + TypeScript      |
| Bundler             | **Vite 8**                     |
| Estilos             | **Tailwind CSS 4**             |
| Rutas               | **React Router 7**             |
| Estado del servidor | **TanStack Query 5**           |
| Estado de cliente   | **Zustand** (con persistencia) |
| Formularios         | **React Hook Form** + **Zod**  |
| Tests               | **Vitest** + Testing Library   |

### Infraestructura

| Herramienta              | Uso                                          |
| ------------------------ | -------------------------------------------- |
| **Docker Compose**       | `db` (PostgreSQL 16) + `api` + `web` (Nginx) |
| **GitHub Actions**       | Lint → Formato → Migraciones → Tests → Build |
| **ESLint 10 + Prettier** | Estilo de código en ambos `apps`             |

---

## 🏗️ Arquitectura

```mermaid
flowchart LR
    subgraph Cliente["Navegador (React + Vite)"]
        UI["UI · Tailwind"] --> RQ["TanStack Query"]
        RQ --> ST["Zustand<br/>(access + refresh token)"]
    end

    subgraph API["API (NestJS · Puerto 4000)"]
        CTRL["Controllers<br/>auth · users · projects · tasks · dashboard"]
        GUARD["Guards globales<br/>JwtAuthGuard → RolesGuard"]
        SVC["Services<br/>+ permissions.ts"]
        PRISMA["PrismaService"]
        CTRL --> GUARD --> SVC --> PRISMA
    end

    DB[("PostgreSQL 16<br/>taskflow / taskflow_test")]

    UI -- "HTTP + JSON<br/>Authorization: Bearer" --> CTRL
    PRISMA -- "SQL (migraciones Prisma)" --> DB

    subgraph Dev["Herramientas"]
        SW["Swagger /api/docs"]
        CI["GitHub Actions CI"]
    end

    CTRL -.-> SW
    CI -.->|"lint · test · build"| API
```

**Patrón por módulo:** `controller` (HTTP + decoradores de roles) → `service` (lógica de negocio y
permisos) → `PrismaService` (acceso a datos). La autorización fina (¿puede _este_ usuario tocar
_este_ recurso?) vive en `src/users/permissions.ts`, una capa **pura y testeable**.

---

## 📸 Capturas

> Captura real de la aplicación funcionando sobre los datos del seed. La galería completa
> (15 imágenes, incluidas registro, edición, permisos, Swagger y la CI) está en
> [`docs/imagenes/`](docs/imagenes/) y cada pantalla está comentada en la
> [guía de usuario](docs/USUARIO.md).

**Panel general** — resumen de tareas y progreso por proyecto:

![Panel general de TaskFlow con métricas, tareas recientes y progreso de proyectos](docs/imagenes/03-dashboard.png)

**Detalle de proyecto** — panel de miembros y tablero Kanban:

![Detalle de proyecto con panel de miembros a la izquierda y tablero Kanban (Por hacer, En curso, Hecho) a la derecha](docs/imagenes/05-detalle-proyecto.png)

**Listado de tareas** — filtros por estado, proyecto y responsable:

![Listado de tareas con filtros de estado, proyecto y responsable y selector de estado en cada fila](docs/imagenes/07-tareas-lista.png)

**Administración de usuarios** (solo `ADMIN`):

![Gestión de usuarios con buscador, filtro de rol, cambio de rol y eliminación](docs/imagenes/09-admin-usuarios.png)

---

## ✅ Requisitos previos

| Requisito                             | Versión mínima                                | Comprobación             |
| ------------------------------------- | --------------------------------------------- | ------------------------ |
| Node.js                               | 24 (recomendado; la API funciona desde la 20) | `node -v`                |
| npm                                   | 10+                                           | `npm -v`                 |
| Git                                   | 2.x                                           | `git --version`          |
| Docker _(opcional)_                   | 24+ con Compose v2                            | `docker compose version` |
| PostgreSQL _(solo si no usas Docker)_ | 16                                            | `psql --version`         |

---

## 🚀 Puesta en marcha (un solo comando)

```bash
git clone https://github.com/alberto2005-coder/taskflow.git TaskFlow
cd TaskFlow
cp .env.example .env          # ajusta credenciales si lo necesitas
docker compose up
```

Con eso quedan levantados:

| Servicio      | URL                            | Descripción                 |
| ------------- | ------------------------------ | --------------------------- |
| 🌐 Frontend   | http://localhost:5173          | React (Nginx en producción) |
| 🔌 API        | http://localhost:4000/api      | NestJS                      |
| 📚 Swagger    | http://localhost:4000/api/docs | Documentación OpenAPI       |
| 🗄️ PostgreSQL | `localhost:5432`               | Base de datos `taskflow`    |

> El contenedor `api` ejecuta `prisma migrate deploy` automáticamente al arrancar.

---

## 🧑‍💻 Arranque manual (desarrollo local)

Útil si no tienes Docker:

```bash
# 1. Dependencias del monorepo (npm workspaces)
npm install

# 2. Variables de entorno
cp .env.example .env
#   → DATABASE_URL=postgresql://postgres:postgres@localhost:5432/taskflow

# 3. Base de datos local (si ya tienes PostgreSQL):
#    createdb taskflow && createdb taskflow_test
#    o con Docker solo la base de datos:
docker compose up -d db

# 4. Migraciones + datos de demostración
npm run db:migrate
npm run db:seed

# 5. Arrancar API (4000) y Web (5173) a la vez
npm run dev
```

### Usuarios de demostración (tras `npm run db:seed`)

| Email                  | Contraseña     | Rol       |
| ---------------------- | -------------- | --------- |
| `admin@taskflow.dev`   | `Taskflow123!` | `ADMIN`   |
| `manager@taskflow.dev` | `Taskflow123!` | `MANAGER` |
| `member@taskflow.dev`  | `Taskflow123!` | `MEMBER`  |

---

## 🔧 Variables de entorno

Copia `.env.example` a `.env` en la raíz (y `apps/api/.env.example` a `apps/api/.env` si trabajas
solo con la API):

| Variable             | Ejemplo                                                       | Descripción                      |
| -------------------- | ------------------------------------------------------------- | -------------------------------- |
| `DATABASE_URL`       | `postgresql://postgres:postgres@localhost:5432/taskflow`      | Base de datos principal          |
| `TEST_DATABASE_URL`  | `postgresql://postgres:postgres@localhost:5432/taskflow_test` | Base de datos de pruebas         |
| `API_PORT`           | `4000`                                                        | Puerto del servidor NestJS       |
| `CORS_ORIGIN`        | `http://localhost:5173`                                       | Origen permitido (coma separada) |
| `JWT_ACCESS_SECRET`  | _(cadena larga y secreta)_                                    | Firma del access token           |
| `JWT_ACCESS_TTL`     | `15m`                                                         | Caducidad del access token       |
| `JWT_REFRESH_SECRET` | _(distinta de la anterior)_                                   | Firma del refresh token          |
| `JWT_REFRESH_TTL`    | `7d`                                                          | Caducidad del refresh token      |
| `VITE_API_URL`       | `http://localhost:4000/api`                                   | Base de la API en el navegador   |

> ⚠️ Nunca subas `.env` real al repositorio (`.env` está en `.gitignore`).

---

## 🗃️ Modelo de datos

```mermaid
erDiagram
    USER ||--o{ PROJECT : "posee (ownerId)"
    USER ||--o{ PROJECT_MEMBER : "pertenece"
    PROJECT ||--o{ PROJECT_MEMBER : "tiene"
    PROJECT ||--o{ TASK : "contiene"
    USER ||--o{ TASK : "asignada a (assigneeId)"
    TASK ||--o{ COMMENT : "recibe"
    USER ||--o{ COMMENT : "escribe"
    USER ||--o{ REFRESH_TOKEN : "tiene"

    USER {
      uuid id PK
      string email UK
      string name
      string passwordHash
      enum role "ADMIN | MANAGER | MEMBER"
      datetime createdAt
    }
    PROJECT {
      uuid id PK
      string name
      string description
      enum status "ACTIVE | ARCHIVED"
      uuid ownerId FK
    }
    PROJECT_MEMBER {
      uuid projectId PK_FK
      uuid userId PK_FK
      datetime joinedAt
    }
    TASK {
      uuid id PK
      string title
      string description
      enum status "TODO | IN_PROGRESS | DONE"
      enum priority "LOW | MEDIUM | HIGH"
      uuid projectId FK
      uuid assigneeId FK
    }
    COMMENT {
      uuid id PK
      string content
      uuid taskId FK
      uuid authorId FK
    }
    REFRESH_TOKEN {
      uuid id PK
      string tokenHash UK "SHA-256"
      datetime expiresAt
      uuid userId FK
    }
```

Las migraciones viven en `apps/api/prisma/migrations/` y se aplican con
`npm run db:migrate` (desarrollo) o `prisma migrate deploy` (producción/CI).

---

## 🔐 Roles y permisos

| Acción                              | `ADMIN` |             `MANAGER`              |          `MEMBER`           |
| :---------------------------------- | :-----: | :--------------------------------: | :-------------------------: |
| Gestionar usuarios y roles          |   ✅    |                 ❌                 |             ❌              |
| Crear proyecto                      |   ✅    |                 ✅                 |             ❌              |
| Editar / archivar / borrar proyecto |   ✅    |         solo el que posee          |             ❌              |
| Añadir o quitar miembros            |   ✅    |        solo de su proyecto         |             ❌              |
| Crear, editar o borrar tareas       |   ✅    |        solo en su proyecto         |             ❌              |
| Cambiar estado de una tarea         |   ✅    |        solo en su proyecto         | solo las **asignadas a él** |
| Comentar en tareas                  |   ✅    |                 ✅                 |    ✅ (en sus proyectos)    |
| Ver el progreso por proyecto        |   ✅    |                 ✅                 |             ❌              |
| Ver proyectos                       |  todos  | los que posee + los que es miembro |   solo los que es miembro   |
| Ver tareas (`GET /tasks`)           |  todas  |        las de sus proyectos        |   solo las asignadas a él   |

> Estas reglas se aplican en el **backend** (`permissions.ts` + guards). La interfaz solo oculta
> botones: no es una barrera de seguridad.

---

## 🌐 Endpoints de la API

Documentación completa y _try-it-out_ en **[`/api/docs`](http://localhost:4000/api/docs)**.
Detalle campo a campo en [`docs/API.md`](docs/API.md).

| Método                     | Ruta                                  | Acceso                                 |
| -------------------------- | ------------------------------------- | -------------------------------------- |
| `POST`                     | `/api/auth/register`                  | público                                |
| `POST`                     | `/api/auth/login`                     | público                                |
| `POST`                     | `/api/auth/refresh`                   | público                                |
| `POST`                     | `/api/auth/logout`                    | público                                |
| `GET`                      | `/api/auth/me`                        | autenticado                            |
| `GET`                      | `/api/health`                         | público                                |
| `GET` · `POST`             | `/api/users`                          | `ADMIN`                                |
| `GET` · `PATCH` · `DELETE` | `/api/users/:id`                      | `ADMIN` o el propio usuario            |
| `PATCH`                    | `/api/users/:id/role`                 | `ADMIN`                                |
| `GET` · `POST`             | `/api/projects`                       | autenticado · crear: `MANAGER`/`ADMIN` |
| `GET` · `PATCH` · `DELETE` | `/api/projects/:id`                   | visibilidad / gestión                  |
| `POST` · `DELETE`          | `/api/projects/:id/members[/:userId]` | dueño o `ADMIN`                        |
| `GET` · `POST`             | `/api/projects/:id/tasks`             | visibilidad / crear: `MANAGER`/`ADMIN` |
| `GET`                      | `/api/tasks`                          | según rol                              |
| `GET` · `PATCH` · `DELETE` | `/api/tasks/:id`                      | según permisos                         |
| `PATCH`                    | `/api/tasks/:id/status`               | asignado, dueño o `ADMIN`              |
| `GET` · `POST`             | `/api/tasks/:id/comments`             | miembros del proyecto                  |
| `GET`                      | `/api/dashboard`                      | autenticado                            |

**Errores**: `400` validación · `401` sin sesión/token inválido · `403` rol insuficiente ·
`404` recurso inexistente o invisible · `409` conflicto (email duplicado).

Vista real de la documentación interactiva en `/api/docs`:

![Swagger UI de TaskFlow API con los endpoints de salud y autenticación](docs/imagenes/11-swagger.png)

---

## 📂 Estructura del proyecto

```text
TaskFlow/
├── .github/workflows/ci.yml     # Pipeline de CI
├── docker-compose.yml           # db + api + web
├── package.json                 # npm workspaces (raíz)
├── tsconfig.base.json
├── .env.example
├── docs/
│   ├── API.md                   # Contrato REST
│   ├── USUARIO.md               # Guía de usuario
│   ├── DESARROLLADOR.md         # Guía de desarrollo
│   └── DESPLIEGUE.md            # Despliegue y operaciones
└── apps/
    ├── api/                     # NestJS
    │   ├── prisma/              # schema.prisma · migrations/ · seed.ts
    │   ├── src/
    │   │   ├── auth/            # registro · login · refresh · JWT strategy
    │   │   ├── users/           # gestión de usuarios + permissions.ts
    │   │   ├── projects/        # proyectos y miembros
    │   │   ├── tasks/           # tareas y comentarios
    │   │   ├── dashboard/       # resumen del usuario
    │   │   ├── prisma/          # PrismaService (global)
    │   │   └── common/          # guards · decoradores · DTOs compartidos
    │   └── test/                # TODOS los tests (unit + integración)
    └── web/                     # React + Vite
        └── src/
            ├── features/        # auth · dashboard · projects · tasks · users
            ├── components/      # UI reutilizable
            ├── lib/             # cliente API tipado
            ├── store/           # Zustand (sesión)
            └── routes/          # router y guardas
```

---

## 📜 Scripts disponibles

En la **raíz** del monorepo:

| Script                            | Descripción                              |
| --------------------------------- | ---------------------------------------- |
| `npm run dev`                     | API (4000) + Web (5173) en paralelo      |
| `npm run build`                   | Compila ambos proyectos                  |
| `npm test`                        | Ejecuta todos los tests                  |
| `npm run lint`                    | ESLint en `apps/api` y `apps/web`        |
| `npm run format` / `format:check` | Prettier                                 |
| `npm run db:up` / `db:down`       | Levanta/solo la base de datos con Docker |
| `npm run db:migrate`              | `prisma migrate dev`                     |
| `npm run db:seed`                 | Datos de demostración                    |
| `npm run db:reset`                | Reinicia la base de datos y la re-migra  |

Dentro de `apps/api`: `dev`, `build`, `test`, `test:cov`, `lint`,
`prisma:generate`, `prisma:migrate`, `prisma:migrate:deploy`, `prisma:seed`, `prisma:studio`.

Dentro de `apps/web`: `dev`, `build`, `preview`, `test`, `test:watch`, `lint`.

---

## 🧪 Pruebas y cobertura

```bash
npm test              # todo
npm run test:api      # solo API
npm run test:web      # solo Web
npm run test:cov -w apps/api   # con informe de cobertura
```

**Estrategia (documentada en `docs/DESARROLLADOR.md`):**

| Nivel       | Herramienta      | Qué cubre                                                          |
| ----------- | ---------------- | ------------------------------------------------------------------ |
| Unitario    | Jest             | Lógica de permisos, servicios de auth/usuarios con Prisma simulado |
| Integración | Jest + Supertest | Flujo HTTP completo contra **PostgreSQL real** (`taskflow_test`)   |
| Componente  | Vitest + RTL     | Formularios, tablero Kanban, cliente API (incl. _refresh_ en 401)  |

**Resultados verificados (2026-10-01):**

| Suite                    | Comando                        | Resultado                                                                          |
| ------------------------ | ------------------------------ | ---------------------------------------------------------------------------------- |
| API (unit + integración) | `npm run test -w apps/api`     | ✅ **82/82 tests** en 7 suites (≈ 20 s)                                            |
| Frontend (componentes)   | `npm run test -w apps/web`     | ✅ **17/17 tests** en 4 ficheros (≈ 8,5 s)                                         |
| Cobertura de la API      | `npm run test:cov -w apps/api` | ✅ `exit 0` · global **94,26 %** · `permissions.ts` **100 %** · `src/auth` 98,63 % |

La salida íntegra (listado de suites y tabla de cobertura) está en
[`docs/DESARROLLADOR.md` §8](docs/DESARROLLADOR.md).

![Terminal con las 7 suites de la API en verde: 82 tests aprobados](docs/imagenes/tests-api.png)

![Terminal con la tabla de cobertura de Jest: 94,26 % de statements en todos los ficheros](docs/imagenes/cobertura.png)

- Todos los tests de la API están en **`apps/api/test/`**.
- Los tests se ejecutan en serie (`maxWorkers: 1`) porque comparten base de datos; cada fichero
  empieza con las tablas vacías.
- Si PostgreSQL no está disponible, los tests de integración se **omiten** con un aviso y los
  unitarios se ejecutan igualmente.
- Umbrales exigidos: **`src/auth` ≥ 70 %** y **`src/users/permissions.ts` ≥ 90 %** (declarados
  por directorio/ruta, no con globs, porque Jest evalúa los umbrales glob **fichero a fichero**).

---

## 🔁 Integración continua

`.github/workflows/ci.yml` se ejecuta en cada _push_ y _pull request_ a `main`:

1. Servicio `postgres:16-alpine` como base de datos de pruebas.
2. `npm ci`
3. `prisma generate`
4. `npm run lint` + `npm run format:check`
5. `prisma migrate deploy`
6. `npm test`
7. `npm run build`

Pasada real en GitHub Actions (primer push, 2026-10-01):

![GitHub Actions: ejecución «Lint, test y build» con estado Success en 1m 14s y resumen de Vitest (4 ficheros, 17 tests)](docs/imagenes/14-ci.png)

> La badge superior del README consulta el estado de esta misma _workflow_ en tiempo real.

---

## 📚 Documentación

| Documento                                        | Contenido                                                    |
| ------------------------------------------------ | ------------------------------------------------------------ |
| [`README.md`](README.md)                         | Este archivo: visión general y arranque                      |
| [`docs/USUARIO.md`](docs/USUARIO.md)             | Guía de usuario con capturas de pantalla paso a paso         |
| [`docs/DESARROLLADOR.md`](docs/DESARROLLADOR.md) | Guía para desarrolladores: arquitectura, convenciones, tests |
| [`docs/API.md`](docs/API.md)                     | Contrato REST completo (fuentes de verdad para FE y BE)      |
| [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md)       | Despliegue con Docker, CI/CD y operaciones                   |
| Swagger (`/api/docs`)                            | Documentación interactiva de la API                          |

---

## 🩹 Solución de problemas

| Síntoma                                         | Causa probable                  | Solución                                                   |
| ----------------------------------------------- | ------------------------------- | ---------------------------------------------------------- |
| `Can't reach database server at localhost:5432` | PostgreSQL parado               | `docker compose up -d db` o inicia el servicio local       |
| `Password authentication failed`                | Credenciales distintas          | Revisa `DATABASE_URL` en `.env` y el usuario de PostgreSQL |
| Tests de integración omitidos                   | No había base de datos          | Levanta `db` y vuelve a ejecutar `npm test`                |
| Puerto 4000/5173 ocupado                        | Otro proceso                    | Cambia `API_PORT` o `server.port` en `vite.config.ts`      |
| `PrismaClient` desactualizado                   | Schema cambiado                 | `npm run prisma:generate -w apps/api`                      |
| Error de migración                              | Migraciones locales divergentes | `npm run db:reset` (⚠️ borra datos de desarrollo)          |
| CORS bloqueado en el navegador                  | Origen no permitido             | Añade tu URL a `CORS_ORIGIN`                               |

---

## 📌 Estado y hoja de ruta

- [x] Monorepo con npm workspaces, ESLint + Prettier
- [x] API REST con JWT, rotación de refresh tokens y roles
- [x] Proyectos, miembros, tareas, estados y comentarios
- [x] Dashboard con progreso por proyecto
- [x] Swagger en `/api/docs`
- [x] Tests unitarios y de integración + CI
- [x] Frontend React con Kanban, formularios validados y gestión de usuarios
- [ ] Notificaciones en tiempo real (WebSockets)
- [ ] Adjuntos y etiquetas en tareas
- [ ] Exportación de informes

---
## 📜 Licencia

**Copyright © 2026 Alberto Ortiz (`alberto2005-coder`).**

> **Repositorio original:** <https://github.com/alberto2005-coder/taskflow> — cita visiblemente
> el proyecto original en forks y variaciones.

Este proyecto está bajo la **Licencia GPL-3.0**; el texto completo y vinculante está en
[`LICENSE`](LICENSE). Resumen orientativo:

|                            |                                                                                                                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅ **Permitido**           | Usar, copiar, modificar y distribuir con fines personales, educativos y **comerciales**, manteniendo la atribución al autor original.                                          |
| 🍴 **Forks y variaciones** | Deben citar el proyecto original y al autor, e indicar los cambios realizados.                                                                                                |
| 📄 **Redistribución**      | Si distribuyes copias o versiones modificadas, publica su código fuente bajo GPL-3.0 (copyleft); incluye este `LICENSE` íntegro y conserva los avisos de copyright.            |

---




Hecho con TypeScript de punta a punta. [Licencia GPL-3.0](LICENSE).



# TaskFlow 🗂️

> Collaborative task manager featuring authentication, role-based access control, and a relational database.
> Full-stack TypeScript project: **NestJS + Prisma + PostgreSQL** on the backend and **React + Vite + Tailwind** on the frontend.

---

## 📑 Table of Contents

1. [Overview](https://www.google.com/search?q=%23-overview)
2. [Tech Stack](https://www.google.com/search?q=%23-tech-stack)
3. [Architecture](https://www.google.com/search?q=%23-architecture)
4. [Screenshots](https://www.google.com/search?q=%23-screenshots)
5. [Prerequisites](https://www.google.com/search?q=%23-prerequisites)
6. [Getting Started (Single Command)](https://www.google.com/search?q=%23-getting-started-single-command)
7. [Manual Setup (Local Development)](https://www.google.com/search?q=%23-manual-setup-local-development)
8. [Environment Variables](https://www.google.com/search?q=%23-environment-variables)
9. [Data Model](https://www.google.com/search?q=%23-data-model)
10. [Roles and Permissions](https://www.google.com/search?q=%23-roles-and-permissions)
11. [API Endpoints](https://www.google.com/search?q=%23-api-endpoints)
12. [Project Structure](https://www.google.com/search?q=%23-project-structure)
13. [Available Scripts](https://www.google.com/search?q=%23-available-scripts)
14. [Testing and Coverage](https://www.google.com/search?q=%23-testing-and-coverage)
15. [Continuous Integration](https://www.google.com/search?q=%23-continuous-integration)
16. [Documentation](https://www.google.com/search?q=%23-documentation)
17. [Troubleshooting](https://www.google.com/search?q=%23-troubleshooting)
18. [License](https://www.google.com/search?q=%23-license)

---

## 📖 Overview

**TaskFlow** enables small teams to organize their work through projects, tasks, and comments, backed by three distinct permission roles:

| Feature | Description |
| --- | --- |
| 🔐 **JWT Authentication** | Registration, login, and refresh tokens with rotation and revocation (logout). |
| 👥 **Roles** | `ADMIN` · `MANAGER` · `MEMBER` with authorization **strictly enforced on the backend**. |
| 📁 **Projects** | Create, edit, archive, delete, and manage project members. |
| 📋 **Kanban Board** | `TODO` → `IN_PROGRESS` → `DONE` columns with one-click status transitions. |
| 💬 **Comments** | Task-level comment threads. |
| 📊 **Dashboard** | Summary of *my tasks* by status and project progress tracking (for `ADMIN`/`MANAGER`). |
| 🧑‍💼 **Administration** | User and role management (exclusive to `ADMIN`). |
| 📄 **Swagger** | Interactive API documentation hosted at `/api/docs`. |

---

## 🧰 Tech Stack

### Backend — `apps/api`

| Layer | Technology |
| --- | --- |
| Framework | **NestJS 11** (Express 5) |
| ORM | **Prisma 6** |
| Database | **PostgreSQL 16** |
| Auth | JWT (`@nestjs/jwt`) + Passport + **bcrypt** |
| Validation | `class-validator` + `ValidationPipe` (whitelist) |
| Documentation | **Swagger / OpenAPI** (`@nestjs/swagger`) |
| Security | `helmet`, restricted CORS, `compression` |
| Testing | **Jest** + **Supertest** |

### Frontend — `apps/web`

| Layer | Technology |
| --- | --- |
| UI | **React 18** + TypeScript |
| Bundler | **Vite 8** |
| Styling | **Tailwind CSS 4** |
| Routing | **React Router 7** |
| Server State | **TanStack Query 5** |
| Client State | **Zustand** (with persistence) |
| Forms | **React Hook Form** + **Zod** |
| Testing | **Vitest** + Testing Library |

### Infrastructure

| Tool | Purpose |
| --- | --- |
| **Docker Compose** | `db` (PostgreSQL 16) + `api` + `web` (Nginx) |
| **GitHub Actions** | Lint → Format → Migrations → Tests → Build |
| **ESLint 10 + Prettier** | Code formatting and linting across both `apps` |

---

## 🏗️ Architecture

```mermaid
flowchart LR
    subgraph Client["Browser (React + Vite)"]
        UI["UI · Tailwind"] --> RQ["TanStack Query"]
        RQ --> ST["Zustand<br/>(access + refresh token)"]
    end

    subgraph API["API (NestJS · Port 4000)"]
        CTRL["Controllers<br/>auth · users · projects · tasks · dashboard"]
        GUARD["Global Guards<br/>JwtAuthGuard → RolesGuard"]
        SVC["Services<br/>+ permissions.ts"]
        PRISMA["PrismaService"]
        CTRL --> GUARD --> SVC --> PRISMA
    end

    DB[("PostgreSQL 16<br/>taskflow / taskflow_test")]

    UI -- "HTTP + JSON<br/>Authorization: Bearer" --> CTRL
    PRISMA -- "SQL (Prisma migrations)" --> DB

    subgraph Dev["Tools"]
        SW["Swagger /api/docs"]
        CI["GitHub Actions CI"]
    end

    CTRL -.-> SW
    CI -.->|"lint · test · build"| API

```

**Module Design Pattern:** `controller` (HTTP routing + role decorators) → `service` (business logic and permissions) → `PrismaService` (database access). Fine-grained authorization checks (*can this user touch this specific resource?*) live in `src/users/permissions.ts`, a **pure, isolated, and easily testable layer**.

---

## 📸 Screenshots

> Actual screenshots of the application running with seeded demo data. The complete gallery (15 images, including registration, editing, permissions, Swagger, and CI) can be found in [`docs/imagenes/`](https://www.google.com/search?q=docs/imagenes/), and every screen is broken down in the [user guide](https://www.google.com/search?q=docs/USUARIO.md).

**Dashboard** — task overview and project progress:

**Project Detail** — members panel and Kanban board:

**Task List** — filtered by status, project, and assignee:

**User Management** (`ADMIN` only):

---

## ✅ Prerequisites

| Requirement | Minimum Version | Verification Command |
| --- | --- | --- |
| Node.js | 24 (recommended; API runs from v20+) | `node -v` |
| npm | 10+ | `npm -v` |
| Git | 2.x | `git --version` |
| Docker *(optional)* | 24+ with Compose v2 | `docker compose version` |
| PostgreSQL *(only if not using Docker)* | 16 | `psql --version` |

---

## 🚀 Getting Started (Single Command)

```bash
git clone https://github.com/alberto2005-coder/taskflow.git TaskFlow
cd TaskFlow
cp .env.example .env          # customize credentials if needed
docker compose up

```

This brings up all required services:

| Service | URL | Description |
| --- | --- | --- |
| 🌐 Frontend | http://localhost:5173 | React (served via Nginx in production) |
| 🔌 API | http://localhost:4000/api | NestJS |
| 📚 Swagger | http://localhost:4000/api/docs | OpenAPI documentation |
| 🗄️ PostgreSQL | `localhost:5432` | `taskflow` database |

> The `api` container automatically executes `prisma migrate deploy` on startup.

---

## 🧑‍💻 Manual Setup (Local Development)

Useful if you prefer running without Docker:

```bash
# 1. Monorepo dependencies (npm workspaces)
npm install

# 2. Environment configuration
cp .env.example .env
#   → DATABASE_URL=postgresql://postgres:postgres@localhost:5432/taskflow

# 3. Local database (if PostgreSQL is installed locally):
#    createdb taskflow && createdb taskflow_test
#    or launch only the database container with Docker:
docker compose up -d db

# 4. Run migrations + seed demo data
npm run db:migrate
npm run db:seed

# 5. Start API (4000) and Web (5173) concurrently
npm run dev

```

### Demo Accounts (Available after `npm run db:seed`)

| Email | Password | Role |
| --- | --- | --- |
| `admin@taskflow.dev` | `Taskflow123!` | `ADMIN` |
| `manager@taskflow.dev` | `Taskflow123!` | `MANAGER` |
| `member@taskflow.dev` | `Taskflow123!` | `MEMBER` |

---

## 🔧 Environment Variables

Copy `.env.example` to `.env` in the root folder (and copy `apps/api/.env.example` to `apps/api/.env` if working only inside the backend):

| Variable | Example | Description |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/taskflow` | Primary database connection string |
| `TEST_DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/taskflow_test` | Test suite database connection string |
| `API_PORT` | `4000` | NestJS server port |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin (comma-separated for multiples) |
| `JWT_ACCESS_SECRET` | *(long, secure random string)* | Access token signing secret |
| `JWT_ACCESS_TTL` | `15m` | Access token lifespan |
| `JWT_REFRESH_SECRET` | *(different secure random string)* | Refresh token signing secret |
| `JWT_REFRESH_TTL` | `7d` | Refresh token lifespan |
| `VITE_API_URL` | `http://localhost:4000/api` | Base API URL consumed by the client app |

> ⚠️ Never commit real production `.env` files (`.env` is ignored via `.gitignore`).

---

## 🗃️ Data Model

```mermaid
erDiagram
    USER ||--o{ PROJECT : "owns (ownerId)"
    USER ||--o{ PROJECT_MEMBER : "belongs to"
    PROJECT ||--o{ PROJECT_MEMBER : "has"
    PROJECT ||--o{ TASK : "contains"
    USER ||--o{ TASK : "assigned to (assigneeId)"
    TASK ||--o{ COMMENT : "receives"
    USER ||--o{ COMMENT : "writes"
    USER ||--o{ REFRESH_TOKEN : "has"

    USER {
      uuid id PK
      string email UK
      string name
      string passwordHash
      enum role "ADMIN | MANAGER | MEMBER"
      datetime createdAt
    }
    PROJECT {
      uuid id PK
      string name
      string description
      enum status "ACTIVE | ARCHIVED"
      uuid ownerId FK
    }
    PROJECT_MEMBER {
      uuid projectId PK_FK
      uuid userId PK_FK
      datetime joinedAt
    }
    TASK {
      uuid id PK
      string title
      string description
      enum status "TODO | IN_PROGRESS | DONE"
      enum priority "LOW | MEDIUM | HIGH"
      uuid projectId FK
      uuid assigneeId FK
    }
    COMMENT {
      uuid id PK
      string content
      uuid taskId FK
      uuid authorId FK
    }
    REFRESH_TOKEN {
      uuid id PK
      string tokenHash UK "SHA-256"
      datetime expiresAt
      uuid userId FK
    }

```

Migrations are stored in `apps/api/prisma/migrations/` and applied using `npm run db:migrate` (development) or `prisma migrate deploy` (production/CI).

---

## 🔐 Roles and Permissions

| Action | `ADMIN` | `MANAGER` | `MEMBER` |
| --- | --- | --- | --- |
| Manage users and roles | ✅ | ❌ | ❌ |
| Create projects | ✅ | ✅ | ❌ |
| Edit / archive / delete projects | ✅ | Owned projects only | ❌ |
| Add or remove project members | ✅ | Owned projects only | ❌ |
| Create, edit, or delete tasks | ✅ | Owned projects only | ❌ |
| Change task status | ✅ | Owned projects only | **Assigned tasks only** |
| Comment on tasks | ✅ | ✅ | ✅ (in assigned projects) |
| View progress across projects | ✅ | ✅ | ❌ |
| View projects | All | Owned + member projects | Member projects only |
| View tasks (`GET /tasks`) | All | Tasks in their projects | **Assigned tasks only** |

> These authorization rules are enforced strictly in the **backend** (`permissions.ts` + guards). The UI merely hides controls and does not replace real server security.

---

## 🌐 API Endpoints

Full interactive API testing is available at **[`/api/docs`](http://localhost:4000/api/docs)**.

Field-by-field payload specifications can be viewed in [`docs/API.md`](https://www.google.com/search?q=docs/API.md).

| Method | Path | Access |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Public |
| `POST` | `/api/auth/login` | Public |
| `POST` | `/api/auth/refresh` | Public |
| `POST` | `/api/auth/logout` | Public |
| `GET` | `/api/auth/me` | Authenticated |
| `GET` | `/api/health` | Public |
| `GET` · `POST` | `/api/users` | `ADMIN` |
| `GET` · `PATCH` · `DELETE` | `/api/users/:id` | `ADMIN` or profile owner |
| `PATCH` | `/api/users/:id/role` | `ADMIN` |
| `GET` · `POST` | `/api/projects` | Authenticated · Creation: `MANAGER`/`ADMIN` |
| `GET` · `PATCH` · `DELETE` | `/api/projects/:id` | Project visibility / management |
| `POST` · `DELETE` | `/api/projects/:id/members[/:userId]` | Project owner or `ADMIN` |
| `GET` · `POST` | `/api/projects/:id/tasks` | Project visibility / Creation: `MANAGER`/`ADMIN` |
| `GET` | `/api/tasks` | Role-based |
| `GET` · `PATCH` · `DELETE` | `/api/tasks/:id` | Permission-based |
| `PATCH` | `/api/tasks/:id/status` | Assignee, owner, or `ADMIN` |
| `GET` · `POST` | `/api/tasks/:id/comments` | Project members |
| `GET` | `/api/dashboard` | Authenticated |

**Error Responses**: `400` Validation error · `401` Unauthorized / missing session · `403` Insufficient permissions · `404` Resource missing or restricted · `409` Conflict (duplicate email).

Interactive documentation preview in `/api/docs`:

---

## 📂 Project Structure

```text
TaskFlow/
├── .github/workflows/ci.yml     # CI Pipeline
├── docker-compose.yml           # db + api + web
├── package.json                 # npm workspaces (root)
├── tsconfig.base.json
├── .env.example
├── docs/
│   ├── API.md                   # REST contract documentation
│   ├── USUARIO.md               # User manual
│   ├── DESARROLLADOR.md         # Developer guide
│   └── DESPLIEGUE.md            # Deployment & ops guide
└── apps/
    ├── api/                     # NestJS
    │   ├── prisma/              # schema.prisma · migrations/ · seed.ts
    │   ├── src/
    │   │   ├── auth/            # register · login · refresh · JWT strategy
    │   │   ├── users/           # user management + permissions.ts
    │   │   ├── projects/        # projects and members
    │   │   ├── tasks/           # tasks and comments
    │   │   ├── dashboard/       # user analytics & overview
    │   │   ├── prisma/          # PrismaService (global)
    │   │   └── common/          # guards · decorators · shared DTOs
    │   └── test/                # ALL tests (unit + integration)
    └── web/                     # React + Vite
        └── src/
            ├── features/        # auth · dashboard · projects · tasks · users
            ├── components/      # reusable UI components
            ├── lib/             # typed API client
            ├── store/           # Zustand (session storage)
            └── routes/          # router & navigation guards

```

---

## 📜 Available Scripts

In the **root** monorepo directory:

| Script | Description |
| --- | --- |
| `npm run dev` | Runs API (4000) + Web (5173) concurrently |
| `npm run build` | Builds both applications for production |
| `npm test` | Executes all test suites |
| `npm run lint` | Runs ESLint across `apps/api` and `apps/web` |
| `npm run format` / `format:check` | Formats or validates code style via Prettier |
| `npm run db:up` / `db:down` | Spins up / tears down the Docker PostgreSQL database |
| `npm run db:migrate` | Runs `prisma migrate dev` |
| `npm run db:seed` | Populates demo data |
| `npm run db:reset` | Drops, re-migrates, and re-seeds the development database |

Inside `apps/api`: `dev`, `build`, `test`, `test:cov`, `lint`, `prisma:generate`, `prisma:migrate`, `prisma:migrate:deploy`, `prisma:seed`, `prisma:studio`.

Inside `apps/web`: `dev`, `build`, `preview`, `test`, `test:watch`, `lint`.

---

## 🧪 Testing and Coverage

```bash
npm test              # Run everything
npm run test:api      # Run API tests only
npm run test:web      # Run Frontend tests only
npm run test:cov -w apps/api   # Run API tests with coverage report

```

**Testing Strategy (detailed in `docs/DESARROLLADOR.md`):**

| Level | Tool | Scope |
| --- | --- | --- |
| Unit | Jest | Permission evaluation, auth/user business logic using mocked Prisma |
| Integration | Jest + Supertest | End-to-end HTTP pipeline against a **live PostgreSQL instance** (`taskflow_test`) |
| Component | Vitest + RTL | Form validations, Kanban board interactions, API client (including 401 refresh flows) |

**Verified Test Results (2026-10-01):**

| Suite | Command | Outcome |
| --- | --- | --- |
| API (unit + integration) | `npm run test -w apps/api` | ✅ **82/82 tests passing** across 7 suites (≈ 20 s) |
| Frontend (components) | `npm run test -w apps/web` | ✅ **17/17 tests passing** across 4 files (≈ 8.5 s) |
| API Coverage | `npm run test:cov -w apps/api` | ✅ `exit 0` · Global **94.26%** · `permissions.ts` **100%** · `src/auth` 98.63% |

The full execution summary (suites breakdown and coverage report) can be found in [`docs/DESARROLLADOR.md` §8](https://www.google.com/search?q=docs/DESARROLLADOR.md).

* All backend tests are located in **`apps/api/test/`**.
* Tests run sequentially (`maxWorkers: 1`) to prevent collisions across the shared test database; each test file begins with truncated tables.
* If PostgreSQL is unreachable, integration tests are **safely skipped** with a warning, allowing unit tests to run unhindered.
* Target coverage thresholds: **`src/auth` ≥ 70%** and **`src/users/permissions.ts` ≥ 90%** (configured per directory/path rather than globs, as Jest assesses glob thresholds on a **file-by-file** basis).

---

## 🔁 Continuous Integration

`.github/workflows/ci.yml` runs automatically on every pull request and push to `main`:

1. Boots a `postgres:16-alpine` test service.
2. `npm ci`
3. `prisma generate`
4. `npm run lint` + `npm run format:check`
5. `prisma migrate deploy`
6. `npm test`
7. `npm run build`

Sample GitHub Actions run (first push, 2026-10-01):

> The status badge at the top of this README reflects the real-time status of this CI workflow.

---

## 📚 Documentation

| Document | Scope |
| --- | --- |
| [`README.md`](README.md) | This file: overview, stack, and quickstart guide |
| [`docs/USUARIO.md`](https://www.google.com/search?q=docs/USUARIO.md) | User guide with visual walkthroughs and step-by-step flows |
| [`docs/DESARROLLADOR.md`](https://www.google.com/search?q=docs/DESARROLLADOR.md) | Developer guide: architectural patterns, conventions, and test setups |
| [`docs/API.md`](https://www.google.com/search?q=docs/API.md) | Complete REST specification (source of truth for frontend & backend) |
| [`docs/DESPLIEGUE.md`](https://www.google.com/search?q=docs/DESPLIEGUE.md) | Deployment instructions for Docker, CI/CD, and operations |
| Swagger (`/api/docs`) | Interactive OpenAPI interface |

---

## 🩹 Troubleshooting

| Symptom | Probable Cause | Resolution |
| --- | --- | --- |
| `Can't reach database server at localhost:5432` | PostgreSQL is down | Run `docker compose up -d db` or start your local service |
| `Password authentication failed` | Credential mismatch | Check `DATABASE_URL` in `.env` against your PostgreSQL configuration |
| Integration tests skipped | Database unavailable | Spin up `db` and re-run `npm test` |
| Port 4000 or 5173 already in use | Conflicting local process | Update `API_PORT` or `server.port` inside `vite.config.ts` |
| `PrismaClient` is out of sync | Schema changed without generation | Run `npm run prisma:generate -w apps/api` |
| Migration conflict | Out-of-sync local migrations | Run `npm run db:reset` (⚠️ deletes development data) |
| CORS rejected by browser | Origin not whitelisted | Add your frontend origin URL to `CORS_ORIGIN` |

---

## 📌 Project Status & Roadmap

* [x] Monorepo managed with npm workspaces, ESLint + Prettier
* [x] REST API with JWT, refresh token rotation, and RBAC
* [x] Projects, memberships, tasks, status lifecycles, and comments
* [x] Dashboard tracking metrics and project progress
* [x] Swagger documentation at `/api/docs`
* [x] Unit and integration tests with CI pipeline
* [x] React frontend with Kanban view, validated forms, and user administration
* [ ] Real-time updates via WebSockets
* [ ] File attachments and task tags
* [ ] Exportable reports

---

## 📜 License

**Copyright © 2026 Alberto Ortiz (`alberto2005-coder`).**

> **Original Repository:** [https://github.com/alberto2005-coder/taskflow](https://github.com/alberto2005-coder/taskflow) — attribution to the original author must remain visible on all forks and derivatives.

This project is licensed under the **GPL-3.0 License**; the complete, legally binding terms can be found in [`LICENSE`](https://www.google.com/search?q=LICENSE). Summary of terms:

|  |  |
| --- | --- |
| ✅ **Permissions** | Use, copy, modify, and distribute for personal, educational, and **commercial** purposes, provided original author attribution is preserved. |
| 🍴 **Forks & Derivatives** | Must retain attribution to the original author/project and document any modifications made. |
| 📄 **Redistribution** | Any redistributed copies or modifications must be published under the GPL-3.0 license (copyleft); must retain the full `LICENSE` file and copyright notices. |

---

Built end-to-end with TypeScript. [GPL-3.0 License](https://www.google.com/search?q=LICENSE).
