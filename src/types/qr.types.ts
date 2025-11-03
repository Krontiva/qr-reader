export interface QRCodeData {
  id?: number;
  qr_text: string;
  qr_image?: string;
  created_at?: string;
  metadata?: Record<string, any>;
}

export interface ScanResult {
  text: string;
  timestamp: Date;
}

export interface GenerateOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}
