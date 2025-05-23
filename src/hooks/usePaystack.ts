
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

export const usePaystack = () => {
  const [isLoading, setIsLoading] = useState(false);

  const initializePayment = async (config: PaystackConfig) => {
    setIsLoading(true);
    
    try {
      // Load Paystack script if not already loaded
      if (!window.PaystackPop) {
        const script = document.createElement('script');
        script.src = 'https://js.paystack.co/v1/inline.js';
        script.async = true;
        document.head.appendChild(script);
        
        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      const handler = window.PaystackPop.setup({
        key: config.publicKey,
        email: config.email,
        amount: config.amount,
        ref: config.reference,
        callback: async (response: any) => {
          // Verify payment on server
          const { data, error } = await supabase.functions.invoke('verify-payment', {
            body: { reference: response.reference }
          });

          if (error) {
            console.error('Payment verification failed:', error);
            return;
          }

          config.onSuccess(data);
        },
        onClose: config.onCancel,
      });

      handler.openIframe();
    } catch (error) {
      console.error('Paystack initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { initializePayment, isLoading };
};

// Extend Window interface for Paystack
declare global {
  interface Window {
    PaystackPop: any;
  }
}
