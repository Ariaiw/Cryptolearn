export interface EncryptedPayload {
  v: number;
  algo: string;
  salt?: number[];
  iv: number[];
  data: number[];
  encryptedKey?: number[]; // For Hybrid mode
}

export interface ExplanationStep {
  title: string;
  description: string;
  timestamp: number;
}

export interface RSAKeyPair {
  publicKey: string;
  privateKey: string;
}

export interface ProcessingResult {
  success: boolean;
  output?: string;
  error?: string;
  logs?: ExplanationStep[];
}