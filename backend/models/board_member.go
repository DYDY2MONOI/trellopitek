package models

import (
	"database/sql"
	"time"
)

type BoardMember struct {
	ID        int       `json:"id"`
	BoardID   int       `json:"board_id"`
	UserID    int       `json:"user_id"`
	Role      string    `json:"role"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
}

type BoardMemberService struct {
	DB *sql.DB
}

func (bms *BoardMemberService) AddMember(boardID, userID int, role string) (*BoardMember, error) {
	if role == "" {
		role = "member"
	}
	var id int
	err := bms.DB.QueryRow(
		`INSERT INTO board_members (board_id, user_id, role)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (board_id, user_id) DO NOTHING
		 RETURNING id`,
		boardID, userID, role,
	).Scan(&id)
	if err != nil {
		return nil, err
	}
	return bms.GetMemberByID(id)
}

func (bms *BoardMemberService) RemoveMember(boardID, userID int) error {
	_, err := bms.DB.Exec(
		"DELETE FROM board_members WHERE board_id = $1 AND user_id = $2 AND role != 'owner'",
		boardID, userID,
	)
	return err
}

func (bms *BoardMemberService) GetMembersByBoard(boardID int) ([]BoardMember, error) {
	rows, err := bms.DB.Query(
		`SELECT bm.id, bm.board_id, bm.user_id, bm.role, u.email, bm.created_at
		 FROM board_members bm
		 JOIN users u ON u.id = bm.user_id
		 WHERE bm.board_id = $1
		 ORDER BY bm.created_at ASC`,
		boardID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []BoardMember
	for rows.Next() {
		var m BoardMember
		if err := rows.Scan(&m.ID, &m.BoardID, &m.UserID, &m.Role, &m.Email, &m.CreatedAt); err != nil {
			return nil, err
		}
		members = append(members, m)
	}
	return members, rows.Err()
}

func (bms *BoardMemberService) IsMember(boardID, userID int) (bool, error) {
	var count int
	err := bms.DB.QueryRow(
		"SELECT COUNT(*) FROM board_members WHERE board_id = $1 AND user_id = $2",
		boardID, userID,
	).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (bms *BoardMemberService) GetMemberByID(id int) (*BoardMember, error) {
	var m BoardMember
	err := bms.DB.QueryRow(
		`SELECT bm.id, bm.board_id, bm.user_id, bm.role, u.email, bm.created_at
		 FROM board_members bm
		 JOIN users u ON u.id = bm.user_id
		 WHERE bm.id = $1`,
		id,
	).Scan(&m.ID, &m.BoardID, &m.UserID, &m.Role, &m.Email, &m.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &m, nil
}
