export interface QRCodeData {
  id?: number;
  qr_text: string;
  qr_image?: string;
  created_at?: string;
  vendor_code?: string;
  vendor_name?: string;
  product_name?: string;
  metadata?: Record<string, any>;
}

export interface VendorCode {
  vendor_code: string;
  vendor_name: string;
  product_name?: string;
  description?: string;
  additional_info?: Record<string, any>;
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

export interface BatchGenerateResult {
  success: number;
  failed: number;
  results: {
    vendor_code: string;
    qr_image?: string;
    error?: string;
  }[];
}

export interface DelikaQR {
  id: number;
  code: string;
  url: string;
  name?: string;
  created_at?: string | number;
  qrcodeUrl?: string;
  encoded_url?: string;
}
