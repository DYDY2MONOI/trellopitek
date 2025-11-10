package models

import "database/sql"

type List struct {
    ID       int    `json:"id"`
    BoardID  int    `json:"board_id"`
    Title    string `json:"title"`
    Accent   string `json:"accent"`
    Position int    `json:"position"`
}

type ListService struct { DB *sql.DB }

func (s *ListService) CreateList(boardID int, title, accent string, position int) (*List, error) {
    var id int
    err := s.DB.QueryRow(
        "INSERT INTO lists (board_id, title, accent, position) VALUES ($1,$2,$3,$4) RETURNING id",
        boardID, title, accent, position,
    ).Scan(&id)
    if err != nil { return nil, err }
    return s.GetListByID(id)
}

func (s *ListService) GetListByID(id int) (*List, error) {
    var l List
    err := s.DB.QueryRow("SELECT id, board_id, title, accent, position FROM lists WHERE id=$1", id).
        Scan(&l.ID, &l.BoardID, &l.Title, &l.Accent, &l.Position)
    if err != nil { return nil, err }
    return &l, nil
}

func (s *ListService) GetListsByBoard(boardID int) ([]List, error) {
    rows, err := s.DB.Query("SELECT id, board_id, title, accent, position FROM lists WHERE board_id=$1 ORDER BY position, id", boardID)
    if err != nil { return nil, err }
    defer rows.Close()
    var out []List
    for rows.Next() {
        var l List
        if err := rows.Scan(&l.ID, &l.BoardID, &l.Title, &l.Accent, &l.Position); err != nil { return nil, err }
        out = append(out, l)
    }
    return out, rows.Err()
}

