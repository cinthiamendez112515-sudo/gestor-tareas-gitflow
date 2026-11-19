# Gestor de Tareas (CRUD) - Git Flow

Proyecto de la **Tarea 3 de Programación III**: un CRUD de tareas construido con
Node.js (sin dependencias externas) y desarrollado aplicando **Git Flow**.

## Requisitos

- Node.js 20 o superior

## Cómo ejecutarlo

```bash
npm start        # levanta el servidor en http://localhost:3000
npm test         # corre las pruebas automáticas
```

## Ramas del repositorio

| Rama        | Propósito                                        |
|-------------|--------------------------------------------------|
| `main`      | Código estable, listo para producción            |
| `qa`        | Código en revisión de calidad                    |
| `dev`       | Integración del trabajo de desarrollo            |
| `feature/*` | Funcionalidades nuevas                           |
| `hotfix/*`  | Correcciones urgentes                            |

## Flujo de trabajo

Cada rama `feature/*` o `hotfix/*` se integra con tres Pull Requests:
primero hacia `dev`, luego hacia `qa` y finalmente hacia `main`.
