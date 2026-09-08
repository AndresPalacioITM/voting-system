# API Reference — Sistema de Votaciones

Documentación completa de los endpoints del API RESTful.

- **Base URL:** `http://localhost:3000`
- **Formato de datos:** JSON
- **Header requerido en body POST/PUT:** `Content-Type: application/json`

---

## Tabla de contenidos

1. [Autenticación](#autenticación)
2. [Headers requeridos](#headers-requeridos)
3. [Votantes](#votantes)
4. [Candidatos](#candidatos)
5. [Votos](#votos)
6. [Estadísticas](#estadísticas)
7. [Health check](#health-check)
8. [Paginación](#paginación)
9. [Códigos de error](#códigos-de-error)
10. [Flujo completo paso a paso](#flujo-completo-paso-a-paso)
11. [Uso con Postman](#uso-con-postman)

---

## Autenticación

Todos los endpoints excepto `/auth/*` y `/health` requieren un token JWT.

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/register` | Crea un usuario y devuelve un token |
| POST | `/auth/login` | Autentica un usuario y devuelve un token |

### POST /auth/register

Registra un usuario nuevo. La contraseña se hashea con bcrypt (nunca se almacena en texto plano).

**Request body:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `name` | string | ✅ | Nombre del usuario (máx. 100) |
| `email` | string | ✅ | Email válido y único |
| `password` | string | ✅ | Mínimo 6 caracteres |

**Ejemplo curl:**

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@test.com","password":"secreto123"}'
```

**Respuesta 201:**

```json
{
  "user": {
    "id": 1,
    "name": "Admin",
    "email": "admin@test.com",
    "created_at": "2026-09-08 12:00:00"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEs..."
}
```

**Errores:**

| Código | Caso |
|--------|------|
| 400 | Validación falló (email inválido, password corta, name vacío) |
| 409 | Email ya registrado |

### POST /auth/login

Autentica un usuario existente.

**Request body:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `email` | string | ✅ | Email del usuario |
| `password` | string | ✅ | Contraseña del usuario |

**Ejemplo curl:**

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"secreto123"}'
```

**Respuesta 200:** misma estructura que register (`user` + `token`).

**Error:** `401` si las credenciales son incorrectas.

---

## Headers requeridos

Todos los endpoints protegidos necesitan el token en el header:

```
Authorization: Bearer <token>
```

**Ejemplo:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEs...
```

Si el header falta, es malo o el token venció → **401**.

---

## Votantes

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/voters` | Registrar votante |
| GET | `/voters` | Listar votantes |
| GET | `/voters/:id` | Detalle de votante |
| DELETE | `/voters/:id` | Eliminar votante |

### POST /voters

Registra un votante nuevo.

**Request body:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `name` | string | ✅ | Nombre (máx. 100) |
| `email` | string | ✅ | Email válido, único y no usado por un candidato |

**Ejemplo curl:**

```bash
curl -X POST http://localhost:3000/voters \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Ana García","email":"ana@test.com"}'
```

**Respuesta 201:**

```json
{
  "id": 1,
  "name": "Ana García",
  "email": "ana@test.com",
  "has_voted": 0,
  "created_at": "2026-09-08 12:00:00"
}
```

**Errores:**

| Código | Caso |
|--------|------|
| 400 | Validación falló (name vacío, email inválido) |
| 401 | Token ausente/inválido |
| 409 | Email ya existe como votante o como candidato |

### GET /voters

Lista votantes con paginación.

**Query params (opcionales):** `page` (>=1, default 1) · `limit` (1–100, default 20)

```bash
curl "http://localhost:3000/voters?page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

**Respuesta 200:**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Ana García",
      "email": "ana@test.com",
      "has_voted": 1,
      "created_at": "2026-09-08 12:00:00"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### GET /voters/:id

Devuelve un votante por ID. **404** si no existe.

```bash
curl "http://localhost:3000/voters/1" \
  -H "Authorization: Bearer <token>"
```

### DELETE /voters/:id

Elimina un votante. Elimina también su voto (ON DELETE CASCADE).

- **204** sin body si se eliminó
- **404** si no existe

```bash
curl -X DELETE "http://localhost:3000/voters/1" \
  -H "Authorization: Bearer <token>"
```

---

## Candidatos

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/candidates` | Registrar candidato |
| GET | `/candidates` | Listar candidatos |
| GET | `/candidates/:id` | Detalle de candidato |
| DELETE | `/candidates/:id` | Eliminar candidato |

### POST /candidates

Registra un candidato nuevo.

**Request body:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `name` | string | ✅ | Nombre (máx. 100) |
| `email` | string | ❌ | Email opcional. Si se envía, no puede ser de un votante |
| `party` | string | ❌ | Partido político (máx. 100) |

**Ejemplo curl:**

```bash
curl -X POST http://localhost:3000/candidates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Roberto Díaz","email":"roberto@test.com","party":"Partido Azul"}'
```

**Respuesta 201:**

```json
{
  "id": 1,
  "name": "Roberto Díaz",
  "email": "roberto@test.com",
  "party": "Partido Azul",
  "votes": 0,
  "created_at": "2026-09-08 12:00:00"
}
```

**Errores:** `400` validación · `401` sin token · `409` email ya usado por un votante.

### GET /candidates

Lista candidatos con paginación (igual que voters).

```bash
curl "http://localhost:3000/candidates?page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

### GET /candidates/:id

Detalle de candidato. **404** si no existe.

### DELETE /candidates/:id

Elimina un candidato y sus votos (CASCADE). **204** / **404**.

---

## Votos

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/votes` | Emitir un voto |
| GET | `/votes` | Listar votos emitidos |

### POST /votes

Emite un voto. La operación ocurre en una **transacción atómica**: inserta el voto, marca `has_voted = 1` en el votante e incrementa `votes` en el candidato.

**Request body:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `voter_id` | integer | ✅ | ID del votante (debe existir y no haber votado) |
| `candidate_id` | integer | ✅ | ID del candidato (debe existir) |

**Ejemplo curl:**

```bash
curl -X POST http://localhost:3000/votes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"voter_id":1,"candidate_id":1}'
```

**Respuesta 201:**

```json
{
  "id": 1,
  "voter_id": 1,
  "candidate_id": 1,
  "created_at": "2026-09-08 12:01:00"
}
```

**Errores:**

| Código | Caso |
|--------|------|
| 400 | `voter_id` o `candidate_id` no son enteros positivos |
| 401 | Token ausente/inválido |
| 404 | Votante o candidato no existe |
| 409 | El votante ya emitió su voto |

### GET /votes

Lista votos emitidos con paginación, incluyendo nombres del votante y candidato.

```bash
curl "http://localhost:3000/votes?page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

**Respuesta 200:**

```json
{
  "data": [
    {
      "id": 1,
      "voter_id": 1,
      "candidate_id": 1,
      "created_at": "2026-09-08 12:01:00",
      "voter_name": "Ana García",
      "candidate_name": "Roberto Díaz"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

## Estadísticas

### GET /votes/statistics

Devuelve el resumen completo de la votación.

```bash
curl "http://localhost:3000/votes/statistics" \
  -H "Authorization: Bearer <token>"
```

**Respuesta 200:**

```json
{
  "total_votes": 3,
  "total_voters_who_voted": 3,
  "candidates": [
    {
      "id": 1,
      "name": "Roberto Díaz",
      "party": "Partido Azul",
      "votes": 2,
      "percentage": 66.67
    },
    {
      "id": 2,
      "name": "Elena Vargas",
      "party": "Partido Verde",
      "votes": 1,
      "percentage": 33.33
    }
  ]
}
```

**Campos:**

| Campo | Descripción |
|-------|-------------|
| `total_votes` | Total de votos emitidos |
| `total_voters_who_voted` | Cantidad de votantes que ya votaron |
| `candidates[].votes` | Votos recibidos por el candidato |
| `candidates[].percentage` | Porcentaje calculado con 2 decimales (0 si no hay votos) |

Los candidatos se ordenan de mayor a menor cantidad de votos. Los porcentajes siempre suman ~100%.

---

## Health check

### GET /health

Verifica que el servidor esté vivo (público, sin token).

```bash
curl http://localhost:3000/health
```

**Respuesta 200:**

```json
{
  "status": "ok",
  "timestamp": "2026-09-08T12:00:00.000Z"
}
```

---

## Paginación

Aplicable a `GET /voters`, `GET /candidates` y `GET /votes`.

| Parámetro | Default | Rango válido |
|-----------|---------|--------------|
| `page` | 1 | >= 1 |
| `limit` | 20 | 1 – 100 |

**Formato de respuesta:**

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

---

## Códigos de error

Todos los errores tienen formato JSON estructurado:

```json
{
  "error": "Nombre del error",
  "message": "Descripción legible"
}
```

Los errores de validación incluyen `details`:

```json
{
  "error": "Validation Error",
  "details": [
    {
      "field": "email",
      "message": "Must be a valid email address.",
      "value": "no-es-un-email"
    }
  ]
}
```

| Código | Significado |
|--------|-------------|
| 400 | Validación de entrada falló |
| 401 | Token faltante, inválido o expirado / credenciales incorrectas |
| 404 | Recurso no encontrado de ruta inexistente |
| 409 | Conflicto (email duplicado, voto repetido, restricción cruzada) |
| 500 | Error interno del servidor |

---

## Flujo completo paso a paso

Secuencia recomendada para probar todo el sistema:

```bash
# 1. Crear usuario y guardar el token
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@test.com","password":"secreto123"}'
# → copiar el valor de "token"

# 2. Registrar 3 votantes
curl -X POST http://localhost:3000/voters -H "Content-Type: application/json" -H "Authorization: Bearer <token>" -d '{"name":"Ana García","email":"ana@test.com"}'
curl -X POST http://localhost:3000/voters -H "Content-Type: application/json" -H "Authorization: Bearer <token>" -d '{"name":"Carlos López","email":"carlos@test.com"}'
curl -X POST http://localhost:3000/voters -H "Content-Type: application/json" -H "Authorization: Bearer <token>" -d '{"name":"María Rodríguez","email":"maria@test.com"}'

# 3. Registrar 2 candidatos
curl -X POST http://localhost:3000/candidates -H "Content-Type: application/json" -H "Authorization: Bearer <token>" -d '{"name":"Roberto Díaz","email":"roberto@test.com","party":"Partido Azul"}'
curl -X POST http://localhost:3000/candidates -H "Content-Type: application/json" -H "Authorization: Bearer <token>" -d '{"name":"Elena Vargas","email":"elena@test.com","party":"Partido Verde"}'

# 4. Emitir votos (voter_id / candidate_id deben existir)
curl -X POST http://localhost:3000/votes -H "Content-Type: application/json" -H "Authorization: Bearer <token>" -d '{"voter_id":1,"candidate_id":1}'
curl -X POST http://localhost:3000/votes -H "Content-Type: application/json" -H "Authorization: Bearer <token>" -d '{"voter_id":2,"candidate_id":1}'
curl -X POST http://localhost:3000/votes -H "Content-Type: application/json" -H "Authorization: Bearer <token>" -d '{"voter_id":3,"candidate_id":2}'

# 5. Ver estadísticas
curl http://localhost:3000/votes/statistics -H "Authorization: Bearer <token>"
```

---

## Uso con Postman

1. **Crear un request** → `POST http://localhost:3000/auth/register`.
2. **Body** → raw → JSON → pegar `{"name":"Admin","email":"admin@test.com","password":"secreto123"}` → **Send**.
3. **Copiar el `token`** del response.
4. Ir a la pestaña **Auth** (junto a Body/Headers) → seleccionar **Type: Bearer Token** → pegar el token en **Token**.
5. Crear los requests de votantes, candidatos y votos. El token queda configurado automáticamente para todos.

> 💡 Si un endpoint devuelve **401**, el token expiró (default 8h) — volvé a hacer `POST /auth/login` y actualizalo.