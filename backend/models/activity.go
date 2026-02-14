package models

import (
	"database/sql"
	"time"
)

type Activity struct {
	ID         int       `json:"id"`
	CardID     *int      `json:"card_id"`
	UserID     int       `json:"user_id"`
	UserEmail  string    `json:"user_email"`
	ActionType string    `json:"action_type"`
	Details    string    `json:"details"`
	CreatedAt  time.Time `json:"created_at"`
}

type ActivityService struct {
	DB *sql.DB
}

func (s *ActivityService) LogActivity(cardID *int, userID int, actionType, details string) error {
	_, err := s.DB.Exec(
		"INSERT INTO activities (card_id, user_id, action_type, details) VALUES ($1, $2, $3, $4)",
		cardID, userID, actionType, details,
	)
	return err
}

func (s *ActivityService) GetActivitiesByCard(cardID int) ([]Activity, error) {
	rows, err := s.DB.Query(`
		SELECT a.id, a.card_id, a.user_id, u.email, a.action_type, a.details, a.created_at
		FROM activities a
		JOIN users u ON a.user_id = u.id
		WHERE a.card_id = $1
		ORDER BY a.created_at DESC
	`, cardID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var activities []Activity
	for rows.Next() {
		var a Activity
		if err := rows.Scan(&a.ID, &a.CardID, &a.UserID, &a.UserEmail, &a.ActionType, &a.Details, &a.CreatedAt); err != nil {
			return nil, err
		}
		activities = append(activities, a)
	}
	return activities, rows.Err()
}
