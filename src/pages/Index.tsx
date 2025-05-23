
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Plus, Minus, Calendar, MapPin, Clock } from 'lucide-react';
import { TicketType, CartItem, CustomerInfo } from '@/types/ticketing';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    email: '',
    phone: ''
  });
  const [showCheckout, setShowCheckout] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load ticket types from localStorage (simulating backend)
    const savedTicketTypes = localStorage.getItem('ticketTypes');
    if (savedTicketTypes) {
      setTicketTypes(JSON.parse(savedTicketTypes));
    } else {
      // Default ticket types
      const defaultTickets: TicketType[] = [
        {
          id: '1',
          name: 'Regular',
          price: 5000,
          description: 'General admission ticket',
          available: 100,
          total: 100
        },
        {
          id: '2',
          name: 'VIP',
          price: 15000,
          description: 'VIP access with premium seating',
          available: 25,
          total: 25
        }
      ];
      setTicketTypes(defaultTickets);
      localStorage.setItem('ticketTypes', JSON.stringify(defaultTickets));
    }
  }, []);

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

    setIsLoading(true);

    try {
      // Simulate Paystack integration
      const reference = `TXN_${Date.now()}`;
      const totalAmount = getTotalAmount();

      // In a real implementation, you would call Paystack's API here
      console.log('Initiating payment with Paystack:', {
        email: customerInfo.email,
        amount: totalAmount,
        reference,
        callback_url: `${window.location.origin}/payment-success`,
      });

      // Simulate successful payment
      setTimeout(() => {
        // Generate QR code data
        const qrCode = `QR_${reference}`;
        
        // Save purchase to localStorage (simulating backend)
        const purchase = {
          id: reference,
          reference,
          customerInfo,
          items: cart,
          totalAmount,
          qrCode,
          status: 'completed' as const,
          createdAt: new Date(),
          usedTickets: 0
        };

        const existingPurchases = JSON.parse(localStorage.getItem('purchases') || '[]');
        localStorage.setItem('purchases', JSON.stringify([...existingPurchases, purchase]));

        // Update ticket availability
        const updatedTicketTypes = ticketTypes.map(ticketType => {
          const cartItem = cart.find(item => item.ticketType.id === ticketType.id);
          if (cartItem) {
            return {
              ...ticketType,
              available: ticketType.available - cartItem.quantity
            };
          }
          return ticketType;
        });
        localStorage.setItem('ticketTypes', JSON.stringify(updatedTicketTypes));

        // Redirect to success page
        window.location.href = `/payment-success?reference=${reference}`;
      }, 2000);

    } catch (error) {
      toast({
        title: "Payment failed",
        description: "Please try again",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-4">Tech Conference 2024</h1>
            <p className="text-xl mb-6">Join the biggest tech event of the year!</p>
            <div className="flex flex-wrap justify-center gap-6 text-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <span>December 15, 2024</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>9:00 AM - 6:00 PM</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                <span>Lagos Convention Center</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Ticket Selection */}
          <div className="lg:col-span-2">
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">Select Your Tickets</h2>
              <p className="text-gray-600">Choose from our available ticket types</p>
            </div>

            <div className="grid gap-6">
              {ticketTypes.map((ticket) => (
                <Card key={ticket.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold">{ticket.name}</h3>
                        <p className="text-gray-600 mb-2">{ticket.description}</p>
                        <div className="flex items-center gap-4">
                          <span className="text-2xl font-bold text-purple-600">
                            {formatPrice(ticket.price)}
                          </span>
                          <Badge variant={ticket.available > 0 ? "default" : "destructive"}>
                            {ticket.available} available
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeFromCart(ticket.id)}
                          disabled={!cart.find(item => item.ticketType.id === ticket.id)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-8 text-center font-semibold">
                          {cart.find(item => item.ticketType.id === ticket.id)?.quantity || 0}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addToCart(ticket)}
                          disabled={ticket.available === 0}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Cart & Checkout */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Your Order
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No tickets selected</p>
                ) : (
                  <>
                    <div className="space-y-4 mb-6">
                      {cart.map((item) => (
                        <div key={item.ticketType.id} className="flex justify-between">
                          <div>
                            <p className="font-medium">{item.ticketType.name}</p>
                            <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                          </div>
                          <p className="font-semibold">
                            {formatPrice(item.ticketType.price * item.quantity)}
                          </p>
                        </div>
                      ))}
                    </div>

                    <Separator className="my-4" />

                    <div className="flex justify-between text-lg font-bold mb-6">
                      <span>Total:</span>
                      <span className="text-purple-600">{formatPrice(getTotalAmount())}</span>
                    </div>

                    {!showCheckout ? (
                      <Button 
                        onClick={() => setShowCheckout(true)} 
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      >
                        Proceed to Checkout
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            value={customerInfo.name}
                            onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                            placeholder="Enter your full name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={customerInfo.email}
                            onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                            placeholder="Enter your email"
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            value={customerInfo.phone}
                            onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                            placeholder="Enter your phone number"
                          />
                        </div>
                        <Button 
                          onClick={handlePayment} 
                          disabled={isLoading}
                          className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                        >
                          {isLoading ? 'Processing...' : 'Pay with Paystack'}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setShowCheckout(false)}
                          className="w-full"
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
  );
};

export default Index;
