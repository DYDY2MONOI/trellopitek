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
	Boards       *models.BoardService
	Lists        *models.ListService
	Cards        *models.CardService
	BoardMembers *models.BoardMemberService
	Users        *models.UserService
	CardTags     *models.CardTagService
	CardComments *models.CardCommentService
}

func NewBoardHandler(db *sql.DB) *BoardHandler {
	return &BoardHandler{
		Boards:       &models.BoardService{DB: db},
		Lists:        &models.ListService{DB: db},
		Cards:        &models.CardService{DB: db},
		BoardMembers: &models.BoardMemberService{DB: db},
		Users:        &models.UserService{DB: db},
		CardTags:     &models.CardTagService{DB: db},
		CardComments: &models.CardCommentService{DB: db},
	}
}

func (h *BoardHandler) ListBoards(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("userID").(int)

	// Get boards owned by user AND boards shared with user
	rows, err := h.Boards.DB.Query(
		`SELECT DISTINCT b.id, b.user_id, b.title, b.created_at
		 FROM boards b
		 LEFT JOIN board_members bm ON bm.board_id = b.id
		 WHERE b.user_id = $1 OR bm.user_id = $1
		 ORDER BY b.created_at DESC`,
		userID,
	)
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
	if out == nil {
		out = []models.Board{}
	}
	json.NewEncoder(w).Encode(out)
}

type cardWithTags struct {
	models.Card `json:",inline"`
	Tags        []models.CardTag `json:"tags"`
}

type boardDetail struct {
	models.Board `json:",inline"`
	Lists        []struct {
		models.List `json:",inline"`
		Cards       []cardWithTags `json:"cards"`
	} `json:"lists"`
}

