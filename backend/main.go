package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"trellomirror/backend/handlers"
	"trellomirror/backend/middleware"
	"trellomirror/backend/models"
)

func main() {
	db, err := models.InitDB()
	if err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer db.Close()

	authHandler := handlers.NewAuthHandler(db)
	boardHandler := handlers.NewBoardHandler(db)

	r := mux.NewRouter()

	r.Use(middleware.CORS)

	r.HandleFunc("/api/register", authHandler.Register).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/login", authHandler.Login).Methods("POST", "OPTIONS")

	protected := r.PathPrefix("/api").Subrouter()
	protected.Use(middleware.AuthMiddleware)
	protected.HandleFunc("/me", authHandler.GetMe).Methods("GET")
	protected.HandleFunc("/boards", boardHandler.ListBoards).Methods("GET")
	protected.HandleFunc("/boards", boardHandler.CreateBoard).Methods("POST")
	protected.HandleFunc("/boards/{id}", boardHandler.GetBoard).Methods("GET")
	protected.HandleFunc("/boards/{id}/members", boardHandler.GetBoardMembers).Methods("GET")
	protected.HandleFunc("/boards/{id}/members", boardHandler.InviteMember).Methods("POST")
	protected.HandleFunc("/boards/{id}/members/{userId}", boardHandler.RemoveMember).Methods("DELETE")
	protected.HandleFunc("/users/search", boardHandler.SearchUsers).Methods("GET")
	protected.HandleFunc("/lists/{id}/cards", boardHandler.CreateCard).Methods("POST")
	protected.HandleFunc("/cards/{id}", boardHandler.GetCard).Methods("GET")
	protected.HandleFunc("/cards/{id}", boardHandler.UpdateCard).Methods("PATCH", "PUT")
	protected.HandleFunc("/cards/{id}/tags", boardHandler.AddCardTag).Methods("POST")
	protected.HandleFunc("/cards/{id}/tags/{tagId}", boardHandler.RemoveCardTag).Methods("DELETE")
	protected.HandleFunc("/cards/{id}/comments", boardHandler.GetCardComments).Methods("GET")
	protected.HandleFunc("/cards/{id}/comments", boardHandler.AddCardComment).Methods("POST")

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
