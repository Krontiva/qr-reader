import axios, { type AxiosInstance } from 'axios';
import type { DelikaEvent, TicketOrder, UpdateTicketPayload } from '../types/ticket.types';
import type { DelikaQR } from '../types/qr.types';

// Configuration for Delika API
const DELIKA_BASE_URL = import.meta.env.VITE_DELIKA_API_BASE_URL;
const EVENTS_ENDPOINT = import.meta.env.VITE_DELIKA_EVENTS_ENDPOINT;
const TICKETS_ENDPOINT = import.meta.env.VITE_DELIKA_TICKETS_ENDPOINT;
const ADD_TICKET_CODE_ENDPOINT = import.meta.env.VITE_DELIKA_ADD_TICKET_CODE_ENDPOINT;

/**
 * Get Xano Auth Token from environment variables
 * This is the static service token used for backend service operations
 * @returns The auth token or empty string if not defined
 */
const getAuthToken = (): string => {
  // Try both possible variable names
  const token = import.meta.env.VITE_XANO_AUTH_TOKEN || import.meta.env.VITE_XANO_API_TOKEN;
  if (!token) {
    console.warn('VITE_XANO_AUTH_TOKEN or VITE_XANO_API_TOKEN is not defined in environment variables');
    return ''; // Return empty string instead of throwing error
  }
  return token;
};

/**
 * Get user's auth token from localStorage
 * @returns The user's auth token or null
 */
const getUserAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

class DelikaApiService {
  private api: AxiosInstance;

  constructor() {
    // Use proxy in development to avoid CORS issues
    const isDevelopment = import.meta.env.DEV;
    
    const baseURL = isDevelopment 
      ? '/api/api:uEBBwbSs'  // Use proxy in dev
      : DELIKA_BASE_URL;      // Use direct URL in production

    this.api = axios.create({
      baseURL: baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include service token plus optional user token
    this.api.interceptors.request.use((config) => {
      const userToken = getUserAuthToken();
      const serviceToken = getAuthToken();
      
      // Clear any existing auth headers first
      delete config.headers['Authorization'];
      delete config.headers['X-Xano-Authorization'];
      delete config.headers['X-Xano-Authorization-Only'];
      
      // Always include service token (required for Delika endpoints)
      if (serviceToken) {
        config.headers['Authorization'] = serviceToken;
      }
      
      // Also include user token when available (for per-user auditing/permissions)
      if (userToken) {
        config.headers['X-Xano-Authorization'] = userToken;
        config.headers['X-Xano-Authorization-Only'] = 'true';
      }
      
      return config;
    });
  }

  /**
   * Get all events
   * @returns Array of events
   */
  async getAllEvents(): Promise<DelikaEvent[]> {
    try {
      const response = await this.api.get(EVENTS_ENDPOINT);
      return response.data;
    } catch (error: any) {
      // Handle 401 Unauthorized - might need user token
      if (error.response?.status === 401) {
        const userToken = getUserAuthToken();
        if (!userToken) {
          // Silently fail - user needs to login first
          console.warn('Authentication required for events. User needs to login.');
          throw new Error('Authentication required. Please login to access events.');
        } else {
          // Token exists but still getting 401 - might be invalid or expired
          console.warn('Authentication failed with existing token. Session may have expired.');
          throw new Error('Authentication failed. Your session may have expired. Please login again.');
        }
      }
      
      // Only log non-401 errors
      if (error.response?.status !== 401) {
        console.error('Error fetching events from Delika:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
        });
      }
      
      throw error;
    }
  }

  /**
   * Get a specific event by ID
   * @param eventId - The ID of the event
   * @returns The event data
   */
  async getEventById(eventId: string): Promise<DelikaEvent | null> {
    try {
      const events = await this.getAllEvents();
      return events.find(event => event.id === eventId) || null;
    } catch (error) {
      console.error('Error fetching event by ID:', error);
      throw error;
    }
  }

  /**
   * Get all ticket orders
   * @returns Array of ticket orders
   */
  async getAllTickets(): Promise<TicketOrder[]> {
    try {
      const response = await this.api.get(TICKETS_ENDPOINT);
      return response.data;
    } catch (error: any) {
      // Handle 401 Unauthorized
      if (error.response?.status === 401) {
        const userToken = getUserAuthToken();
        if (!userToken) {
          console.warn('Authentication required for tickets. User needs to login.');
          throw new Error('Authentication required. Please login to access tickets.');
        } else {
          console.warn('Authentication failed with existing token. Session may have expired.');
          throw new Error('Authentication failed. Your session may have expired. Please login again.');
        }
      }
      
      // Only log non-401 errors
      if (error.response?.status !== 401) {
        console.error('Error fetching tickets from Delika:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
        });
      }
      
      throw error;
    }
  }

  /**
   * Get tickets for a specific event
   * @param eventId - The ID of the event
   * @returns Array of ticket orders for the event
   */
  async getTicketsByEvent(eventId: string): Promise<TicketOrder[]> {
    try {
      const tickets = await this.getAllTickets();
      return tickets.filter(ticket => ticket.eventId === eventId);
    } catch (error) {
      console.error('Error fetching tickets by event:', error);
      throw error;
    }
  }

