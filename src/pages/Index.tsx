import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShoppingCart, Plus, Minus, Calendar, MapPin, Clock, AlertCircle, Ticket as TicketIcon } from 'lucide-react';
import { TicketType, CartItem, CustomerInfo } from '@/types/ticketing';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePaystack } from '@/hooks/usePaystack';

const Index = () => {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    email: '',
    phone: ''
  });
  const [showCheckout, setShowCheckout] = useState(false);
  const [paystackPublicKey, setPaystackPublicKey] = useState<string>('');
  const [isPaymentConfigured, setIsPaymentConfigured] = useState(false);
  const { initializePayment, isLoading } = usePaystack();
  const { toast } = useToast();

  useEffect(() => {
    loadTicketTypes();
    loadPaymentSettings();

    // Subscribe to real-time changes
    const ticketSubscription = supabase
      .channel('ticket_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_types'
        },
        (payload) => {
          console.log('Real-time ticket update:', payload);
          loadTicketTypes();
        }
      )
      .subscribe();

    const purchaseSubscription = supabase
      .channel('purchase_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchases'
        },
        (payload) => {
          console.log('Real-time purchase update:', payload);
          loadTicketTypes();
        }
      )
      .subscribe();

    return () => {
      ticketSubscription.unsubscribe();
      purchaseSubscription.unsubscribe();
    };
  }, []);

  const loadTicketTypes = async () => {
    try {
      // First, get all ticket types
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('ticket_types')
        .select('*')
        .order('created_at');

      if (ticketsError) {
        console.error('Error loading ticket types:', ticketsError);
        return;
      }

      // Then, get all completed purchases
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select('*')
        .eq('status', 'completed');

      if (purchasesError) {
        console.error('Error loading purchases:', purchasesError);
        return;
      }

      if (ticketsData) {
        // Calculate sold tickets for each type
        const ticketsWithSales = ticketsData.map(ticket => {
          const soldTickets = purchasesData.reduce((total, purchase) => {
            const ticketItems = purchase.items.filter((item: any) => 
              item.ticketType.id === ticket.id
            );
            return total + ticketItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
          }, 0);

          return {
            ...ticket,
            available: Math.max(0, ticket.total - soldTickets)
          };
        });

        setTicketTypes(ticketsWithSales);
      }
    } catch (error) {
      console.error('Error loading ticket types:', error);
      toast({
        title: "Failed to load ticket types",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    }
  };

  const loadPaymentSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'paystack_public_key')
        .single();

      if (!error && data?.value) {
        setPaystackPublicKey(data.value);
        setIsPaymentConfigured(true);
      }
    } catch (error) {
      console.error('Error loading payment settings:', error);
    }
  };

  const addToCart = (ticketType: TicketType) => {
    const existingItem = cart.find(item => item.ticketType.id === ticketType.id);
    if (existingItem) {
      if (existingItem.quantity < ticketType.available) {
        setCart(cart.map(item =>
          item.ticketType.id === ticketType.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        toast({
          title: "Not enough tickets available",
          variant: "destructive"
        });
      }
    } else {
      if (ticketType.available > 0) {
        setCart([...cart, { ticketType, quantity: 1 }]);
      }
    }
  };

  const removeFromCart = (ticketTypeId: string) => {
    const existingItem = cart.find(item => item.ticketType.id === ticketTypeId);
    if (existingItem && existingItem.quantity > 1) {
      setCart(cart.map(item =>
        item.ticketType.id === ticketTypeId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      ));
    } else {
      setCart(cart.filter(item => item.ticketType.id !== ticketTypeId));
    }
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.ticketType.price * item.quantity), 0);
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount / 100);
  };

  const handlePayment = async () => {
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      toast({
        title: "Please fill in all customer information",
        variant: "destructive"
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: "Please select at least one ticket",
        variant: "destructive"
      });
      return;
    }

    if (!isPaymentConfigured) {
      toast({
        title: "Payment gateway not configured",
        description: "Please contact the administrator",
        variant: "destructive"
      });
      return;
    }

    try {
      const reference = `TXN_${Date.now()}`;
      const totalAmount = getTotalAmount();

      // Create purchase record
      const { data: purchase, error } = await supabase
        .from('purchases')
        .insert({
          reference,
          customer_info: customerInfo,
          items: cart,
          total_amount: totalAmount,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating purchase:', error);
        toast({
          title: "Failed to create purchase",
          variant: "destructive"
        });
        return;
      }

      // Initialize Paystack payment
      await initializePayment({
        publicKey: paystackPublicKey,
        email: customerInfo.email,
        amount: totalAmount,
        reference,
        onSuccess: async (response) => {
          try {
            // Generate QR code for the purchase
            const qrCode = `TICKET_${reference}`;
            
            // Update purchase with QR code
            const { error: updateError } = await supabase
              .from('purchases')
              .update({ 
                qr_code: qrCode,
                updated_at: new Date().toISOString()
              })
              .eq('reference', reference);

            if (updateError) {
              console.error('Error updating purchase with QR code:', updateError);
            }

            // Reload ticket types to reflect new quantities
            await loadTicketTypes();
            
            // Show success message
            toast({
              title: "Payment successful!",
              description: "Your tickets have been purchased successfully.",
            });

            // Redirect to success page
            window.location.href = `/payment-success?reference=${reference}`;
          } catch (error) {
            console.error('Error in payment success handler:', error);
            toast({
              title: "Error processing payment",
              description: "Please contact support if this persists.",
              variant: "destructive"
            });
          }
        },
        onCancel: async () => {
          try {
            // Update purchase status to failed
            const { error: updateError } = await supabase
              .from('purchases')
              .update({ 
                status: 'failed',
                updated_at: new Date().toISOString()
              })
              .eq('reference', reference);

            if (updateError) {
              console.error('Error updating purchase status:', updateError);
            }

            toast({
              title: "Payment cancelled",
              variant: "destructive"
            });
          } catch (error) {
            console.error('Error in payment cancel handler:', error);
          }
        }
      });
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment failed",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen relative bg-[url('/IMG_5091.jpg')] bg-cover bg-center">
      {/* Overlay for dark effect */}
      <div className="absolute inset-0 bg-[#18192a]/90 z-0" />
      <div className="relative z-10">
        {/* Header */}
        <div className="py-12 bg-transparent">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <h1 className="text-5xl font-extrabold text-white mb-2 tracking-tight">TCCC</h1>
              {/* <img src="/tccc.png" alt="" className="width-500px mx-auto" /> */}
              <p className="text-lg text-[#b0b3c6]">Where Collaboration Meets Creativity</p>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {!isPaymentConfigured && (
            <Alert className="mb-8 border-yellow-400 bg-yellow-900/40">
              <AlertCircle className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="text-yellow-200">
                Payment gateway is not configured. Please contact the administrator to set up payments.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Ticket Selection */}
            <div className="lg:col-span-2">
              <Card className="shadow-lg bg-[#23243a] border border-[#35365a]">
                <CardHeader>
                  <CardTitle className="text-3xl font-bold mb-2 text-white">Available Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6">
                    {ticketTypes.map((ticket) => {
                      const inCart = !!cart.find(item => item.ticketType.id === ticket.id);
                      return (
                        <Card
                          key={ticket.id}
                          className={`flex items-center transition-all duration-200 border-2 ${inCart ? 'border-blue-500 bg-[#23243a]/80' : 'border-[#35365a] bg-[#18192a]'} hover:shadow-lg hover:border-blue-400 group`}
                        >
                          <div className="flex items-center w-full p-6">
                            {/* Icon */}
                            <div className="flex-shrink-0 mr-6">
                              <div className={`rounded-xl bg-[#23243a] p-4 flex items-center justify-center group-hover:bg-blue-900 transition-colors`}>
                                <TicketIcon className="w-8 h-8 text-blue-400" />
                              </div>
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xl font-semibold text-white mb-1">{ticket.name}</h3>
                              <p className="text-[#b0b3c6] mb-2 text-sm">{ticket.description}</p>
                              <div className="flex items-center gap-4">
                                <span className="text-lg font-bold text-blue-300">{formatPrice(ticket.price)}</span>
                                <span className="text-xs px-2 py-1 rounded bg-blue-900 text-blue-300 font-medium">{ticket.available} seats</span>
                              </div>
                            </div>
                            {/* Actions */}
                            <div className="flex flex-col items-end gap-2 ml-6">
                              <div className="flex items-center gap-2 mb-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeFromCart(ticket.id)}
                                  disabled={!inCart}
                                  className="border-gray-700 bg-[#23243a] text-white hover:bg-[#35365a]"
                                >
                                  <Minus className="w-4 h-4" />
                                </Button>
                                <span className="w-8 text-center font-semibold text-blue-200">
                                  {cart.find(item => item.ticketType.id === ticket.id)?.quantity || 0}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addToCart(ticket)}
                                  disabled={ticket.available === 0}
                                  className="border-gray-700 bg-[#23243a] text-white hover:bg-[#35365a]"
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                              <Button
                                onClick={() => addToCart(ticket)}
                                disabled={ticket.available === 0}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded transition-colors"
                              >
                                {inCart ? 'Added' : 'Add to Cart'}
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cart & Checkout */}
            <div className="lg:col-span-1">
              <Card className="sticky top-8 shadow-lg bg-[#23243a] border border-[#35365a]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <ShoppingCart className="w-5 h-5" />
                    Your Order
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-[#6b7280]">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h.008v.008H8.25V6.75zm0 10.5h.008v.008H8.25v-.008zm7.5-10.5h.008v.008h-.008V6.75zm0 10.5h.008v.008h-.008v-.008z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25c0-1.242 1.008-2.25 2.25-2.25h15c1.242 0 2.25 1.008 2.25 2.25v7.5c0 1.242-1.008 2.25-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25v-7.5zm3 0v7.5m13.5-7.5v7.5" />
                      </svg>
                      <p>Your cart is empty</p>
                      <p className="text-sm">Select events and seats to get started</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4 mb-6">
                        {cart.map((item) => (
                          <div key={item.ticketType.id} className={`flex justify-between items-center rounded px-2 py-1 ${cart.find(i => i.ticketType.id === item.ticketType.id) ? 'bg-blue-900/40' : ''}`}>
                            <div>
                              <p className="font-medium text-blue-200">{item.ticketType.name}</p>
                              <p className="text-xs text-[#b0b3c6]">Qty: {item.quantity}</p>
                            </div>
                            <p className="font-semibold text-blue-300">{formatPrice(item.ticketType.price * item.quantity)}</p>
                          </div>
                        ))}
                      </div>

                      <Separator className="my-4 bg-[#35365a]" />

                      <div className="flex justify-between text-lg font-bold mb-6 text-white">
                        <span>Total:</span>
                        <span className="text-blue-300">{formatPrice(getTotalAmount())}</span>
                      </div>

                      {!showCheckout ? (
                        <Button 
                          onClick={() => setShowCheckout(true)} 
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold"
                          disabled={!isPaymentConfigured}
                        >
                          Proceed to Checkout
                        </Button>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="name" className="text-[#b0b3c6]">Full Name</Label>
                            <Input
                              id="name"
                              value={customerInfo.name}
                              onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                              placeholder="Enter your full name"
                              className="bg-[#18192a] text-white border-[#35365a]"
                            />
                          </div>
                          <div>
                            <Label htmlFor="email" className="text-[#b0b3c6]">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              value={customerInfo.email}
                              onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                              placeholder="Enter your email"
                              className="bg-[#18192a] text-white border-[#35365a]"
                            />
                          </div>
                          <div>
                            <Label htmlFor="phone" className="text-[#b0b3c6]">Phone Number</Label>
                            <Input
                              id="phone"
                              value={customerInfo.phone}
                              onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                              placeholder="Enter your phone number"
                              className="bg-[#18192a] text-white border-[#35365a]"
                            />
                          </div>
                          <Button 
                            onClick={handlePayment} 
                            disabled={isLoading || !isPaymentConfigured}
                            className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold"
                          >
                            {isLoading ? 'Processing...' : 'Pay with Paystack'}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setShowCheckout(false)}
                            className="w-full border-[#35365a] bg-[#23243a] text-white hover:bg-[#35365a]"
                          >
                            Back to Cart
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
