package models

import (
	"database/sql"
	"time"
)

type CardComment struct {
	ID        int       `json:"id"`
	CardID    int       `json:"card_id"`
	UserID    int       `json:"user_id"`
	UserEmail string    `json:"user_email"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
}

type CardCommentService struct{ DB *sql.DB }

func (s *CardCommentService) GetCommentsByCard(cardID int) ([]CardComment, error) {
	rows, err := s.DB.Query(
		`SELECT cc.id, cc.card_id, cc.user_id, u.email, cc.content, cc.created_at
		 FROM card_comments cc
		 JOIN users u ON u.id = cc.user_id
		 WHERE cc.card_id=$1
		 ORDER BY cc.created_at ASC`, cardID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []CardComment
	for rows.Next() {
		var c CardComment
		if err := rows.Scan(&c.ID, &c.CardID, &c.UserID, &c.UserEmail, &c.Content, &c.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *CardCommentService) AddComment(cardID, userID int, content string) (*CardComment, error) {
	var id int
	var createdAt time.Time
	err := s.DB.QueryRow(
		"INSERT INTO card_comments (card_id, user_id, content) VALUES ($1,$2,$3) RETURNING id, created_at",
		cardID, userID, content,
	).Scan(&id, &createdAt)
	if err != nil {
		return nil, err
	}

	var c CardComment
	err = s.DB.QueryRow(
		`SELECT cc.id, cc.card_id, cc.user_id, u.email, cc.content, cc.created_at
		 FROM card_comments cc
		 JOIN users u ON u.id = cc.user_id
		 WHERE cc.id=$1`, id).
		Scan(&c.ID, &c.CardID, &c.UserID, &c.UserEmail, &c.Content, &c.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &c, nil
}
