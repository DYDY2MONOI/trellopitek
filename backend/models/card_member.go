package models

import (
	"database/sql"
	"time"
)

type CardMember struct {
	ID        int       `json:"id"`
	CardID    int       `json:"card_id"`
	UserID    int       `json:"user_id"`
	UserEmail string    `json:"user_email"` // Join with users table
	CreatedAt time.Time `json:"created_at"`
}

type CardMemberService struct {
	DB *sql.DB
}

func (s *CardMemberService) AddMember(cardID, userID int) error {
	_, err := s.DB.Exec(
		"INSERT INTO card_members (card_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
		cardID, userID,
	)
	return err
}

func (s *CardMemberService) RemoveMember(cardID, userID int) error {
	_, err := s.DB.Exec(
		"DELETE FROM card_members WHERE card_id=$1 AND user_id=$2",
		cardID, userID,
	)
	return err
}

func (s *CardMemberService) GetMembersByCard(cardID int) ([]CardMember, error) {
	rows, err := s.DB.Query(`
		SELECT cm.id, cm.card_id, cm.user_id, cm.created_at, u.email
		FROM card_members cm
		JOIN users u ON cm.user_id = u.id
		WHERE cm.card_id = $1
	`, cardID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []CardMember
	for rows.Next() {
		var m CardMember
		if err := rows.Scan(&m.ID, &m.CardID, &m.UserID, &m.CreatedAt, &m.UserEmail); err != nil {
			return nil, err
		}
		members = append(members, m)
	}
	return members, rows.Err()
}
