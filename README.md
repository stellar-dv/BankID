# BankID API Server

This is a simple API server that allows you to integrate with the Swedish BankID system for identity verification and electronic signing.

## API Endpoints

### Authentication

```
POST /api/bankid/auth
```

**Request Body:**
```json
{
  "personalNumber": "YYYYMMDD-XXXX",  // Swedish personal identity number
  "endUserIp": "123.123.123.123"      // Optional, will use requestor IP if not provided
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
  "personalNumber": "YYYYMMDD-XXXX",  // Swedish personal identity number
  "userVisibleData": "Text to sign",   // Optional, will use default if not provided
  "endUserIp": "123.123.123.123"      // Optional, will use requestor IP if not provided
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
      "personalNumber": "string",
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

## Example Usage

### Signing Example with cURL

Start a new signing request:

```sh
curl -X POST http://localhost:5000/api/bankid/sign \
  -H "Content-Type: application/json" \
  -d '{
    "personalNumber": "YYYYMMDD-XXXX",
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

## Notes

This API is intended to be used with the Swedish BankID test environment. If you want to use this in production, you will need to:

1. Obtain official BankID certificates
2. Update the API URL to the production URL
3. Ensure your application follows BankID security requirements

## Prerequisites

- Node.js
- Test BankID certificates
- BankID test environment access

The API uses the official BankID API and requires BankID certificates to function properly.
