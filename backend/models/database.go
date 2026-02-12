package models

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
)

var DB *sql.DB

func InitDB() (*sql.DB, error) {
	host := getEnv("DB_HOST", "postgres")
	port := getEnv("DB_PORT", "5432")
	user := getEnv("DB_USER", "postgres")
	password := os.Getenv("DB_PASSWORD")
	dbName := getEnv("DB_NAME", "trellomirror")
	sslMode := getEnv("DB_SSLMODE", "disable")

	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		host, port, user, password, dbName, sslMode,
	)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

    createUsersTableSQL := `
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    `

    _, err = db.Exec(createUsersTableSQL)
    if err != nil {
        return nil, err
    }

    createBoardsTableSQL := `
    CREATE TABLE IF NOT EXISTS boards (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_boards_user_id ON boards(user_id);
    `

    _, err = db.Exec(createBoardsTableSQL)
    if err != nil {
        return nil, err
    }

    createListsTableSQL := `
    CREATE TABLE IF NOT EXISTS lists (
        id SERIAL PRIMARY KEY,
        board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        accent TEXT NOT NULL DEFAULT 'primary',
        position INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_lists_board_id ON lists(board_id);
    `

    _, err = db.Exec(createListsTableSQL)
    if err != nil {
        return nil, err
    }

    createCardsTableSQL := `
    CREATE TABLE IF NOT EXISTS cards (
        id SERIAL PRIMARY KEY,
        list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        badge TEXT,
        color TEXT NOT NULL DEFAULT 'primary',
        position INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_cards_list_id ON cards(list_id);
    `

    _, err = db.Exec(createCardsTableSQL)
    if err != nil {
        return nil, err
    }

    // Add description column if it doesn't exist
    _, _ = db.Exec(`ALTER TABLE cards ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''`)

    createCardTagsTableSQL := `
    CREATE TABLE IF NOT EXISTS card_tags (
        id SERIAL PRIMARY KEY,
        card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT 'primary',
        UNIQUE(card_id, name)
    );
    CREATE INDEX IF NOT EXISTS idx_card_tags_card_id ON card_tags(card_id);
    `

    _, err = db.Exec(createCardTagsTableSQL)
    if err != nil {
        return nil, err
    }

    createCardCommentsTableSQL := `
    CREATE TABLE IF NOT EXISTS card_comments (
        id SERIAL PRIMARY KEY,
        card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_card_comments_card_id ON card_comments(card_id);
    `

    _, err = db.Exec(createCardCommentsTableSQL)
    if err != nil {
        return nil, err
    }

    createBoardMembersTableSQL := `
    CREATE TABLE IF NOT EXISTS board_members (
        id SERIAL PRIMARY KEY,
        board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'member',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(board_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_board_members_board_id ON board_members(board_id);
    CREATE INDEX IF NOT EXISTS idx_board_members_user_id ON board_members(user_id);
    `

    _, err = db.Exec(createBoardMembersTableSQL)
    if err != nil {
        return nil, err
    }

	DB = db
	log.Println("Database initialized successfully")
	return db, nil
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
