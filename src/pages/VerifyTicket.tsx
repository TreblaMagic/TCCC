import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface TicketDetails {
  ticketNumber: string;
  status: string;
  purchaseDate: string;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
  };
  ticketType: string;
  price: number;
}

export default function VerifyTicket() {
  const { ticketNumber } = useParams();
  const [ticket, setTicket] = useState<TicketDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyTicket = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-ticket/${ticketNumber}`, {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to verify ticket');
        }

        if (data.status === 'success') {
          setTicket(data.data);
        } else {
          throw new Error('Invalid ticket data');
        }
      } catch (error) {
        console.error('Error verifying ticket:', error);
        setError(error instanceof Error ? error.message : 'Failed to verify ticket');
      } finally {
        setLoading(false);
      }
    };

    if (ticketNumber) {
      verifyTicket();
    }
  }, [ticketNumber]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Verifying ticket...</h2>
          <p className="text-gray-600">Please wait while we verify your ticket.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Ticket not found</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 py-12">
      <div className="container mx-auto px-4">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              Valid Ticket
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold">Ticket Details</h3>
              <p>Number: {ticket.ticketNumber}</p>
              <p>Type: {ticket.ticketType}</p>
              <p>Status: {ticket.status}</p>
              <p>Price: {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(ticket.price)}</p>
            </div>
            <div>
              <h3 className="font-semibold">Customer Information</h3>
              <p>Name: {ticket.customerInfo.name}</p>
              <p>Email: {ticket.customerInfo.email}</p>
              <p>Phone: {ticket.customerInfo.phone}</p>
            </div>
            <div>
              <h3 className="font-semibold">Purchase Information</h3>
              <p>Date: {new Date(ticket.purchaseDate).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 