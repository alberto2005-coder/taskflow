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

**Copyright © 2026 Alberto Ortiz (`alberto2005-coder`). Todos los derechos reservados.**

> **Repositorio original:** <https://github.com/alberto2005-coder/taskflow> — los forks y
> variaciones deben enlazarlo visiblemente (apartado 3.1 de la licencia).

Uso permitido solo con fines **no comerciales**; el texto completo y vinculante está en
[`LICENSE`](LICENSE). Resumen orientativo:

|                            |                                                                                                                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅ **Permitido**           | Usar, copiar, modificar y distribuir con fines **no comerciales**, manteniendo la atribución al autor original.                                                               |
| ❌ **Prohibido**           | Comercializar, vender o integrar el software en servicios pagos **sin autorización escrita** de Alberto Ortiz.                                                                |
| 🍴 **Forks y variaciones** | Deben citar el proyecto original y al autor, indicar los cambios realizados y llevar una marca de agua visible (apartado 3 de la licencia); siguen sin poder comercializarse. |
| 📄 **Redistribución**      | Incluir este `LICENSE` íntegro, mantener los avisos de copyright y no relajar sus términos.                                                                                   |

> ¿Necesitas una licencia comercial? Contacta con **Alberto Ortiz** · GitHub `alberto2005-coder`.

---

Hecho con TypeScript de punta a punta. [Licencia personalizada no comercial](LICENSE).
