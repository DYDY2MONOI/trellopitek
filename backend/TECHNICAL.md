# Backend — Technical Documentation

> Go 1.21 · gorilla/mux · database/sql + lib/pq · golang-jwt/jwt v5 · bcrypt

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Package Structure](#2-package-structure)
3. [Request Lifecycle](#3-request-lifecycle)
4. [Middleware](#4-middleware)
5. [Handlers](#5-handlers)
6. [Models & Data Layer](#6-models--data-layer)
7. [Database Schema](#7-database-schema)
8. [Authentication](#8-authentication)
9. [Business Logic & Design Decisions](#9-business-logic--design-decisions)
10. [Environment Variables](#10-environment-variables)
11. [Dependencies](#11-dependencies)

---

## 1. Architecture Overview

The backend follows a **layered architecture** with three explicit layers:

```
HTTP Request
     │
     ▼
 Middleware          ← CORS, JWT auth
     │
     ▼
  Handlers          ← HTTP parsing, validation, response encoding
     │
     ▼
   Models           ← SQL queries, data structs
     │
     ▼
 PostgreSQL
```

There is **no ORM** — raw `database/sql` with the `lib/pq` driver is used throughout, keeping queries explicit and predictable.

---

## 2. Package Structure

```
backend/
├── main.go              # Entry point: DB init, router setup, HTTP server
├── handlers/
│   ├── auth.go          # Register, Login, GetMe + JWT signing
│   └── board.go         # All board/list/card/member/tag/comment/activity handlers
├── middleware/
│   ├── auth.go          # JWT validation middleware, injects userID into context
│   └── cors.go          # CORS headers + OPTIONS preflight handling
└── models/
    ├── database.go      # DB connection + auto CREATE TABLE IF NOT EXISTS
    ├── user.go          # User struct + UserService
    ├── board.go         # Board struct + BoardService
    ├── board_member.go  # BoardMember struct + BoardMemberService
    ├── list.go          # List struct + ListService
    ├── card.go          # Card struct + CardService
    ├── card_tag.go      # CardTag struct + CardTagService
    ├── card_comment.go  # CardComment struct + CardCommentService
    ├── card_member.go   # CardMember struct + CardMemberService
    └── activity.go      # Activity struct + ActivityService
```

### Naming convention

Each model file defines:
- A **struct** (e.g. `Card`) — matches the database row, JSON-serialisable.
- A **service** (e.g. `CardService`) — holds a `*sql.DB` and exposes methods for CRUD.

---

## 3. Request Lifecycle

```
POST /api/login  (public)
─────────────────────────────────────────────────────
1. CORS middleware sets headers / handles OPTIONS
2. mux routes to authHandler.Login
3. Handler decodes JSON body → LoginRequest
4. UserService.GetUserByEmail → fetches hash from DB
5. bcrypt.CompareHashAndPassword validates password
6. generateToken() creates a signed HS256 JWT (7-day expiry)
7. JSON response: { token, user }

GET /api/boards  (protected)
─────────────────────────────────────────────────────
1. CORS middleware
2. AuthMiddleware: extracts Bearer token, validates signature,
   injects userID into request context
3. mux routes to boardHandler.ListBoards
4. Handler reads userID from context
5. Raw SQL: boards owned by user OR shared via board_members
6. JSON response: []Board
```

---

## 4. Middleware

### `middleware/cors.go`

Sets permissive CORS headers on every response and immediately returns `200 OK` for `OPTIONS` preflight requests. In production, replace `*` with your actual frontend origin.

```go
w.Header().Set("Access-Control-Allow-Origin", "*")
w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
```

### `middleware/auth.go`

Validates the `Authorization: Bearer <token>` header on every protected route:

1. Splits the header and checks the `Bearer` prefix.
2. Parses & validates the JWT signature using `jwtSecret` (loaded from `JWT_SECRET` env var).
3. Verifies the token uses HMAC (`HS256`).
4. Extracts `user_id` from the claims.
5. Injects it into the request context as `"userID"` (`int`).

Any handler retrieves it via:
```go
userID := r.Context().Value("userID").(int)
```

---

## 5. Handlers

### `handlers/auth.go` — `AuthHandler`

| Method | Function | Description |
|--------|----------|-------------|
| `POST /api/register` | `Register` | Hash password with bcrypt, insert user, return JWT |
| `POST /api/login` | `Login` | Verify password with bcrypt, return JWT |
| `GET /api/me` | `GetMe` | Return the authenticated user from DB |

**JWT expiry:** 7 days (`time.Hour * 24 * 7`).  
**Signing algorithm:** `HS256`.  
**Secret:** read from `JWT_SECRET` env var at startup (falls back to an insecure default with a warning log if not set).

---

### `handlers/board.go` — `BoardHandler`

`BoardHandler` aggregates **all 9 services** as fields, injected at startup via `NewBoardHandler(db)`.

#### Boards

| Function | Key logic |
|----------|-----------|
| `ListBoards` | `SELECT DISTINCT … LEFT JOIN board_members` — returns boards the user owns **or** is a member of |
| `GetBoard` | Checks owner or member access, then assembles full `boardDetail` (board + lists + cards + tags per card) |
| `CreateBoard` | Creates the board, adds creator as `owner` in `board_members`, and seeds 4 default lists: *Ideas*, *In Progress*, *Review*, *Done* |

#### Cards

| Function | Key logic |
|----------|-----------|
| `CreateCard` | Auto-sets `position = len(existing cards in list)`, logs `create_card` activity |
| `GetCard` | Returns card + tags + comments in one response |
| `UpdateCard` | Partial update (all fields use pointer types, falls back to existing value if nil), parses `due_date` as RFC3339, logs `move_card` / `update_card` activities |

#### Card colour normalisation — `normalizeCardColor`

Cards inherit a colour from their list. The function applies this priority:

1. **List title** (matches "in progress", "review", "ideas", "done", "inbox")
2. **List accent** field (free-form colour token)
3. **Card's own colour** field (with aliases like `"inprogress"` → `"primary"`)
4. Fallback: `"primary"`

Valid colour tokens: `primary`, `warning`, `accent`, `success`, `inbox`.

#### Collaboration

| Function | Access control |
|----------|----------------|
| `InviteMember` | Owner only. Rejects self-invite and duplicate members |
| `RemoveMember` | Owner only. Cannot remove the owner themselves |
| `GetBoardMembers` | Owner or any board member |

#### User search

`SearchUsers` — searches by email prefix (`ILIKE`), excludes the requesting user, returns max 10 results. Requires at least 2 characters (`?q=`).

---

## 6. Models & Data Layer

All services follow the same pattern:

```go
type XxxService struct {
    DB *sql.DB
}

func (s *XxxService) DoSomething(...) (*Xxx, error) {
    // raw SQL
}
```

**No connection pooling configuration** is set explicitly — `database/sql` manages a pool by default (max 0 open connections = unlimited; max idle = 2).

### Key model fields

```
User          id, email, created_at        (password_hash never serialised)
Board         id, user_id, title, created_at
List          id, board_id, title, accent, position, created_at
Card          id, list_id, title, description, badge, color, position, due_date
CardTag       id, card_id, name, color      (unique per card+name)
CardComment   id, card_id, user_id, content, created_at
BoardMember   id, board_id, user_id, role, created_at
CardMember    id, card_id, user_id, created_at
Activity      id, card_id, user_id, action_type, details, created_at
```

---

## 7. Database Schema

Tables are created automatically at startup with `CREATE TABLE IF NOT EXISTS`. Two columns are added via `ALTER TABLE … ADD COLUMN IF NOT EXISTS` for backwards compatibility:

- `cards.description TEXT DEFAULT ''`
- `cards.due_date TIMESTAMPTZ`

### Relationships (foreign keys, all `ON DELETE CASCADE`)

```
users
 └── boards (user_id)
      └── board_members (board_id) ←→ users (user_id)
      └── lists (board_id)
           └── cards (list_id)
                ├── card_tags (card_id)
                ├── card_comments (card_id) ←→ users (user_id)
                ├── card_members (card_id)  ←→ users (user_id)
                └── activities (card_id)   ←→ users (user_id)
```

### Indexes

| Table | Index |
|-------|-------|
| `boards` | `idx_boards_user_id` |
| `lists` | `idx_lists_board_id` |
| `cards` | `idx_cards_list_id` |
| `card_tags` | `idx_card_tags_card_id` |
| `card_comments` | `idx_card_comments_card_id` |
| `board_members` | `idx_board_members_board_id`, `idx_board_members_user_id` |
| `card_members` | `idx_card_members_card_id` |
| `activities` | `idx_activities_card_id` |

---

## 8. Authentication

### Registration flow

```
email + password
       │
       ▼
bcrypt.GenerateFromPassword (cost = DefaultCost / 10)
       │
       ▼
INSERT INTO users (email, password_hash)
       │
       ▼
generateToken(userID, email) → signed HS256 JWT
       │
       ▼
{ token, user }
```

### Login flow

```
email + password
       │
       ▼
SELECT … WHERE email = $1  →  user + password_hash
       │
       ▼
bcrypt.CompareHashAndPassword
       │
       ▼
generateToken → { token, user }
```

### JWT payload (claims)

```json
{
  "user_id": 42,
  "email": "user@example.com",
  "exp": 1234567890
}
```

Token lifetime: **7 days**. There are currently no refresh tokens.

---

## 9. Business Logic & Design Decisions

### Board membership model

- The board creator is automatically added to `board_members` with `role = "owner"`.
- Invited users get `role = "member"`.
- The `boards.user_id` column still stores the original owner; `board_members` serves for collaboration lookups.

### Activity logging

`ActivityService.LogActivity()` is called inside handlers (not in models) to keep model methods pure SQL operations. Logged events: `create_card`, `move_card`, `update_card`, `add_member`, `remove_member`.

### Partial card updates

`UpdateCard` accepts a body where **every field is a pointer**. A `nil` pointer means "don't change this field". This lets the frontend send only the fields that changed (e.g. just `listId` for a drag-and-drop move).

### No ORM

Raw `database/sql` was chosen for simplicity and full control over queries. There is no migration tool — schema is maintained via `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE … ADD COLUMN IF NOT EXISTS` in `database.go`.

### CORS

Currently configured with `Access-Control-Allow-Origin: *`. **This must be restricted to the frontend origin in production.**

---

## 10. Environment Variables

| Variable | Used in | Default | Description |
|----------|---------|---------|-------------|
| `PORT` | `main.go` | `8080` | HTTP listen port |
| `JWT_SECRET` | `handlers/auth.go`, `middleware/auth.go` | insecure fallback (warns) | HS256 signing key |
| `DB_HOST` | `models/database.go` | `postgres` | PostgreSQL host |
| `DB_PORT` | `models/database.go` | `5432` | PostgreSQL port |
| `DB_USER` | `models/database.go` | `postgres` | PostgreSQL user |
| `DB_PASSWORD` | `models/database.go` | *(none)* | PostgreSQL password |
| `DB_NAME` | `models/database.go` | `trellomirror` | Database name |
| `DB_SSLMODE` | `models/database.go` | `disable` | SSL mode |

---

## 11. Dependencies

| Module | Version | Role |
|--------|---------|------|
| `github.com/gorilla/mux` | v1.8.1 | HTTP router with path variable support |
| `github.com/golang-jwt/jwt/v5` | v5.2.0 | JWT creation and validation |
| `github.com/lib/pq` | v1.10.9 | PostgreSQL driver for `database/sql` |
| `golang.org/x/crypto` | v0.18.0 | bcrypt password hashing |

Install / update:
```bash
go mod tidy
```
