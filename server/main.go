
package main

import (
	"encoding/json"
	"log"
	"net/http"
)

type APIResponse struct {
	Success  bool   `json:"success"`
	Message  string `json:"message"`
	OrderRef string `json:"orderRef,omitempty"`
}

func handleBankIDAuth(w http.ResponseWriter, r *http.Request) {
	response := APIResponse{
		Success:  true,
		Message:  "Auth initiated",
		OrderRef: "mock-auth-order-ref",
	}
	json.NewEncoder(w).Encode(response)
}

func handleBankIDSign(w http.ResponseWriter, r *http.Request) {
	response := APIResponse{
		Success:  true,
		Message:  "Sign initiated",
		OrderRef: "mock-sign-order-ref",
	}
	json.NewEncoder(w).Encode(response)
}

func handleBankIDCancel(w http.ResponseWriter, r *http.Request) {
	response := APIResponse{
		Success: true,
		Message: "Operation cancelled",
	}
	json.NewEncoder(w).Encode(response)
}

func handleQRCode(w http.ResponseWriter, r *http.Request) {
	response := APIResponse{
		Success: true,
		Message: "QR code generated",
	}
	json.NewEncoder(w).Encode(response)
}

func handleBankIDStatus(w http.ResponseWriter, r *http.Request) {
	response := APIResponse{
		Success: true,
		Message: "Pending",
	}
	json.NewEncoder(w).Encode(response)
}

func setupRoutes() http.ServeMux {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/bankid/auth", handleBankIDAuth)
	mux.HandleFunc("/api/bankid/sign", handleBankIDSign)
	mux.HandleFunc("/api/bankid/cancel", handleBankIDCancel)
	mux.HandleFunc("/api/bankid/qrcode", handleQRCode)
	mux.HandleFunc("/api/bankid/status/", handleBankIDStatus)

	return *mux
}

func main() {
	log.Println("Starting BankID API server on port 5000")
	
	mux := setupRoutes()
	
	if err := http.ListenAndServe("0.0.0.0:5000", &mux); err != nil {
		log.Fatal("Server error:", err)
	}
}
