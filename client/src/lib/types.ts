export interface ApiSession {
  success: boolean;
  sessionId: string;
  message?: string;
  status?: string;
  orderRef?: string;
  autoStartToken?: string;
  qrStartToken?: string;
  qrStartSecret?: string;
}

// BankID API Types
export interface BankIDAuthRequest {
  personalNumber?: string;
  endUserIp: string;
  requirement?: {
    cardReader?: string;
    certificatePolicies?: string[];
    issuerCn?: string[];
    autoStartTokenRequired?: boolean;
    allowFingerprint?: boolean;
  };
}

export interface BankIDAuthResponse {
  orderRef: string;
  autoStartToken: string;
  qrStartToken: string;
  qrStartSecret: string;
}

export interface BankIDCollectRequest {
  orderRef: string;
}

export interface BankIDCollectResponse {
  orderRef: string;
  status: "pending" | "failed" | "complete";
  hintCode?: string;
  completionData?: {
    user: {
      personalNumber: string;
      name: string;
      givenName: string;
      surname: string;
    };
    device: {
      ipAddress: string;
    };
    cert: {
      notBefore: string;
      notAfter: string;
    };
    signature: string;
    ocspResponse: string;
  };
}

export interface BankIDQRCode {
  orderRef: string;
  qrStartToken: string;
  qrStartSecret: string;
}

export interface BankIDError {
  errorCode: string;
  details: string;
}
