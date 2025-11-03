import axios, { type AxiosInstance } from 'axios';
import type { DelikaEvent, TicketOrder, UpdateTicketPayload } from '../types/ticket.types';

// Configuration for Delika API
const DELIKA_BASE_URL = import.meta.env.VITE_DELIKA_API_BASE_URL || 'https://api-server.krontiva.africa/api:uEBBwbSs';
const EVENTS_ENDPOINT = import.meta.env.VITE_DELIKA_EVENTS_ENDPOINT || '/delika_events_table';
const TICKETS_ENDPOINT = import.meta.env.VITE_DELIKA_TICKETS_ENDPOINT || '/delika_ticket_orders_table';

class DelikaApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: DELIKA_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
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
    } catch (error) {
      console.error('Error fetching events from Delika:', error);
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
    } catch (error) {
      console.error('Error fetching tickets from Delika:', error);
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
}

export const delikaApi = new DelikaApiService();