func (h *BoardHandler) GetBoard(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	id, _ := strconv.Atoi(vars["id"])
	userID := r.Context().Value("userID").(int)

	b, err := h.Boards.GetBoardByID(id)
	if err != nil {
		http.Error(w, "board not found", http.StatusNotFound)
		return
	}

	// Check access: owner or member
	if b.UserID != userID {
		isMember, err := h.BoardMembers.IsMember(id, userID)
		if err != nil || !isMember {
			http.Error(w, "access denied", http.StatusForbidden)
			return
		}
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
		var cardsWithTags []cardWithTags
		for i := range cards {
			cards[i].Color = normalizeCardColor(cards[i].Color, l)
			tags, _ := h.CardTags.GetTagsByCard(cards[i].ID)
			if tags == nil {
				tags = []models.CardTag{}
			}
			cardsWithTags = append(cardsWithTags, cardWithTags{Card: cards[i], Tags: tags})
		}
		if cardsWithTags == nil {
			cardsWithTags = []cardWithTags{}
		}
		item := struct {
			models.List `json:",inline"`
			Cards       []cardWithTags `json:"cards"`
		}{List: l, Cards: cardsWithTags}
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

	// Add creator as owner in board_members
	_, _ = h.BoardMembers.AddMember(b.ID, userID, "owner")

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

func (h *BoardHandler) GetCard(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil || id <= 0 {
		http.Error(w, "invalid card id", http.StatusBadRequest)
		return
	}

	card, err := h.Cards.GetCardByID(id)
	if err != nil {
		http.Error(w, "card not found", http.StatusNotFound)
		return
	}

	tags, _ := h.CardTags.GetTagsByCard(id)
	if tags == nil {
		tags = []models.CardTag{}
	}

	comments, _ := h.CardComments.GetCommentsByCard(id)
	if comments == nil {
		comments = []models.CardComment{}
	}

	resp := struct {
		*models.Card `json:",inline"`
		Tags         []models.CardTag     `json:"tags"`
		Comments     []models.CardComment `json:"comments"`
	}{Card: card, Tags: tags, Comments: comments}

	json.NewEncoder(w).Encode(resp)
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
		Title       *string `json:"title"`
		Description *string `json:"description"`
		Badge       *string `json:"badge"`
		Color       *string `json:"color"`
		ListID      *int    `json:"listId"`
		Position    *int    `json:"position"`
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

	newDescription := existing.Description
	if body.Description != nil {
		newDescription = *body.Description
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

	updated, err := h.Cards.UpdateCard(id, newTitle, newDescription, newBadge, newColor, newListID, newPosition)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(updated)
}

// ============ Card Tags Endpoints ============

func (h *BoardHandler) AddCardTag(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	cardID, err := strconv.Atoi(vars["id"])
	if err != nil || cardID <= 0 {
		http.Error(w, "invalid card id", http.StatusBadRequest)
		return
	}

	// Verify card exists
	if _, err := h.Cards.GetCardByID(cardID); err != nil {
		http.Error(w, "card not found", http.StatusNotFound)
		return
	}

	var body struct {
		Name  string `json:"name"`
		Color string `json:"color"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || strings.TrimSpace(body.Name) == "" {
		http.Error(w, "name is required", http.StatusBadRequest)
		return
	}
	if body.Color == "" {
		body.Color = "primary"
	}

	tag, err := h.CardTags.AddTag(cardID, strings.TrimSpace(body.Name), body.Color)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(tag)
}

func (h *BoardHandler) RemoveCardTag(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	tagID, err := strconv.Atoi(vars["tagId"])
	if err != nil || tagID <= 0 {
		http.Error(w, "invalid tag id", http.StatusBadRequest)
		return
	}

	err = h.CardTags.RemoveTag(tagID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"message": "Tag removed"})
}

// ============ Card Comments Endpoints ============

func (h *BoardHandler) GetCardComments(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	cardID, err := strconv.Atoi(vars["id"])
	if err != nil || cardID <= 0 {
		http.Error(w, "invalid card id", http.StatusBadRequest)
		return
	}

	comments, err := h.CardComments.GetCommentsByCard(cardID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if comments == nil {
		comments = []models.CardComment{}
	}
	json.NewEncoder(w).Encode(comments)
}

func (h *BoardHandler) AddCardComment(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	cardID, err := strconv.Atoi(vars["id"])
	if err != nil || cardID <= 0 {
		http.Error(w, "invalid card id", http.StatusBadRequest)
		return
	}
	userID := r.Context().Value("userID").(int)

	// Verify card exists
	if _, err := h.Cards.GetCardByID(cardID); err != nil {
		http.Error(w, "card not found", http.StatusNotFound)
		return
	}

	var body struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || strings.TrimSpace(body.Content) == "" {
		http.Error(w, "content is required", http.StatusBadRequest)
		return
	}

	comment, err := h.CardComments.AddComment(cardID, userID, strings.TrimSpace(body.Content))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(comment)
}

// ============ Collaboration Endpoints ============

func (h *BoardHandler) GetBoardMembers(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	boardID, err := strconv.Atoi(vars["id"])
	if err != nil || boardID <= 0 {
		http.Error(w, "invalid board id", http.StatusBadRequest)
		return
	}

	userID := r.Context().Value("userID").(int)

	// Verify the user has access to this board
	board, err := h.Boards.GetBoardByID(boardID)
	if err != nil {
		http.Error(w, "board not found", http.StatusNotFound)
		return
	}
	if board.UserID != userID {
		isMember, err := h.BoardMembers.IsMember(boardID, userID)
		if err != nil || !isMember {
			http.Error(w, "access denied", http.StatusForbidden)
			return
		}
	}

	members, err := h.BoardMembers.GetMembersByBoard(boardID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if members == nil {
		members = []models.BoardMember{}
	}
	json.NewEncoder(w).Encode(members)
}

func (h *BoardHandler) InviteMember(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	boardID, err := strconv.Atoi(vars["id"])
	if err != nil || boardID <= 0 {
		http.Error(w, "invalid board id", http.StatusBadRequest)
		return
	}

	userID := r.Context().Value("userID").(int)

	// Only the board owner can invite members
	board, err := h.Boards.GetBoardByID(boardID)
	if err != nil {
		http.Error(w, "board not found", http.StatusNotFound)
		return
	}
	if board.UserID != userID {
		http.Error(w, "only the board owner can invite members", http.StatusForbidden)
		return
	}

	var body struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Email == "" {
		http.Error(w, "email is required", http.StatusBadRequest)
		return
	}

	// Find the user by email
	invitedUser, _, err := h.Users.GetUserByEmail(body.Email)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "User not found with this email"})
		return
	}

	// Can't invite yourself
	if invitedUser.ID == userID {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "You cannot invite yourself"})
		return
	}

	// Check if already a member
	isMember, _ := h.BoardMembers.IsMember(boardID, invitedUser.ID)
	if isMember {
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]string{"error": "User is already a member of this board"})
		return
	}

	member, err := h.BoardMembers.AddMember(boardID, invitedUser.ID, "member")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(member)
}

func (h *BoardHandler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	boardID, err := strconv.Atoi(vars["id"])
	if err != nil || boardID <= 0 {
		http.Error(w, "invalid board id", http.StatusBadRequest)
		return
	}
	memberUserID, err := strconv.Atoi(vars["userId"])
	if err != nil || memberUserID <= 0 {
		http.Error(w, "invalid user id", http.StatusBadRequest)
		return
	}

	userID := r.Context().Value("userID").(int)

	// Only the board owner can remove members
	board, err := h.Boards.GetBoardByID(boardID)
	if err != nil {
		http.Error(w, "board not found", http.StatusNotFound)
		return
	}
	if board.UserID != userID {
		http.Error(w, "only the board owner can remove members", http.StatusForbidden)
		return
	}

	// Can't remove the owner
	if memberUserID == userID {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Cannot remove the board owner"})
		return
	}

	err = h.BoardMembers.RemoveMember(boardID, memberUserID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Member removed successfully"})
}

func (h *BoardHandler) SearchUsers(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("userID").(int)

	query := strings.TrimSpace(r.URL.Query().Get("q"))
	if query == "" || len(query) < 2 {
		json.NewEncoder(w).Encode([]models.User{})
		return
	}

	users, err := h.Users.SearchUsersByEmail(query, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if users == nil {
		users = []models.User{}
	}
	json.NewEncoder(w).Encode(users)
}
