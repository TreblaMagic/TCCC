import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TicketDisplay } from '@/components/TicketDisplay';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface Ticket {
  ticketNumber: string;
  qrCode: string;
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const reference = searchParams.get('reference');

  useEffect(() => {
    if (!reference) {
      setError('No purchase reference found');
      setLoading(false);
      return;
    }

    const verifyPayment = async () => {
      try {
        // Get verification key from environment
        const verificationKey = import.meta.env.VITE_PAYMENT_VERIFICATION_KEY;
        if (!verificationKey) {
          console.error('Payment verification key not configured');
          throw new Error('Payment verification key not configured');
        }

        console.log('Starting payment verification for reference:', reference);
        
        // Call the Edge Function to verify payment and get tickets
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            reference,
            verificationKey
          })
        });

        console.log('Edge Function response status:', response.status);
        const data = await response.json();
        console.log('Edge Function response data:', data);

        if (!response.ok) {
          console.error('Payment verification failed:', {
            status: response.status,
            statusText: response.statusText,
            data: data
          });
          throw new Error(data.error || data.details || 'Failed to verify payment');
        }

        if (data.status === 'success' && data.data.tickets) {
          console.log('Payment verified successfully, tickets:', data.data.tickets);
          setTickets(data.data.tickets);
        } else {
          console.error('Invalid response format:', data);
          throw new Error('No tickets found in response');
        }
      } catch (error) {
        console.error('Error verifying payment:', {
          error,
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        setError(error instanceof Error ? error.message : 'Failed to verify payment');
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to verify payment. Please contact support.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [reference, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Verifying your payment...</h2>
          <p className="text-gray-600">Please wait while we process your tickets.</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 py-12">
      <div className="container mx-auto px-4">
        <TicketDisplay tickets={tickets} purchaseReference={reference || ''} />
      </div>
    </div>
  );
}
