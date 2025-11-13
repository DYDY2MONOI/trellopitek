package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
	"trellomirror/backend/models"
)

type BoardHandler struct {
	Boards *models.BoardService
	Lists  *models.ListService
	Cards  *models.CardService
}

func NewBoardHandler(db *sql.DB) *BoardHandler {
	return &BoardHandler{
		Boards: &models.BoardService{DB: db},
		Lists:  &models.ListService{DB: db},
		Cards:  &models.CardService{DB: db},
	}
}

func (h *BoardHandler) ListBoards(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("userID").(int)
	rows, err := h.Boards.DB.Query("SELECT id, user_id, title, created_at FROM boards WHERE user_id=$1 ORDER BY created_at DESC", userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	var out []models.Board
	for rows.Next() {
		var b models.Board
		if err := rows.Scan(&b.ID, &b.UserID, &b.Title, &b.CreatedAt); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		out = append(out, b)
	}
	json.NewEncoder(w).Encode(out)
}

type boardDetail struct {
	models.Board `json:",inline"`
	Lists        []struct {
		models.List `json:",inline"`
		Cards       []models.Card `json:"cards"`
	} `json:"lists"`
}

func (h *BoardHandler) GetBoard(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	id, _ := strconv.Atoi(vars["id"])

	b, err := h.Boards.GetBoardByID(id)
	if err != nil {
		http.Error(w, "board not found", http.StatusNotFound)
		return
	}

	lists, err := h.Lists.GetListsByBoard(b.ID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	resp := boardDetail{Board: *b}
	for _, l := range lists {
		cards, err := h.Cards.GetCardsByList(l.ID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		for i := range cards {
			cards[i].Color = normalizeCardColor(cards[i].Color, l)
		}
		item := struct {
			models.List `json:",inline"`
			Cards       []models.Card `json:"cards"`
		}{List: l, Cards: cards}
		resp.Lists = append(resp.Lists, item)
	}
	json.NewEncoder(w).Encode(resp)
}

func normalizeCardColor(current string, list models.List) string {
	title := strings.TrimSpace(strings.ToLower(list.Title))
	switch title {
	case "in progress":
		return "primary" // #2563EB
	case "review":
		return "warning" // #EAB308
	case "ideas":
		return "accent" // #8B5CF6
	case "done":
		return "success" // #059669
	case "inbox":
		return "inbox" // #475569
	}

	accent := strings.TrimSpace(strings.ToLower(list.Accent))
	switch accent {
	case "primary", "warning", "accent", "success", "inbox":
		return accent
	}

	c := strings.TrimSpace(strings.ToLower(current))
	switch c {
	case "primary", "warning", "accent", "success", "inbox":
		return c
	case "inprogress", "progress":
		return "primary"
	case "idea", "ideas":
		return "accent"
	case "done", "complete", "completed":
		return "success"
	case "review":
		return "warning"
	}

	return "primary"
}

func (h *BoardHandler) CreateBoard(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("userID").(int)
	var body struct {
		Title string `json:"title"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Title == "" {
		body.Title = "My Board"
	}
	b, err := h.Boards.CreateBoard(userID, body.Title)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	defaults := []struct{ Title, Accent string }{
		{"Ideas", "accent"}, {"In Progress", "primary"}, {"Review", "warning"}, {"Done", "success"},
	}
	for i, d := range defaults {
		_, err := h.Lists.CreateList(b.ID, d.Title, d.Accent, i)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	json.NewEncoder(w).Encode(b)
}

func (h *BoardHandler) CreateCard(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	listID, err := strconv.Atoi(vars["id"])
	if err != nil || listID <= 0 {
		http.Error(w, "invalid list id", http.StatusBadRequest)
		return
	}

	l, err := h.Lists.GetListByID(listID)
	if err != nil {
		http.Error(w, "list not found", http.StatusNotFound)
		return
	}
	_ = l

	var body struct {
		Title string `json:"title"`
		Badge string `json:"badge"`
		Color string `json:"color"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Title == "" {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}

	existing, err := h.Cards.GetCardsByList(listID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	pos := len(existing)

	card, err := h.Cards.CreateCard(listID, body.Title, body.Badge, body.Color, pos)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(card)
}

func (h *BoardHandler) UpdateCard(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil || id <= 0 {
		http.Error(w, "invalid card id", http.StatusBadRequest)
		return
	}

	existing, err := h.Cards.GetCardByID(id)
	if err != nil {
		http.Error(w, "card not found", http.StatusNotFound)
		return
	}

	var body struct {
		Title    *string `json:"title"`
		Badge    *string `json:"badge"`
		Color    *string `json:"color"`
		ListID   *int    `json:"listId"`
		Position *int    `json:"position"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}

	newTitle := existing.Title
	if body.Title != nil {
		t := strings.TrimSpace(*body.Title)
		if t != "" {
			newTitle = t
		}
	}

	newBadge := existing.Badge
	if body.Badge != nil {
		newBadge = strings.TrimSpace(*body.Badge)
	}

	newColor := existing.Color
	if body.Color != nil && strings.TrimSpace(*body.Color) != "" {
		newColor = strings.TrimSpace(*body.Color)
	}

	newListID := existing.ListID
	if body.ListID != nil && *body.ListID > 0 {
		if _, err := h.Lists.GetListByID(*body.ListID); err != nil {
			http.Error(w, "list not found", http.StatusBadRequest)
			return
		}
		newListID = *body.ListID
	}

	newPosition := existing.Position
	if body.Position != nil && *body.Position >= 0 {
		newPosition = *body.Position
	}

	updated, err := h.Cards.UpdateCard(id, newTitle, newBadge, newColor, newListID, newPosition)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(updated)
}
