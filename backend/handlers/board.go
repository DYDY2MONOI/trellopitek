package handlers

import (
    "database/sql"
    "encoding/json"
    "net/http"
    "strconv"

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
    if err != nil { http.Error(w, err.Error(), http.StatusInternalServerError); return }
    defer rows.Close()
    var out []models.Board
    for rows.Next() {
        var b models.Board
        if err := rows.Scan(&b.ID, &b.UserID, &b.Title, &b.CreatedAt); err != nil { http.Error(w, err.Error(), http.StatusInternalServerError); return }
        out = append(out, b)
    }
    json.NewEncoder(w).Encode(out)
}

type boardDetail struct {
    models.Board `json:",inline"`
    Lists []struct {
        models.List `json:",inline"`
        Cards []models.Card `json:"cards"`
    } `json:"lists"`
}

func (h *BoardHandler) GetBoard(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    vars := mux.Vars(r)
    id, _ := strconv.Atoi(vars["id"])

    b, err := h.Boards.GetBoardByID(id)
    if err != nil { http.Error(w, "board not found", http.StatusNotFound); return }

    lists, err := h.Lists.GetListsByBoard(b.ID)
    if err != nil { http.Error(w, err.Error(), http.StatusInternalServerError); return }

    resp := boardDetail{Board: *b}
    for _, l := range lists {
        cards, err := h.Cards.GetCardsByList(l.ID)
        if err != nil { http.Error(w, err.Error(), http.StatusInternalServerError); return }
        item := struct {
            models.List `json:",inline"`
            Cards []models.Card `json:"cards"`
        }{List: l, Cards: cards}
        resp.Lists = append(resp.Lists, item)
    }
    json.NewEncoder(w).Encode(resp)
}

func (h *BoardHandler) CreateBoard(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    userID := r.Context().Value("userID").(int)
    var body struct{ Title string `json:"title"` }
    if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Title == "" {
        body.Title = "My Board"
    }
    b, err := h.Boards.CreateBoard(userID, body.Title)
    if err != nil { http.Error(w, err.Error(), http.StatusInternalServerError); return }

    defaults := []struct{ Title, Accent string }{
        {"Ideas", "accent"}, {"In Progress", "primary"}, {"Review", "warning"}, {"Done", "success"},
    }
    for i, d := range defaults {
        _, err := h.Lists.CreateList(b.ID, d.Title, d.Accent, i)
        if err != nil { http.Error(w, err.Error(), http.StatusInternalServerError); return }
    }

    json.NewEncoder(w).Encode(b)
}
