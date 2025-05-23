
export interface TicketType {
  id: string;
  name: string;
  price: number;
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
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  usedTickets: number;
}

export interface PaystackResponse {
  access_code: string;
  authorization_url: string;
  reference: string;
}
