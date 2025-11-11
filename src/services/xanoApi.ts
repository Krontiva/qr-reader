import axios, { type AxiosInstance } from 'axios';
import type { QRCodeData } from '../types/qr.types';

// Configuration for Xano API
const XANO_BASE_URL = import.meta.env.VITE_XANO_BASE_URL;

/**
 * Get Xano Auth Token from environment variables
 * This is the static service token used for backend service operations
 * @returns The auth token or empty string if not defined
 */
const getAuthToken = (): string => {
  // Try both possible variable names for backward compatibility
  const token = import.meta.env.VITE_XANO_AUTH_TOKEN || import.meta.env.VITE_XANO_API_TOKEN;
  if (!token) {
    console.warn('VITE_XANO_AUTH_TOKEN is not defined in environment variables');
    return ''; // Return empty string instead of throwing error
  }
  return token;
};

class XanoApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: XANO_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthToken(), // Static service token for all API operations
      },
    });
  }

  /**
   * Save a QR code to Xano database
   * @param qrData - The QR code data to save
   * @returns The saved QR code data with ID
   */
  async saveQRCode(qrData: Omit<QRCodeData, 'id' | 'created_at'>): Promise<QRCodeData> {
    try {
      // TODO: Update endpoint name to match your Xano table/endpoint
      const response = await this.api.post('/qr_codes', qrData);
      return response.data;
    } catch (error) {
      console.error('Error saving QR code to Xano:', error);
      throw error;
    }
  }

  /**
   * Get all QR codes from Xano database
   * @returns Array of QR code data
   */
  async getAllQRCodes(): Promise<QRCodeData[]> {
    try {
      // TODO: Update endpoint name to match your Xano table/endpoint
      const response = await this.api.get('/qr_codes');
      return response.data;
    } catch (error) {
      console.error('Error fetching QR codes from Xano:', error);
      throw error;
    }
  }

  /**
   * Get a specific QR code by ID
   * @param id - The ID of the QR code
   * @returns The QR code data
   */
  async getQRCodeById(id: number): Promise<QRCodeData> {
    try {
      // TODO: Update endpoint name to match your Xano table/endpoint
      const response = await this.api.get(`/qr_codes/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching QR code from Xano:', error);
      throw error;
    }
  }

  /**
   * Delete a QR code from Xano database
   * @param id - The ID of the QR code to delete
   */
  async deleteQRCode(id: number): Promise<void> {
    try {
      // TODO: Update endpoint name to match your Xano table/endpoint
      await this.api.delete(`/qr_codes/${id}`);
    } catch (error) {
      console.error('Error deleting QR code from Xano:', error);
      throw error;
    }
  }

  /**
   * Update a QR code in Xano database
   * @param id - The ID of the QR code to update
   * @param qrData - The updated QR code data
   * @returns The updated QR code data
   */
  async updateQRCode(id: number, qrData: Partial<QRCodeData>): Promise<QRCodeData> {
    try {
      // TODO: Update endpoint name to match your Xano table/endpoint
      const response = await this.api.patch(`/qr_codes/${id}`, qrData);
      return response.data;
    } catch (error) {
      console.error('Error updating QR code in Xano:', error);
      throw error;
    }
  }

  /**
   * Search for QR codes by vendor code
   * @param vendorCode - The vendor code to search for
   * @returns Array of matching QR code data
   */
  async searchByVendorCode(vendorCode: string): Promise<QRCodeData[]> {
    try {
      // TODO: Update endpoint name to match your Xano search endpoint
      const response = await this.api.get(`/qr_codes/search`, {
        params: { vendor_code: vendorCode }
      });
      return response.data;
    } catch (error) {
      console.error('Error searching for vendor code:', error);
      throw error;
    }
  }

  /**
   * Get QR codes by vendor name
   * @param vendorName - The vendor name to filter by
   * @returns Array of QR codes for that vendor
   */
  async getByVendorName(vendorName: string): Promise<QRCodeData[]> {
    try {
      // TODO: Update endpoint name to match your Xano endpoint
      const response = await this.api.get(`/qr_codes/vendor/${encodeURIComponent(vendorName)}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching QR codes by vendor:', error);
      throw error;
    }
  }

  /**
   * Batch save multiple QR codes (for vendor code imports)
   * @param qrCodes - Array of QR code data to save
   * @returns Results of batch operation
   */
  async batchSaveQRCodes(qrCodes: Omit<QRCodeData, 'id' | 'created_at'>[]): Promise<QRCodeData[]> {
    try {
      // TODO: Update endpoint name to match your Xano batch endpoint
      // Note: You may need to create a custom endpoint in Xano for batch operations
      const response = await this.api.post('/qr_codes/batch', { qr_codes: qrCodes });
      return response.data;
    } catch (error) {
      console.error('Error batch saving QR codes:', error);
      throw error;
    }
  }

  /**
   * Check if a vendor code already exists
   * @param vendorCode - The vendor code to check
   * @returns Boolean indicating if code exists
   */
  async vendorCodeExists(vendorCode: string): Promise<boolean> {
    try {
      const results = await this.searchByVendorCode(vendorCode);
      return results.length > 0;
    } catch (error) {
      console.error('Error checking vendor code existence:', error);
      return false;
    }
  }
}

export const xanoApi = new XanoApiService();
