package models

import "database/sql"

type CardTag struct {
	ID     int    `json:"id"`
	CardID int    `json:"card_id"`
	Name   string `json:"name"`
	Color  string `json:"color"`
}

type CardTagService struct{ DB *sql.DB }

func (s *CardTagService) GetTagsByCard(cardID int) ([]CardTag, error) {
	rows, err := s.DB.Query("SELECT id, card_id, name, color FROM card_tags WHERE card_id=$1 ORDER BY id", cardID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []CardTag
	for rows.Next() {
		var t CardTag
		if err := rows.Scan(&t.ID, &t.CardID, &t.Name, &t.Color); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

func (s *CardTagService) AddTag(cardID int, name, color string) (*CardTag, error) {
	var id int
	err := s.DB.QueryRow(
		"INSERT INTO card_tags (card_id, name, color) VALUES ($1,$2,$3) ON CONFLICT (card_id, name) DO UPDATE SET color=$3 RETURNING id",
		cardID, name, color,
	).Scan(&id)
	if err != nil {
		return nil, err
	}
	var t CardTag
	err = s.DB.QueryRow("SELECT id, card_id, name, color FROM card_tags WHERE id=$1", id).
		Scan(&t.ID, &t.CardID, &t.Name, &t.Color)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (s *CardTagService) RemoveTag(id int) error {
	_, err := s.DB.Exec("DELETE FROM card_tags WHERE id=$1", id)
	return err
}
