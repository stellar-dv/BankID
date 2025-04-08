
package main

import (
	"encoding/json"
	"log"
	"net/http"
)

type BankIDSession struct {
	SessionID      string `json:"sessionId"`
	PersonalNumber string `json:"personalNumber,omitempty"`
	AuthMethod     string `json:"authMethod"`
	Status         string `json:"status"`
}

type APIResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

func main() {
	http.HandleFunc("/api/bankid/init", handleBankIDInit)
	http.HandleFunc("/api/bankid/status/", handleBankIDStatus)
	http.HandleFunc("/api/bankid/auth", handleBankIDAuth)
	http.HandleFunc("/api/bankid/collect", handleBankIDCollect)
	http.HandleFunc("/api/bankid/cancel", handleBankIDCancel)
	http.HandleFunc("/api/bankid/qrcode", handleQRCode)
	http.HandleFunc("/api/bankid/sign", handleBankIDSign)
	
	// Serve static files
	fs := http.FileServer(http.Dir("client/dist"))
	http.Handle("/", fs)

	log.Println("Server starting on port 5000...")
	if err := http.ListenAndServe("0.0.0.0:5000", nil); err != nil {
		log.Fatal(err)
	}
}

func handleBankIDInit(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var session BankIDSession
	if err := json.NewDecoder(r.Body).Decode(&session); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// For demo, just return success
	response := APIResponse{
		Success: true,
		Message: "BankID session initiated",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleBankIDStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Demo response
	response := APIResponse{
		Success: true,
		Message: "Status checked",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleBankIDAuth(w http.ResponseWriter, r *http.Request) {
	response := APIResponse{
		Success: true,
		Message: "Auth initiated",
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleBankIDCollect(w http.ResponseWriter, r *http.Request) {
	response := APIResponse{
		Success: true,
		Message: "Collection completed",
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleBankIDCancel(w http.ResponseWriter, r *http.Request) {
	response := APIResponse{
		Success: true,
		Message: "Session cancelled",
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleQRCode(w http.ResponseWriter, r *http.Request) {
	response := APIResponse{
		Success: true,
		Message: "QR code generated",
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleBankIDSign(w http.ResponseWriter, r *http.Request) {
	response := APIResponse{
		Success: true,
		Message: "Sign initiated",
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
