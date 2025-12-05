// Delika Event and Ticket Types

export interface EventInventoryItem {
  itemName: string;
  itemPrice: string;
  description: string;
  category: string;
  subcategory: string;
  image_url: string;
  image_key: string;
  expiryDate: string | null;
  available: boolean;
  quantity: string;
}

export interface DelikaEvent {
  id: string;
  created_at: number;
  event_name: string;
  event_location: string;
  event_date: string;
  event_startTime: string;
  event_closeTime: string;
  event_description: string;
  venue_latitude: string;
  venue_longitude: string;
  vendor_name: string;
  type: string;
  groceryBranchId: string | null;
  groceryShopId: string | null;
  pharmacyBranchId: string | null;
  pharmacyId: string | null;
  restaurantId: string | null;
  branchId: string | null;
  originType: string;
  expiry_date: string;
  eventDistance: string;
  image_url: string;
  image_key: string;
  inventory: EventInventoryItem[];
}

export interface Customer {
  id: string;
  created_at: number;
  restaurantId: string | null;
  branchId: string | null;
  email: string;
  OTP: string;
  role: string;
  userName: string;
  fullName: string;
  phoneNumber: string;
  country: string;
  address: string;
  city: string;
  postalCode: string;
  dateOfBirth: string | null;
  Status: boolean;
  deviceId: string;
  countryCode: string;
  session: boolean;
  appleId: string;
  loginMethod: string;
  image_url: string;
  image_key: string;
  groceryShopId: string | null;
  groceryBranchId: string | null;
  pharmacyShopId: string | null;
  pharmacyBranchId: string | null;
  image: null;
  Location: {
    long: string;
    lat: string;
  };
}

export interface TicketInventoryItem {
  itemName: string;
  itemPrice: string;
  itemQuantity: string;
}

export interface TicketOrder {
  id: string;
  created_at: number;
  customerId: string;
  customerEmail: string;
  customerPhoneNumber: string;
  originType: string;
  eventId: string;
  paymentStatus: string;
  paystackReferenceCode: string;
  mobile_money_provider: string;
  mobile_money_number: string;
  orderNumber: string;
  verified: boolean;
  vendorCode: string;
  inventory: TicketInventoryItem[];
  qrCode: string | null;
  events: DelikaEvent;
  customer: Customer;
  // Root-level item fields (from API response)
  itemName?: string;
  itemPrice?: string;
  itemQuantity?: string;
}

export interface TicketVerificationResult {
  success: boolean;
  message: string;
  ticket?: TicketOrder;
  alreadyVerified?: boolean;
}

export interface UpdateTicketPayload {
  verified?: boolean;
  vendorCode?: string;
  qrCode?: string;
}
