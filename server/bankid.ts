import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as bankid from 'bankid';
import { storage } from './storage';
import { AUTH_METHODS } from '@shared/schema';

// BankID configuration - Use the test environment URL
const BANKID_API_URL = 'https://appapi2.test.bankid.com/rp/v6.0';
const BANKID_CERT_PASSWORD = process.env.BANKID_CERT_PASSWORD || '';

console.log("Connecting to BankID test API at:", BANKID_API_URL);

// Read the certificate files
const P12_CERT_PATH = path.resolve('./attached_assets/FPTestcert5_20240610.p12');
const PEM_CERT_PATH = path.resolve('./attached_assets/FPTestcert5_20240610.pem');

// Initialize BankID client
let bankidClient: bankid.BankIdClient;

try {
  // Initialize BankID client with the certificate
  bankidClient = new bankid.BankIdClient({
    pfx: fs.readFileSync(P12_CERT_PATH),
    passphrase: BANKID_CERT_PASSWORD,
    production: false, // Use test environment
    refreshInterval: 0, // Disable refresh interval
  });
  
  console.log("BankID client initialized successfully");
} catch (error) {
  console.error("Failed to initialize BankID client:", error);
}

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

    console.log('Sending auth request to BankID API:', { personalNumber, endUserIp });

    // Make request to BankID API
    const response = await bankidClient.authenticate({
      personalNumber, 
      endUserIp,
      requirement: {
        allowFingerprint: true
      }
    });
    
    console.log('BankID API auth response:', response);
    
    // Store the session with BankID information
    await storage.createBankidSession({
      status: 'pending',
      authMethod: authMethod || AUTH_METHODS.THIS_DEVICE,
      personalNumber: personalNumber || '',
      orderRef: response.orderRef,
      autoStartToken: response.autoStartToken,
      qrStartToken: response.qrStartToken,
      qrStartSecret: response.qrStartSecret,
    });

    // Return successful response to client
    return res.json({
      success: true,
      sessionId,
      orderRef: response.orderRef,
      autoStartToken: response.autoStartToken,
      qrStartToken: response.qrStartToken,
      qrStartSecret: response.qrStartSecret,
    });
  } catch (error: any) {
    console.error('BankID Auth Error:', error.details || error.message);
    
    // Return error response to client
    return res.status(error.httpStatus || 500).json({
      success: false,
      message: error.details || 'Failed to authenticate with BankID',
      errorCode: error.errorCode,
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

    console.log('Sending collect request to BankID API:', { orderRef });
    const response = await bankidClient.collect({ orderRef });
    console.log('BankID API collect response:', response);
    
    // Update session status based on BankID response
    if (response.status === 'complete') {
      await storage.completeBankidSessionByOrderRef(orderRef);
    } else {
      await storage.updateBankidSessionStatusByOrderRef(orderRef, response.status);
    }

    // Return the collect response to client
    return res.json({
      success: true,
      ...response,
    });
  } catch (error: any) {
    console.error('BankID Collect Error:', error.details || error.message);
    
    // Return error response to client
    return res.status(error.httpStatus || 500).json({
      success: false,
      message: error.details || 'Failed to collect BankID status',
      errorCode: error.errorCode,
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
    await bankidClient.cancel({ orderRef });
    console.log('BankID API cancel successful');
    
    // Update our session
    await storage.updateBankidSessionStatusByOrderRef(orderRef, 'failed');

    // Return successful response to client
    return res.json({
      success: true,
      message: 'BankID authentication cancelled',
    });
  } catch (error: any) {
    console.error('BankID Cancel Error:', error.details || error.message);
    
    // Return error response to client
    return res.status(error.httpStatus || 500).json({
      success: false,
      message: error.details || 'Failed to cancel BankID authentication',
      errorCode: error.errorCode,
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

// BANKID SIGN endpoint
export async function handleBankidSign(req: Request, res: Response) {
  try {
    // Get personal number from request body
    const { personalNumber, userVisibleData } = req.body;

    if (!personalNumber) {
      return res.status(400).json({
        success: false,
        message: 'personalNumber is required',
      });
    }

    // Create session ID
    const sessionId = uuidv4();
    const endUserIp = getClientIp(req);
    
    // Encode the user visible data in base64 format
    const encodedUserVisibleData = Buffer.from(userVisibleData || 'Test av BankID').toString('base64');

    console.log('Sending sign request to BankID API:', { personalNumber, endUserIp });

    // Make request to BankID API
    const response = await bankidClient.sign({
      personalNumber, 
      endUserIp,
      userVisibleData: encodedUserVisibleData,
      requirement: {
        allowFingerprint: true
      }
    });
    
    console.log('BankID API sign response:', response);
    
    // Store the session with BankID information
    await storage.createBankidSession({
      status: 'pending',
      authMethod: AUTH_METHODS.THIS_DEVICE,
      personalNumber: personalNumber,
      orderRef: response.orderRef,
      autoStartToken: response.autoStartToken,
      qrStartToken: response.qrStartToken,
      qrStartSecret: response.qrStartSecret,
    });

    // Return successful response to client
    return res.json({
      success: true,
      sessionId,
      orderRef: response.orderRef,
      autoStartToken: response.autoStartToken,
      qrStartToken: response.qrStartToken,
      qrStartSecret: response.qrStartSecret,
    });
  } catch (error: any) {
    console.error('BankID Sign Error:', error.details || error.message);
    
    // Return error response to client
    return res.status(error.httpStatus || 500).json({
      success: false,
      message: error.details || 'Failed to sign with BankID',
      errorCode: error.errorCode,
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