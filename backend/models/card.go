package models

import "database/sql"

type Card struct {
    ID       int    `json:"id"`
    ListID   int    `json:"list_id"`
    Title    string `json:"title"`
    Badge    string `json:"badge"`
    Color    string `json:"color"`
    Position int    `json:"position"`
}

type CardService struct { DB *sql.DB }

func (s *CardService) CreateCard(listID int, title, badge, color string, position int) (*Card, error) {
    var id int
    err := s.DB.QueryRow(
        "INSERT INTO cards (list_id, title, badge, color, position) VALUES ($1,$2,$3,$4,$5) RETURNING id",
        listID, title, badge, color, position,
    ).Scan(&id)
    if err != nil { return nil, err }
    return s.GetCardByID(id)
}

func (s *CardService) GetCardByID(id int) (*Card, error) {
    var c Card
    err := s.DB.QueryRow("SELECT id, list_id, title, badge, color, position FROM cards WHERE id=$1", id).
        Scan(&c.ID, &c.ListID, &c.Title, &c.Badge, &c.Color, &c.Position)
    if err != nil { return nil, err }
    return &c, nil
}

func (s *CardService) GetCardsByList(listID int) ([]Card, error) {
    rows, err := s.DB.Query("SELECT id, list_id, title, badge, color, position FROM cards WHERE list_id=$1 ORDER BY position, id", listID)
    if err != nil { return nil, err }
    defer rows.Close()
    var out []Card
    for rows.Next() {
        var c Card
        if err := rows.Scan(&c.ID, &c.ListID, &c.Title, &c.Badge, &c.Color, &c.Position); err != nil { return nil, err }
        out = append(out, c)
    }
    return out, rows.Err()
}

