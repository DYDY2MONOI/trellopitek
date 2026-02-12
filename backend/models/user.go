package models

import (
	"database/sql"
	"time"
)

type User struct {
	ID        int       `json:"id"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
}

type UserService struct {
	DB *sql.DB
}

func (us *UserService) CreateUser(email, passwordHash string) (*User, error) {
	var id int
	err := us.DB.QueryRow(
		"INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
		email, passwordHash,
	).Scan(&id)
	if err != nil {
		return nil, err
	}

	return us.GetUserByID(id)
}

func (us *UserService) GetUserByEmail(email string) (*User, string, error) {
	var user User
	var passwordHash string
	err := us.DB.QueryRow(
		"SELECT id, email, password_hash, created_at FROM users WHERE email = $1",
		email,
	).Scan(&user.ID, &user.Email, &passwordHash, &user.CreatedAt)

	if err != nil {
		return nil, "", err
	}

	return &user, passwordHash, nil
}

func (us *UserService) GetUserByID(id int) (*User, error) {
	var user User
	err := us.DB.QueryRow(
		"SELECT id, email, created_at FROM users WHERE id = $1",
		id,
	).Scan(&user.ID, &user.Email, &user.CreatedAt)

	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (us *UserService) SearchUsersByEmail(query string, excludeUserID int) ([]User, error) {
	rows, err := us.DB.Query(
		"SELECT id, email, created_at FROM users WHERE email ILIKE $1 AND id != $2 ORDER BY email LIMIT 10",
		"%"+query+"%", excludeUserID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Email, &u.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}
