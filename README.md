# TrelloPitek 📋

A collaborative task management application inspired by Trello, built with a **Go** backend and a **React** frontend.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [With Docker (recommended)](#with-docker-recommended)
  - [Without Docker](#without-docker)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Features](#features)

---

## Overview

TrelloPitek is a full-stack, collaborative task management app. Users can create boards, organise lists of cards with drag-and-drop, assign members and tags to cards, leave comments, and track activity history — all behind JWT-secured endpoints.

---

## Tech Stack

| Layer      | Technology                                                          |
|------------|---------------------------------------------------------------------|
| Frontend   | React 19, React Router v6, TailwindCSS, @hello-pangea/dnd (D&D)   |
| Backend    | Go 1.21, gorilla/mux, golang-jwt/jwt v5, bcrypt                    |
| Database   | PostgreSQL 15                                                       |
| Proxy      | Nginx (production container)                                        |
| Deployment | Docker + Docker Compose                                             |

---

## Project Structure

```
trellopitek/
├── backend/
│   ├── main.go              # Entry point — router setup, server start
│   ├── go.mod / go.sum
│   ├── handlers/
│   │   ├── auth.go          # Register, Login, GetMe
│   │   └── board.go         # Boards, Lists, Cards, Members, Tags, Comments, Activities
│   ├── middleware/
│   │   ├── auth.go          # JWT validation middleware
│   │   └── cors.go          # CORS middleware
│   └── models/
│       ├── database.go      # DB init + auto-migration (CREATE TABLE IF NOT EXISTS)
│       ├── user.go
│       ├── board.go
│       ├── board_member.go
│       ├── list.go
│       ├── card.go
│       ├── card_tag.go
│       ├── card_comment.go
│       ├── card_member.go
│       └── activity.go
├── frontend/
│   ├── public/
│   └── src/
│       ├── App.js           # Main app + routing
│       ├── components/      # Login, Register, ShareBoardModal, UI primitives…
│       ├── pages/           # Page-level components
│       ├── services/        # API service layer
│       └── styles/
├── docker-compose.yml
├── Dockerfile               # Frontend production image (Nginx)
└── .env                     # Environment variables (see below)
```

---

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose **— or —**
- Go 1.21+, Node 18+, and a running PostgreSQL 15 instance

---

### With Docker (recommended)

1. **Clone the repository**

```bash
git clone <repo-url>
cd trellopitek
```

2. **Copy and fill in the environment file**

```bash
cp .env.example .env   # or edit .env directly
```

> See [Environment Variables](#environment-variables) for all required values.

3. **Start all services**

```bash
docker compose up --build -d
```

| Service    | URL                        |
|------------|----------------------------|
| Frontend   | http://localhost:3000       |
| Backend    | http://localhost:8080       |
| PostgreSQL | localhost:5433 (host port)  |

4. **Stop services**

```bash
docker compose down
```

---

### Without Docker

#### Backend

```bash
cd backend

# Set required environment variables (or export them manually)
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=postgres
export DB_PASSWORD=yourpassword
export DB_NAME=trellopitek
export DB_SSLMODE=disable
export PORT=8080
export JWT_SECRET=your_secret_key

go run main.go
```

The database tables are created automatically on first start (no migrations needed).

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (proxies API calls to localhost:8080)
npm start
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Create a `.env` file at the project root (used by Docker Compose):

| Variable            | Description                           | Example                   |
|---------------------|---------------------------------------|---------------------------|
| `REACT_APP_API_URL` | Backend URL seen by the browser       | `http://localhost:8080`   |
| `PORT`              | Port the Go server listens on         | `8080`                    |
| `DB_HOST`           | PostgreSQL hostname                   | `postgres`                |
| `DB_PORT`           | PostgreSQL port                       | `5432`                    |
| `DB_USER`           | PostgreSQL user                       | `trellopitek`             |
| `DB_PASSWORD`       | PostgreSQL password                   | `trellopitek`             |
| `DB_NAME`           | PostgreSQL database name              | `trellopitek`             |
| `DB_SSLMODE`        | SSL mode (`disable` / `require`)      | `disable`                 |
| `POSTGRES_DB`       | DB name for the Postgres image        | `trellopitek`             |
| `POSTGRES_USER`     | User for the Postgres image           | `trellopitek`             |
| `POSTGRES_PASSWORD` | Password for the Postgres image       | `trellopitek`             |

> **Note:** `JWT_SECRET` should be set as an environment variable in production but is not currently declared in `docker-compose.yml`.

---

## API Reference

All routes under `/api` except `/register` and `/login` require the `Authorization: Bearer <token>` header.

### Auth

| Method | Endpoint        | Description              | Auth required |
|--------|-----------------|--------------------------|---------------|
| POST   | `/api/register` | Create a new account     | ❌            |
| POST   | `/api/login`    | Log in, receive JWT      | ❌            |
| GET    | `/api/me`       | Get current user info    | ✅            |

### Boards

| Method | Endpoint                          | Description                       |
|--------|-----------------------------------|-----------------------------------|
| GET    | `/api/boards`                     | List boards for current user      |
| POST   | `/api/boards`                     | Create a new board                |
| GET    | `/api/boards/{id}`                | Get a board with its lists/cards  |
| GET    | `/api/boards/{id}/members`        | List board members                |
| POST   | `/api/boards/{id}/members`        | Invite a member to the board      |
| DELETE | `/api/boards/{id}/members/{uid}`  | Remove a member from the board    |

### Users

| Method | Endpoint           | Description                      |
|--------|--------------------|----------------------------------|
| GET    | `/api/users/search`| Search users by email (for invite)|

### Cards

| Method | Endpoint                          | Description                    |
|--------|-----------------------------------|--------------------------------|
| POST   | `/api/lists/{id}/cards`           | Create a card in a list        |
| GET    | `/api/cards/{id}`                 | Get a card (with tags/members) |
| PATCH  | `/api/cards/{id}`                 | Update a card                  |
| POST   | `/api/cards/{id}/tags`            | Add a tag to a card            |
| DELETE | `/api/cards/{id}/tags/{tagId}`    | Remove a tag from a card       |
| GET    | `/api/cards/{id}/comments`        | List comments on a card        |
| POST   | `/api/cards/{id}/comments`        | Add a comment to a card        |
| POST   | `/api/cards/{id}/members`         | Assign a member to a card      |
| DELETE | `/api/cards/{id}/members/{uid}`   | Remove a member from a card    |
| GET    | `/api/cards/{id}/activities`      | Get activity log for a card    |

---

## Database Schema

Tables are created automatically at startup. No manual migrations required.

```
users
  id, email (unique), password_hash, created_at

boards
  id, user_id → users, title, created_at

lists
  id, board_id → boards, title, accent, position, created_at

cards
  id, list_id → lists, title, description, badge, color, position, due_date, created_at

card_tags
  id, card_id → cards, name, color  [unique(card_id, name)]

card_comments
  id, card_id → cards, user_id → users, content, created_at

board_members
  id, board_id → boards, user_id → users, role, created_at  [unique(board_id, user_id)]

card_members
  id, card_id → cards, user_id → users, created_at  [unique(card_id, user_id)]

activities
  id, card_id → cards, user_id → users, action_type, details, created_at
```

---

## Features

- 🔐 **Authentication** — JWT-based login/register with bcrypt password hashing
- 📋 **Boards** — Create and manage multiple boards
- 📑 **Lists** — Organise cards into colour-accented lists with ordering
- 🃏 **Cards** — Rich cards with title, description, badge, colour, and due date
- 🏷️ **Tags** — Label cards with coloured, named tags
- 👥 **Collaboration** — Invite members to boards; assign members to individual cards
- 💬 **Comments** — Leave comments on cards
- 📜 **Activity log** — Track all actions on a card
- 🖱️ **Drag & Drop** — Smooth card and list reordering powered by `@hello-pangea/dnd`
- 🐳 **Docker** — One-command deployment with Docker Compose
