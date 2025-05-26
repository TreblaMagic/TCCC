import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PaystackConfig {
  publicKey: string;
  email: string;
  amount: number;
  reference: string;
  onSuccess: (response: any) => void;
  onCancel: () => void;
}

interface PaystackResponse {
  reference: string;
  trans: string;
  status: string;
  message: string;
  transaction: string;
}

export const usePaystack = () => {
  const [isLoading, setIsLoading] = useState(false);

  const initializePayment = async (config: PaystackConfig) => {
    setIsLoading(true);
    
    try {
      // Verify PaystackPop is available
      if (typeof window.PaystackPop === 'undefined') {
        throw new Error('Paystack script not loaded');
      }

      const handler = window.PaystackPop.setup({
        key: config.publicKey,
        email: config.email,
        amount: config.amount, // Convert to kobo
        ref: config.reference,
        currency: 'NGN',
        callback: function(response: PaystackResponse) {
          console.log('Paystack callback received:', response);
          
          // Handle the async operations in a separate function
          const handlePaymentVerification = async () => {
            try {
              console.log('Starting payment verification with reference:', response.reference);
              console.log('Full response from Paystack:', JSON.stringify(response, null, 2));

              // Get the verification key from environment
              const verificationKey = import.meta.env.VITE_PAYMENT_VERIFICATION_KEY;
              if (!verificationKey) {
                throw new Error('Payment verification key not configured');
              }

              // Verify payment on server
              const requestBody = { 
                reference: response.reference,
                transaction: response.transaction,
                verificationKey
              };
              console.log('Sending request to Edge Function with body:', JSON.stringify(requestBody, null, 2));

              const { data, error } = await supabase.functions.invoke('verify-payment', {
                body: requestBody
              });

              console.log('Edge Function response:', { data, error });

              if (error) {
                console.error('Payment verification failed:', error);
                throw error;
              }

              if (!data) {
                console.error('No data received from payment verification');
                throw new Error('No data received from payment verification');
              }

              if (data.status === 'success') {
                console.log('Payment verified successfully');
                config.onSuccess(data);
              } else {
                console.error('Payment verification failed:', data.message);
                throw new Error(data.message || 'Payment verification failed');
              }
            } catch (error) {
              console.error('Error in payment callback:', error);
              throw error;
            } finally {
              setIsLoading(false);
            }
          };

          // Execute the async function
          handlePaymentVerification().catch(error => {
            console.error('Payment verification error:', error);
            setIsLoading(false);
          });
        },
        onClose: function() {
          console.log('Paystack payment window closed');
          config.onCancel();
          setIsLoading(false);
        },
      });

      handler.openIframe();
    } catch (error) {
      console.error('Paystack initialization error:', error);
      setIsLoading(false);
      throw error;
    }
  };

  return { initializePayment, isLoading };
};

// Extend Window interface for Paystack
declare global {
  interface Window {
    PaystackPop: {
      setup: (config: any) => {
        openIframe: () => void;
      };
    };
  }
}
