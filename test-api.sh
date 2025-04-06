#!/bin/bash

# BankID API Test Script
# This script demonstrates how to use the BankID API endpoints

# API base URLs
DIRECT_URL="http://localhost:5000/api/bankid"
WEBHOOK_URL="http://localhost:5000/api/webhook/bankid"

# Test personal number - Use a valid format for the BankID test environment
# For the BankID test environment, you can use any of the test personal numbers
# documented in the BankID documentation
TEST_PERSONAL_NUMBER="190000000000"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}BankID API Test Script${NC}"
echo "======================================="
echo ""

# Function to make API requests and display results
function call_api {
    local endpoint=$1
    local data=$2
    local description=$3
    
    echo -e "${YELLOW}$description${NC}"
    echo "Endpoint: $endpoint"
    echo "Request data: $data"
    echo "--------------------------------------"
    
    response=$(curl -s -X POST "$BASE_URL/$endpoint" \
        -H "Content-Type: application/json" \
        -d "$data")
    
    echo "Response:"
    echo "$response" | jq '.'
    echo ""
    
    # Extract orderRef for further operations
    if [[ $endpoint == "sign" || $endpoint == "auth" ]]; then
        ORDER_REF=$(echo "$response" | jq -r '.orderRef')
        if [[ $ORDER_REF != "null" && $ORDER_REF != "" ]]; then
            echo -e "${GREEN}Order reference: $ORDER_REF${NC}"
        else
            echo -e "${RED}Failed to get orderRef${NC}"
        fi
    fi
}

# Check for jq
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is required for this script to work properly.${NC}"
    echo "Please install jq with your package manager:"
    echo "  apt-get install jq (Debian/Ubuntu)"
    echo "  brew install jq (macOS)"
    echo "  chocolatey install jq (Windows)"
    exit 1
fi

# 1. Initiate a signing request
echo "=== Step 1: Initiating a BankID signing request ==="
call_api "sign" "{\"personalNumber\": \"$TEST_PERSONAL_NUMBER\", \"userVisibleData\": \"This is a test signing request\"}" "Initiating a BankID signing request"

if [[ -z $ORDER_REF || $ORDER_REF == "null" ]]; then
    echo -e "${RED}Failed to initiate signing request. Exiting.${NC}"
    exit 1
fi

# 2. Check the status (collect)
echo "=== Step 2: Checking the status of the signing request ==="
call_api "collect" "{\"orderRef\": \"$ORDER_REF\"}" "Checking signing status"

echo "Note: The signing request will remain pending until you approve it in the BankID app."
echo "In a real application, you would poll the collect endpoint until the status is 'complete' or 'failed'."

# 3. Cancel the request
echo "=== Step 3: Canceling the signing request ==="
call_api "cancel" "{\"orderRef\": \"$ORDER_REF\"}" "Canceling signing request"

echo -e "${GREEN}Test completed${NC}"
echo "See README.md for full API documentation."