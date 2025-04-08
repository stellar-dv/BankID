
package main

import (
	"encoding/json"
	"log"
	"net/http"
)

type BankIDRequest struct {
	PersonalNumber string `json:"personalNumber,omitempty"`
	OrderRef      string `json:"orderRef,omitempty"`
	SessionID     string `json:"sessionId"`
	AuthMethod    string `json:"authMethod"`
}

type APIResponse struct {
	Success   bool        `json:"success"`
	Message   string      `json:"message"`
	OrderRef  string      `json:"orderRef,omitempty"`
	Status    string      `json:"status,omitempty"`
	QRCode    string      `json:"qrCode,omitempty"`
	SessionID string      `json:"sessionId,omitempty"`
	Data      interface{} `json:"data,omitempty"`
}

func main() {
	router := http.NewServeMux()

	// BankID API endpoints
	router.HandleFunc("/api/bankid/auth", handleBankIDAuth)
	router.HandleFunc("/api/bankid/collect", handleBankIDCollect)
	router.HandleFunc("/api/bankid/cancel", handleBankIDCancel)
	router.HandleFunc("/api/bankid/qrcode", handleQRCode)
	router.HandleFunc("/api/bankid/sign", handleBankIDSign)
	router.HandleFunc("/api/bankid/init", handleBankIDInit)
	router.HandleFunc("/api/bankid/status/", handleBankIDStatus)

	log.Println("Starting API server on port 5000...")
	if err := http.ListenAndServe("0.0.0.0:5000", router); err != nil {
		log.Fatal(err)
	}
}

func handleBankIDAuth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req BankIDRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	response := APIResponse{
		Success:   true,
		Message:   "Auth initiated",
		OrderRef:  "mock-order-ref",
		SessionID: req.SessionID,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleBankIDCollect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	response := APIResponse{
		Success: true,
		Message: "Collection completed",
		Status:  "complete",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleBankIDCancel(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	response := APIResponse{
		Success: true,
		Message: "Session cancelled",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleQRCode(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	response := APIResponse{
		Success: true,
		Message: "QR code generated",
		QRCode:  "mock-qr-code-data",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleBankIDSign(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	response := APIResponse{
		Success:  true,
		Message:  "Sign initiated",
		OrderRef: "mock-sign-order-ref",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleBankIDInit(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req BankIDRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	response := APIResponse{
		Success:   true,
		Message:   "BankID session initiated",
		SessionID: "mock-session-id",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleBankIDStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	response := APIResponse{
		Success: true,
		Message: "Status checked",
		Status:  "pending",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
