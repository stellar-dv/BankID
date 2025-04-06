import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { storage } from './storage';
import { 
  BankIDAuthRequest, 
  BankIDCollectRequest, 
  AUTH_METHODS 
} from '@shared/schema';

// BankID configuration - Use the test environment URL
const BANKID_API_URL = 'https://appapi2.test.bankid.com/rp/v6.0';
const BANKID_CERT_PASSWORD = process.env.BANKID_CERT_PASSWORD || '';

console.log("Connecting to BankID test API at:", BANKID_API_URL);

// Read the P12 certificate file
const P12_CERT_PATH = path.resolve('./attached_assets/FPTestcert5_20240610.p12');
let P12_CERT;

try {
  P12_CERT = fs.readFileSync(P12_CERT_PATH);
  console.log("BankID P12 certificate loaded successfully");
} catch (error) {
  console.error("Failed to load P12 certificate:", error);
}

// Create a custom HTTPS agent with the BankID certificates
// For test environments, we'll temporarily disable certificate verification
// In production, this should be set to true with proper CA certificate configuration
const agent = new https.Agent({
  pfx: P12_CERT,
  passphrase: BANKID_CERT_PASSWORD,
  rejectUnauthorized: false
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
    const { personalNumber, authMethod } = req.body;

    // Create session ID
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

    console.log('Sending auth request to BankID API:', { personalNumber, endUserIp });

    // Make request to BankID API
    const response = await bankidApi.post('/auth', authRequest);
    console.log('BankID API auth response:', response.data);
    
    // Store the session with BankID information
    await storage.createBankidSession({
      status: 'pending',
      authMethod: authMethod || AUTH_METHODS.THIS_DEVICE,
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

    // Get the session from our database
    const session = await storage.getBankidSessionByOrderRef(orderRef);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Make request to BankID to collect status
    const collectRequest: BankIDCollectRequest = {
      orderRef,
    };

    console.log('Sending collect request to BankID API:', { orderRef });
    const response = await bankidApi.post('/collect', collectRequest);
    console.log('BankID API collect response:', response.data);
    
    // Update session status based on BankID response
    if (response.data.status === 'complete') {
      await storage.completeBankidSessionByOrderRef(orderRef);
    } else {
      await storage.updateBankidSessionStatusByOrderRef(orderRef, response.data.status);
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
    console.log('Sending cancel request to BankID API:', { orderRef });
    await bankidApi.post('/cancel', { orderRef });
    console.log('BankID API cancel successful');
    
    // Update our session
    await storage.updateBankidSessionStatusByOrderRef(orderRef, 'failed');

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