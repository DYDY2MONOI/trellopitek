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
	// Initialize database
	db, err := models.InitDB()
	if err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer db.Close()

	// Initialize handlers
    authHandler := handlers.NewAuthHandler(db)
    boardHandler := handlers.NewBoardHandler(db)

	// Setup router
	r := mux.NewRouter()

	// CORS middleware
	r.Use(middleware.CORS)

	// Public routes
	r.HandleFunc("/api/register", authHandler.Register).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/login", authHandler.Login).Methods("POST", "OPTIONS")

	// Protected routes
	protected := r.PathPrefix("/api").Subrouter()
	protected.Use(middleware.AuthMiddleware)
    protected.HandleFunc("/me", authHandler.GetMe).Methods("GET")
    protected.HandleFunc("/boards", boardHandler.ListBoards).Methods("GET")
    protected.HandleFunc("/boards", boardHandler.CreateBoard).Methods("POST")
    protected.HandleFunc("/boards/{id}", boardHandler.GetBoard).Methods("GET")

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
