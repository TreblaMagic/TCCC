
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Download, Mail, QrCode } from 'lucide-react';
import { Purchase } from '@/types/ticketing';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const reference = searchParams.get('reference');

  useEffect(() => {
    if (reference) {
      // Fetch purchase details from localStorage (simulating backend)
      const purchases = JSON.parse(localStorage.getItem('purchases') || '[]');
      const foundPurchase = purchases.find((p: Purchase) => p.reference === reference);
      if (foundPurchase) {
        setPurchase(foundPurchase);
      }
    }
  }, [reference]);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount / 100);
  };

  const generateQRCodeDataURL = (qrCode: string) => {
    // In a real implementation, you would use a QR code library like qrcode
    // For demo purposes, we'll create a simple data URL
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 200;
    
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 200, 200);
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('QR Code:', 100, 50);
      ctx.fillText(qrCode, 100, 70);
      ctx.fillText('(Demo QR)', 100, 150);
    }
    
    return canvas.toDataURL();
  };

  if (!purchase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Purchase not found or still processing...</p>
            <Link to="/">
              <Button className="mt-4">Return to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <Card className="mb-8 border-green-200 bg-green-50">
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-green-800 mb-2">Payment Successful!</h1>
              <p className="text-green-700">Your tickets have been purchased successfully.</p>
            </CardContent>
          </Card>

          {/* Purchase Details */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Purchase Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex justify-between">
                  <span className="font-medium">Reference:</span>
                  <Badge variant="outline">{purchase.reference}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Customer:</span>
                  <span>{purchase.customerInfo.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Email:</span>
                  <span>{purchase.customerInfo.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Phone:</span>
                  <span>{purchase.customerInfo.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Total Amount:</span>
                  <span className="font-bold text-purple-600">
                    {formatPrice(purchase.totalAmount)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ticket Details */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Ticket Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {purchase.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-semibold">{item.ticketType.name}</h3>
                      <p className="text-sm text-gray-600">{item.ticketType.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Quantity: {item.quantity}</p>
                      <p className="text-sm text-gray-600">
                        {formatPrice(item.ticketType.price)} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* QR Code */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Your Entry QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg mb-4">
                <img 
                  src={generateQRCodeDataURL(purchase.qrCode)}
                  alt="Entry QR Code"
                  className="w-48 h-48 mx-auto"
                />
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Present this QR code at the event entrance for entry
              </p>
              <p className="font-mono text-sm bg-gray-100 p-2 rounded">
                {purchase.qrCode}
              </p>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button className="flex-1" variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download Receipt
            </Button>
            <Button className="flex-1" variant="outline">
              <Mail className="w-4 h-4 mr-2" />
              Email Receipt
            </Button>
            <Link to="/" className="flex-1">
              <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                Buy More Tickets
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
