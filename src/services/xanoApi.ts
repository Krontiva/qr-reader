import axios, { type AxiosInstance } from 'axios';
import type { QRCodeData } from '../types/qr.types';

// Configuration for Xano API
// TODO: Update these values with your Xano instance details
const XANO_BASE_URL = import.meta.env.VITE_XANO_BASE_URL || 'https://your-instance.xano.io/api:your-api-group';
const XANO_API_KEY = import.meta.env.VITE_XANO_API_KEY || ''; // Optional: if your Xano API requires authentication

class XanoApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: XANO_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        ...(XANO_API_KEY && { 'Authorization': `Bearer ${XANO_API_KEY}` }),
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
}

export const xanoApi = new XanoApiService();
