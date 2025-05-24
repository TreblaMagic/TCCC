export interface TicketType {
  id: string;
  name: string;
  price: number;
  date?: string;
  time?: string;
  location?: string;
  description: string;
  available: number;
  total: number;
}

export interface CartItem {
  ticketType: TicketType;
  quantity: number;
}

export interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
}

export interface Purchase {
  id: string;
  reference: string;
  customerInfo: CustomerInfo;
  items: CartItem[];
  totalAmount: number;
  qrCode: string;
  status: 'completed' | 'pending' | 'failed';
  createdAt: Date;
  usedTickets: number;
}

export interface PaystackResponse {
  access_code: string;
  authorization_url: string;
  reference: string;
}

// Type guards for JSON data
export function isCustomerInfo(data: unknown): data is CustomerInfo {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.name === 'string' &&
    typeof obj.email === 'string' &&
    typeof obj.phone === 'string'
  );
}

export function isTicketType(data: unknown): data is TicketType {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.price === 'number'
  );
}

export function isCartItem(data: unknown): data is CartItem {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    isTicketType(obj.ticketType) &&
    typeof obj.quantity === 'number'
  );
}

export function isCartItemArray(data: unknown): data is CartItem[] {
  if (!Array.isArray(data)) return false;
  return data.every(isCartItem);
}
