# BankID API Server

This is a fully-featured API server that allows you to integrate with the Swedish BankID system for identity verification and electronic signing. The server supports both direct API calls and webhook-based callback operations for integration with external systems.

## API Endpoints

The API provides two main methods of operation:
1. **Direct API** - Traditional REST endpoints for synchronous operations
2. **Webhook API** - Asynchronous operations with callback notifications to your system

## Direct API Endpoints

### Authentication

```
POST /api/bankid/auth
```

**Request Body:**
```json
{
  "personNummer": "YYYYMMDD-XXXX",  // Swedish personal identity number
  "endUserIp": "123.123.123.123",     // Optional, will use requestor IP if not provided
  "callbackUrl": "https://your-server.com/callback" // Optional callback URL
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "uuid",
  "orderRef": "string",
  "autoStartToken": "string",
  "qrStartToken": "string",
  "qrStartSecret": "string"
}
```

### Signing

```
POST /api/bankid/sign
```

**Request Body:**
```json
{
  "personNummer": "YYYYMMDD-XXXX",  // Swedish personal identity number
  "userVisibleData": "Text to sign",   // Optional, will use default if not provided
  "endUserIp": "123.123.123.123",     // Optional, will use requestor IP if not provided
  "callbackUrl": "https://your-server.com/callback" // Optional callback URL
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "uuid",
  "orderRef": "string",
  "autoStartToken": "string",
  "qrStartToken": "string",
  "qrStartSecret": "string"
}
```

### Collect Status

```
POST /api/bankid/collect
```

**Request Body:**
```json
{
  "orderRef": "string"  // The orderRef received from auth or sign
}
```

**Response:**
```json
{
  "success": true,
  "orderRef": "string",
  "status": "pending|failed|complete",
  "hintCode": "string",  // Optional, provides hints about the current state
  "completionData": {   // Only present when status is "complete"
    "user": {
      "personNummer": "string",
      "name": "string",
      "givenName": "string",
      "surname": "string"
    },
    "device": {
      "ipAddress": "string"
    },
    "cert": {
      "notBefore": "string",
      "notAfter": "string"
    },
    "signature": "string",
    "ocspResponse": "string"
  }
}
```

### Cancel

```
POST /api/bankid/cancel
```

**Request Body:**
```json
{
  "orderRef": "string"  // The orderRef received from auth or sign
}
```

**Response:**
```json
{
  "success": true,
  "message": "BankID authentication cancelled"
}
```

### QR Code

```
POST /api/bankid/qrcode
```

**Request Body:**
```json
{
  "orderRef": "string",
  "qrStartToken": "string",
  "qrStartSecret": "string"
}
```

**Response:**
```json
{
  "success": true,
  "qrAuthCode": "string"  // The QR code data to be displayed
}
```

## Webhook API Endpoints

### Authentication Webhook

```
POST /api/webhook/bankid/auth
```

**Request Body:**
```json
{
  "personNummer": "YYYYMMDD-XXXX",  // Swedish personal identity number
  "callbackUrl": "https://your-server.com/callback" // Required: URL to receive status updates
}
```

**Response:**
```json
{
  "success": true,
  "webhookId": "uuid",
  "orderRef": "string",
  "autoStartToken": "string",
  "qrStartToken": "string",
  "qrStartSecret": "string"
}
```

### Signing Webhook

```
POST /api/webhook/bankid/sign
```

**Request Body:**
```json
{
  "personNummer": "YYYYMMDD-XXXX",  // Swedish personal identity number
  "userVisibleData": "Text to sign",   // Optional, will use default if not provided
  "callbackUrl": "https://your-server.com/callback" // Required: URL to receive status updates
}
```

**Response:**
```json
{
  "success": true,
  "webhookId": "uuid",
  "orderRef": "string",
  "autoStartToken": "string",
  "qrStartToken": "string",
  "qrStartSecret": "string"
}
```

### Callback Format

When a BankID operation completes, fails, or is cancelled, a callback will be sent to the provided `callbackUrl` with the following format:

**Successful completion:**
```json
{
  "status": "complete",
  "orderRef": "string",
  "operation": "bankid",
  "completionData": {
    "user": {
      "personNummer": "string",
      "name": "string",
      "givenName": "string",
      "surname": "string"
    },
    "device": {
      "ipAddress": "string"
    },
    "cert": {
      "notBefore": "string",
      "notAfter": "string"
    },
    "signature": "string",
    "ocspResponse": "string"
  },
  "timestamp": "2024-04-06T12:34:56.789Z"
}
```

**Failed operation:**
```json
{
  "status": "failed",
  "orderRef": "string",
  "operation": "bankid",
  "hintCode": "string",
  "timestamp": "2024-04-06T12:34:56.789Z"
}
```

**Cancelled operation:**
```json
{
  "status": "cancelled",
  "orderRef": "string",
  "operation": "bankid",
  "timestamp": "2024-04-06T12:34:56.789Z"
}
```

## Example Usage

### Direct API Example with cURL

Start a new signing request:

```sh
curl -X POST http://localhost:5000/api/bankid/sign \
  -H "Content-Type: application/json" \
  -d '{
    "personNummer": "YYYYMMDD-XXXX",
    "userVisibleData": "This is a test signing request"
  }'
```

Check the status of the signing request:

```sh
curl -X POST http://localhost:5000/api/bankid/collect \
  -H "Content-Type: application/json" \
  -d '{
    "orderRef": "YOUR_ORDER_REF"
  }'
```

### Webhook API Example with cURL

Start a new signing request with a callback:

```sh
curl -X POST http://localhost:5000/api/webhook/bankid/sign \
  -H "Content-Type: application/json" \
  -d '{
    "personNummer": "YYYYMMDD-XXXX",
    "userVisibleData": "This is a test signing request",
    "callbackUrl": "https://your-server.com/bankid-callback"
  }'
```

The system will automatically send a callback to the provided URL when the signing process completes, fails, or is cancelled.

## Environment Variables

The following environment variables can be used to configure the BankID API server:

| Variable | Description | Default |
|----------|-------------|---------|
| BANKID_API_URL | The BankID API URL | https://appapi2.test.bankid.com/rp/v6.0 |
| BANKID_CERT_PASSWORD | Password for the BankID certificate | (Required for production) |
| BANKID_CERT | Base64-encoded BankID certificate (.pem format) | (Uses included test cert if not provided) |
| BANKID_KEY | Base64-encoded private key (.pem format) | (Uses included test cert if not provided) |
| BANKID_CA | Base64-encoded CA certificate (.pem format) | (Uses included test cert if not provided) |

## Notes

This API is intended to be used with the Swedish BankID test environment. If you want to use this in production, you will need to:

1. Obtain official BankID certificates
2. Set the required environment variables with production certificates
3. Ensure your application follows BankID security requirements

## Prerequisites

- Node.js
- BankID certificates (test or production)