  /**
   * Get a ticket by order number
   * @param orderNumber - The order number
   * @returns The ticket order or null
   */
  async getTicketByOrderNumber(orderNumber: string): Promise<TicketOrder | null> {
    try {
      const tickets = await this.getAllTickets();
      return tickets.find(ticket => ticket.orderNumber === orderNumber) || null;
    } catch (error) {
      console.error('Error fetching ticket by order number:', error);
      throw error;
    }
  }

  /**
   * Get a ticket by vendor code
   * @param vendorCode - The vendor code
   * @returns The ticket order or null
   */
  async getTicketByVendorCode(vendorCode: string): Promise<TicketOrder | null> {
    try {
      const tickets = await this.getAllTickets();
      return tickets.find(ticket => ticket.vendorCode === vendorCode) || null;
    } catch (error) {
      console.error('Error fetching ticket by vendor code:', error);
      throw error;
    }
  }

  /**
   * Get a ticket by ID
   * @param ticketId - The ticket ID
   * @returns The ticket order or null
   */
  async getTicketById(ticketId: string): Promise<TicketOrder | null> {
    try {
      const tickets = await this.getAllTickets();
      return tickets.find(ticket => ticket.id === ticketId) || null;
    } catch (error) {
      console.error('Error fetching ticket by ID:', error);
      throw error;
    }
  }

  /**
   * Update a ticket (for verification, adding QR code, or vendor code)
   * NOTE: This endpoint may need to be created in your Delika API
   * @param ticketId - The ticket ID
   * @param payload - The update payload
   * @returns The updated ticket
   */
  async updateTicket(ticketId: string, payload: UpdateTicketPayload): Promise<TicketOrder> {
    try {
      // TODO: Update this endpoint based on your actual Delika API
      // You may need to create a PATCH or PUT endpoint in Delika
      const response = await this.api.patch(`${TICKETS_ENDPOINT}/${ticketId}`, payload);
      return response.data;
    } catch (error) {
      console.error('Error updating ticket:', error);
      throw error;
    }
  }

  /**
   * Verify a ticket by marking it as verified
   * @param ticketId - The ticket ID
   * @returns The updated ticket
   */
  async verifyTicket(ticketId: string): Promise<TicketOrder> {
    try {
      return await this.updateTicket(ticketId, { verified: true });
    } catch (error) {
      console.error('Error verifying ticket:', error);
      throw error;
    }
  }

  /**
   * Add QR code to a ticket
   * @param ticketId - The ticket ID
   * @param qrCodeDataUrl - The QR code data URL
   * @param vendorCode - Optional vendor code
   * @returns The updated ticket
   */
  async addQRCodeToTicket(ticketId: string, qrCodeDataUrl: string, vendorCode?: string): Promise<TicketOrder> {
    try {
      const payload: UpdateTicketPayload = {
        qrCode: qrCodeDataUrl,
        ...(vendorCode && { vendorCode }),
      };
      return await this.updateTicket(ticketId, payload);
    } catch (error) {
      console.error('Error adding QR code to ticket:', error);
      throw error;
    }
  }

  /**
   * Get paid tickets (for QR code generation)
   * @returns Array of paid ticket orders
   */
  async getPaidTickets(): Promise<TicketOrder[]> {
    try {
      const tickets = await this.getAllTickets();
      return tickets.filter(ticket => ticket.paymentStatus === 'Paid');
    } catch (error) {
      console.error('Error fetching paid tickets:', error);
      throw error;
    }
  }

  /**
   * Get unverified paid tickets
   * @returns Array of unverified paid ticket orders
   */
  async getUnverifiedPaidTickets(): Promise<TicketOrder[]> {
    try {
      const tickets = await this.getPaidTickets();
      return tickets.filter(ticket => !ticket.verified);
    } catch (error) {
      console.error('Error fetching unverified paid tickets:', error);
      throw error;
    }
  }

  /**
   * Get events filtered by type (e.g., "ticket")
   * @param type - The event type to filter by
   * @returns Array of filtered events
   */
  async getEventsByType(type: string): Promise<DelikaEvent[]> {
    try {
      const events = await this.getAllEvents();
      return events.filter(event => event.type === type);
    } catch (error) {
      console.error(`Error fetching events by type ${type}:`, error);
      throw error;
    }
  }

  /**
   * Add vendor code with QR code image to Delika
   * @param code - The vendor code
   * @param qrCodeFile - The QR code image as a File/Blob
   * @param eventId - The event ID (delika_events_table_id)
   * @param productName - Optional product name (item name from inventory)
   * @returns The created record
   */
  async addTicketCode(code: string, qrCodeFile: File | Blob, eventId: string, productName?: string): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('code', code);
      formData.append('photo', qrCodeFile, 'qr-code.png');
      formData.append('delika_events_table_id', eventId);
      if (productName) {
        formData.append('productName', productName);
      }

