package models

import (
	"database/sql"
	"time"
)

type Card struct {
	ID          int          `json:"id"`
	ListID      int          `json:"list_id"`
	Title       string       `json:"title"`
	Description string       `json:"description"`
	Badge       string       `json:"badge"`
	Color       string       `json:"color"`
	Position    int          `json:"position"`
	DueDate     *time.Time   `json:"due_date"`
	Tags        []CardTag    `json:"tags,omitempty"`
	Members     []CardMember `json:"members,omitempty"`
}

type CardService struct{ DB *sql.DB }

func (s *CardService) CreateCard(listID int, title, badge, color string, position int) (*Card, error) {
	var id int
	err := s.DB.QueryRow(
		"INSERT INTO cards (list_id, title, badge, color, position) VALUES ($1,$2,$3,$4,$5) RETURNING id",
		listID, title, badge, color, position,
	).Scan(&id)
	if err != nil {
		return nil, err
	}
	return s.GetCardByID(id)
}

func (s *CardService) GetCardByID(id int) (*Card, error) {
	var c Card
	var dueDate sql.NullTime
	err := s.DB.QueryRow("SELECT id, list_id, title, COALESCE(description,''), badge, color, position, due_date FROM cards WHERE id=$1", id).
		Scan(&c.ID, &c.ListID, &c.Title, &c.Description, &c.Badge, &c.Color, &c.Position, &dueDate)
	if err != nil {
		return nil, err
	}
	if dueDate.Valid {
		c.DueDate = &dueDate.Time
	}
	
	// Fetch Members
	memberService := &CardMemberService{DB: s.DB}
	members, err := memberService.GetMembersByCard(id)
	if err == nil {
		c.Members = members
	}

	return &c, nil
}

func (s *CardService) GetCardsByList(listID int) ([]Card, error) {
	rows, err := s.DB.Query("SELECT id, list_id, title, COALESCE(description,''), badge, color, position, due_date FROM cards WHERE list_id=$1 ORDER BY position, id", listID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Card
	memberService := &CardMemberService{DB: s.DB}

	for rows.Next() {
		var c Card
		var dueDate sql.NullTime
		if err := rows.Scan(&c.ID, &c.ListID, &c.Title, &c.Description, &c.Badge, &c.Color, &c.Position, &dueDate); err != nil {
			return nil, err
		}
		if dueDate.Valid {
			c.DueDate = &dueDate.Time
		}
		
		// Ideally we would do a join or batch fetch, but for now individual fetch is fine for MVP
		members, err := memberService.GetMembersByCard(c.ID)
		if err == nil {
			c.Members = members
		}
		
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *CardService) UpdateCard(id int, title, description, badge, color string, listID int, position int, dueDate *time.Time) (*Card, error) {
	_, err := s.DB.Exec(
		"UPDATE cards SET title=$1, description=$2, badge=$3, color=$4, list_id=$5, position=$6, due_date=$7 WHERE id=$8",
		title, description, badge, color, listID, position, dueDate, id,
	)
	if err != nil {
		return nil, err
	}
	return s.GetCardByID(id)
}
