package models

import (
    "database/sql"
    "time"
)

type Board struct {
    ID        int       `json:"id"`
    UserID    int       `json:"user_id"`
    Title     string    `json:"title"`
    CreatedAt time.Time `json:"created_at"`
}

type BoardService struct {
    DB *sql.DB
}

func (bs *BoardService) CreateBoard(userID int, title string) (*Board, error) {
    var id int
    err := bs.DB.QueryRow(
        "INSERT INTO boards (user_id, title) VALUES ($1, $2) RETURNING id",
        userID, title,
    ).Scan(&id)
    if err != nil {
        return nil, err
    }
    return bs.GetBoardByID(id)
}

func (bs *BoardService) GetBoardsByUser(userID int) ([]Board, error) {
    rows, err := bs.DB.Query(
        "SELECT id, user_id, title, created_at FROM boards WHERE user_id = $1 ORDER BY created_at DESC",
        userID,
    )
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var boards []Board
    for rows.Next() {
        var b Board
        if err := rows.Scan(&b.ID, &b.UserID, &b.Title, &b.CreatedAt); err != nil {
            return nil, err
        }
        boards = append(boards, b)
    }
    if err := rows.Err(); err != nil {
        return nil, err
    }
    return boards, nil
}

func (bs *BoardService) GetBoardByID(id int) (*Board, error) {
    var b Board
    err := bs.DB.QueryRow(
        "SELECT id, user_id, title, created_at FROM boards WHERE id = $1",
        id,
    ).Scan(&b.ID, &b.UserID, &b.Title, &b.CreatedAt)
    if err != nil {
        return nil, err
    }
    return &b, nil
}