      // Get auth token (user token preferred, fallback to service token)
      const userToken = getUserAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'multipart/form-data',
      };

      if (userToken) {
        headers['X-Xano-Authorization'] = userToken;
        headers['X-Xano-Authorization-Only'] = 'true';
      } else {
        const serviceToken = getAuthToken();
        if (serviceToken) {
          headers['Authorization'] = serviceToken;
        }
      }

      const response = await this.api.post(ADD_TICKET_CODE_ENDPOINT, formData, {
        headers,
      });
      return response.data;
    } catch (error) {
      console.error('Error adding ticket code:', error);
      throw error;
    }
  }

  async createDelikaQR(url: string, code: string, name: string, qrcodeFile: File | Blob): Promise<unknown> {
    try {
      const formData = new FormData();
      formData.append('url', url);
      formData.append('code', code);
      formData.append('name', name);
      formData.append('qrcode', qrcodeFile, 'qr-code.png');

      const userToken = getUserAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'multipart/form-data',
      };

      if (userToken) {
        headers['X-Xano-Authorization'] = userToken;
        headers['X-Xano-Authorization-Only'] = 'true';
      } else {
        const serviceToken = getAuthToken();
        if (serviceToken) {
          headers['Authorization'] = serviceToken;
        }
      }

      const response = await this.api.post('/delika_qr', formData, { headers });
      return response.data;
    } catch (error) {
      console.error('Error creating Delika QR:', error);
      throw error;
    }
  }

  async updateDelikaQR(code: string, url: string): Promise<unknown> {
    try {
      const userToken = getUserAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (userToken) {
        headers['X-Xano-Authorization'] = userToken;
        headers['X-Xano-Authorization-Only'] = 'true';
      } else {
        const serviceToken = getAuthToken();
        if (serviceToken) {
          headers['Authorization'] = serviceToken;
        }
      }

      const response = await this.api.patch(`/delika_qr/${encodeURIComponent(code)}`, { url }, { headers });
      return response.data;
    } catch (error) {
      console.error('Error updating Delika QR:', error);
      throw error;
    }
  }

  async getDelikaQRs(): Promise<DelikaQR[]> {
    try {
      const userToken = getUserAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (userToken) {
        headers['X-Xano-Authorization'] = userToken;
        headers['X-Xano-Authorization-Only'] = 'true';
      } else {
        const serviceToken = getAuthToken();
        if (serviceToken) {
          headers['Authorization'] = serviceToken;
        }
      }

      const response = await this.api.get('/delika_qr', { headers });
      const raw = response.data as unknown;
      if (!Array.isArray(raw)) return [];

      return raw.map((item) => {
        const rec = item as Record<string, unknown>;
        let qrcodeUrl: string | undefined;
        const file = rec['qrcode'] as unknown;
        if (file && typeof file === 'object' && !Array.isArray(file)) {
          const f = file as Record<string, unknown>;
          const qrCode = f['qr_code'] as Record<string, unknown> | undefined;
          const nestedUrl = qrCode && typeof qrCode['url'] === 'string' ? (qrCode['url'] as string) : undefined;
          if (nestedUrl) {
            qrcodeUrl = nestedUrl;
          } else {
            const maybeUrl = f['url'];
            if (typeof maybeUrl === 'string') {
              qrcodeUrl = maybeUrl as string;
            }
          }
        } else if (Array.isArray(file)) {
          for (const it of file as unknown[]) {
            if (it && typeof it === 'object') {
              const o = it as Record<string, unknown>;
              const qrCode = o['qr_code'] as Record<string, unknown> | undefined;
              const nestedUrl = qrCode && typeof qrCode['url'] === 'string' ? (qrCode['url'] as string) : undefined;
              if (nestedUrl) {
                qrcodeUrl = nestedUrl;
                break;
              }
            }
          }
        }

        return {
          id: typeof rec['id'] === 'number' ? (rec['id'] as number) : 0,
          code: typeof rec['code'] === 'string' ? (rec['code'] as string) : '',
          url: typeof rec['url'] === 'string' ? (rec['url'] as string) : '',
          name: typeof rec['name'] === 'string' ? (rec['name'] as string) : undefined,
          created_at: typeof rec['created_at'] === 'string' || typeof rec['created_at'] === 'number' ? (rec['created_at'] as string | number) : undefined,
          qrcodeUrl,
        } as DelikaQR;
      });
    } catch (error) {
      console.error('Error fetching Delika QRs:', error);
      throw error;
    }
  }

  async updateDelikaQRDetails(code: string, payload: { url?: string; name?: string }): Promise<DelikaQR> {
    try {
      const userToken = getUserAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (userToken) {
        headers['X-Xano-Authorization'] = userToken;
        headers['X-Xano-Authorization-Only'] = 'true';
      } else {
        const serviceToken = getAuthToken();
        if (serviceToken) {
          headers['Authorization'] = serviceToken;
        }
      }

      const response = await this.api.patch(`/delika_qr/${encodeURIComponent(code)}`, payload, { headers });
      return response.data as DelikaQR;
    } catch (error) {
      console.error('Error updating Delika QR details:', error);
      throw error;
    }
  }
}

export const delikaApi = new DelikaApiService();
