import { Request, Response } from 'express';
import axios from 'axios';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { storage } from './storage';
import { 
  BankIDAuthRequest, 
  BankIDCollectRequest, 
  AUTH_METHODS 
} from '@shared/schema';

// BankID configuration
const BANKID_API_URL = process.env.BANKID_API_URL || 'https://appapi2.test.bankid.com/rp/v6.0';

// Read BankID certificate files
const CERT_PATH = process.env.BANKID_CERT || path.resolve('./attached_assets/FPTestcert5_20240610.pem');
// The PEM file contains both certificate and private key (encrypted)
const PEM_CONTENTS = fs.readFileSync(CERT_PATH, 'utf8');

// For demo purposes, we're using a test certificate without a password
// In a real environment, you'd need proper certificate management
// Extract certificate and private key from PEM file
const certMatches = PEM_CONTENTS.match(/-----BEGIN CERTIFICATE-----([\s\S]*?)-----END CERTIFICATE-----/);
const keyMatches = PEM_CONTENTS.match(/-----BEGIN ENCRYPTED PRIVATE KEY-----([\s\S]*?)-----END ENCRYPTED PRIVATE KEY-----/);

// Create certificate and key strings with proper headers and footers
const certString = certMatches ? `-----BEGIN CERTIFICATE-----${certMatches[1]}-----END CERTIFICATE-----` : '';
const keyString = keyMatches ? `-----BEGIN ENCRYPTED PRIVATE KEY-----${keyMatches[1]}-----END ENCRYPTED PRIVATE KEY-----` : '';

console.log("Certificate and key loaded from PEM file");

// Create a custom HTTPS agent with the BankID certificates
const agent = new https.Agent({
  cert: certString,
  key: {
    key: keyString,
    passphrase: ''  // The test certificate doesn't have a passphrase
  },
  rejectUnauthorized: false, // For demo purposes only - in production, set to true
});

// Create axios instance for BankID API
const bankidApi = axios.create({
  baseURL: BANKID_API_URL,
  httpsAgent: agent,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper function to get client IP
function getClientIp(req: Request): string {
  // In a real production environment, you would need to handle this more carefully
  return req.ip || req.connection.remoteAddress || '127.0.0.1';
}

// BANKID AUTH endpoint
export async function handleBankidAuth(req: Request, res: Response) {
  try {
    // Get personal number from request body (optional)
    const { personalNumber } = req.body;

    // Create session in our database
    const sessionId = uuidv4();
    const endUserIp = getClientIp(req);

    // Prepare request to BankID API
    const authRequest: BankIDAuthRequest = {
      personalNumber,
      endUserIp,
      requirement: {
        allowFingerprint: true,
      }
    };

    // Make request to BankID
    const response = await bankidApi.post('/auth', authRequest);
    
    // Store the session with BankID information
    await storage.createBankidSession({
      status: 'pending',
      authMethod: AUTH_METHODS.THIS_DEVICE, // Default to THIS_DEVICE method
      personalNumber: personalNumber || '',
      orderRef: response.data.orderRef,
      autoStartToken: response.data.autoStartToken,
      qrStartToken: response.data.qrStartToken,
      qrStartSecret: response.data.qrStartSecret,
    });

    // Return successful response to client
    return res.json({
      success: true,
      sessionId,
      orderRef: response.data.orderRef,
      autoStartToken: response.data.autoStartToken,
      qrStartToken: response.data.qrStartToken,
      qrStartSecret: response.data.qrStartSecret,
    });
  } catch (error: any) {
    console.error('BankID Auth Error:', error.response?.data || error.message);
    
    // Return error response to client
    return res.status(error.response?.status || 500).json({
      success: false,
      message: error.response?.data?.details || 'Failed to authenticate with BankID',
    });
  }
}

// BANKID COLLECT endpoint
export async function handleBankidCollect(req: Request, res: Response) {
  try {
    const { orderRef } = req.body;

    if (!orderRef) {
      return res.status(400).json({
        success: false,
        message: 'orderRef is required',
      });
    }

    // Make request to BankID to collect status
    const collectRequest: BankIDCollectRequest = {
      orderRef,
    };

    const response = await bankidApi.post('/collect', collectRequest);
    
    // Get the session from our database
    const session = await storage.getBankidSession(orderRef);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Update session status based on BankID response
    if (response.data.status === 'complete') {
      await storage.completeBankidSession(orderRef);
    } else {
      await storage.updateBankidSessionStatus(orderRef, response.data.status);
    }

    // Return the collect response to client
    return res.json({
      success: true,
      ...response.data,
    });
  } catch (error: any) {
    console.error('BankID Collect Error:', error.response?.data || error.message);
    
    // Return error response to client
    return res.status(error.response?.status || 500).json({
      success: false,
      message: error.response?.data?.details || 'Failed to collect BankID status',
    });
  }
}

// BANKID CANCEL endpoint
export async function handleBankidCancel(req: Request, res: Response) {
  try {
    const { orderRef } = req.body;

    if (!orderRef) {
      return res.status(400).json({
        success: false,
        message: 'orderRef is required',
      });
    }

    // Make request to BankID to cancel the order
    await bankidApi.post('/cancel', { orderRef });
    
    // Update our session
    await storage.updateBankidSessionStatus(orderRef, 'failed');

    // Return successful response to client
    return res.json({
      success: true,
      message: 'BankID authentication cancelled',
    });
  } catch (error: any) {
    console.error('BankID Cancel Error:', error.response?.data || error.message);
    
    // Return error response to client
    return res.status(error.response?.status || 500).json({
      success: false,
      message: error.response?.data?.details || 'Failed to cancel BankID authentication',
    });
  }
}

// Generate a dynamic QR code based on time and session data
export async function handleQrCode(req: Request, res: Response) {
  try {
    const { orderRef, qrStartToken, qrStartSecret } = req.body;

    if (!orderRef || !qrStartToken || !qrStartSecret) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters',
      });
    }

    // Calculate the QR code based on BankID algorithm
    // This implements the QR code algorithm from BankID documentation
    const time = Math.floor(Date.now() / 1000);
    const qrAuthCode = calculateAuthCode(qrStartToken, qrStartSecret, time);
    
    // Return the QR auth code to the client
    return res.json({
      success: true,
      qrAuthCode,
    });
  } catch (error: any) {
    console.error('QR Code Error:', error.message);
    
    // Return error response to client
    return res.status(500).json({
      success: false,
      message: 'Failed to generate QR code',
    });
  }
}

// Helper function to calculate QR auth code based on BankID specification
function calculateAuthCode(qrStartToken: string, qrStartSecret: string, time: number) {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', qrStartSecret);
  hmac.update(qrStartToken + time.toString());
  const hash = hmac.digest('hex');
  
  return qrStartToken + time.toString() + hash;
}