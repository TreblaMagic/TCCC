
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Purchase } from '@/types/ticketing';
import { Search, Download, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminNav from '@/components/AdminNav';

const PurchaseHistory = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  useEffect(() => {
    loadPurchases();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = purchases.filter(purchase =>
        purchase.customerInfo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.customerInfo.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.reference.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPurchases(filtered);
    } else {
      setFilteredPurchases(purchases);
    }
  }, [searchTerm, purchases]);

  const loadPurchases = () => {
    const savedPurchases = localStorage.getItem('purchases');
    if (savedPurchases) {
      const purchasesData = JSON.parse(savedPurchases).map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt)
      }));
      setPurchases(purchasesData);
      setFilteredPurchases(purchasesData);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount / 100);
  };

  const getTotalTickets = (purchase: Purchase) => {
    return purchase.items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalRevenue = () => {
    return filteredPurchases.reduce((total, purchase) => total + purchase.totalAmount, 0);
  };

  const generateQRCodeDataURL = (qrCode: string) => {
    // Simple QR code representation for demo
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 150;
    canvas.height = 150;
    
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 150, 150);
      ctx.fillStyle = '#000000';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('QR Code:', 75, 40);
      ctx.fillText(qrCode, 75, 55);
      ctx.fillText('(Demo)', 75, 110);
    }
    
    return canvas.toDataURL();
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <AdminNav />
        
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Purchase History</h1>
            <p className="text-gray-600">View and manage all ticket purchases</p>
          </div>

          {/* Stats and Search */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-green-600">
                  {formatPrice(getTotalRevenue())}
                </div>
                <p className="text-sm text-gray-600">Total Revenue</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-blue-600">
                  {filteredPurchases.length}
                </div>
                <p className="text-sm text-gray-600">Total Purchases</p>
              </CardContent>
            </Card>
            
            <div className="flex items-end">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by name, email, or reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Purchase List */}
          <Card>
            <CardHeader>
              <CardTitle>All Purchases</CardTitle>
              <CardDescription>
                {filteredPurchases.length} purchase{filteredPurchases.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredPurchases.map((purchase) => (
                  <div key={purchase.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="grid md:grid-cols-4 gap-4 flex-1">
                        <div>
                          <p className="font-semibold">{purchase.customerInfo.name}</p>
                          <p className="text-sm text-gray-600">{purchase.customerInfo.email}</p>
                          <p className="text-sm text-gray-600">{purchase.customerInfo.phone}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500">Reference</p>
                          <p className="font-mono text-sm">{purchase.reference}</p>
                          <p className="text-sm text-gray-500">
                            {purchase.createdAt.toLocaleDateString()}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500">Tickets</p>
                          <div className="space-y-1">
                            {purchase.items.map((item, index) => (
                              <p key={index} className="text-sm">
                                {item.quantity}x {item.ticketType.name}
                              </p>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500">Total</p>
                          <p className="font-semibold text-lg text-green-600">
                            {formatPrice(purchase.totalAmount)}
                          </p>
                          <Badge 
                            variant={purchase.status === 'completed' ? 'default' : 'destructive'}
                            className="mt-1"
                          >
                            {purchase.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedPurchase(purchase)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Purchase Details</DialogTitle>
                              <DialogDescription>
                                Complete information for purchase {purchase.reference}
                              </DialogDescription>
                            </DialogHeader>
                            
                            {selectedPurchase && (
                              <div className="space-y-6">
                                {/* Customer Info */}
                                <div>
                                  <h3 className="font-semibold mb-2">Customer Information</h3>
                                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                                    <div>
                                      <p className="text-sm text-gray-500">Name</p>
                                      <p className="font-medium">{selectedPurchase.customerInfo.name}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-500">Email</p>
                                      <p className="font-medium">{selectedPurchase.customerInfo.email}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-500">Phone</p>
                                      <p className="font-medium">{selectedPurchase.customerInfo.phone}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-500">Reference</p>
                                      <p className="font-mono text-sm">{selectedPurchase.reference}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Ticket Details */}
                                <div>
                                  <h3 className="font-semibold mb-2">Ticket Details</h3>
                                  <div className="space-y-2">
                                    {selectedPurchase.items.map((item, index) => (
                                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                        <div>
                                          <p className="font-medium">{item.ticketType.name}</p>
                                          <p className="text-sm text-gray-600">{item.ticketType.description}</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="font-medium">Qty: {item.quantity}</p>
                                          <p className="text-sm text-gray-600">
                                            {formatPrice(item.ticketType.price * item.quantity)}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* QR Code */}
                                <div>
                                  <h3 className="font-semibold mb-2">Entry QR Code</h3>
                                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                                    <img 
                                      src={generateQRCodeDataURL(selectedPurchase.qrCode)}
                                      alt="QR Code"
                                      className="w-24 h-24"
                                    />
                                    <div>
                                      <p className="font-mono text-sm mb-2">{selectedPurchase.qrCode}</p>
                                      <p className="text-sm text-gray-600">
                                        Tickets used: {selectedPurchase.usedTickets}/{getTotalTickets(selectedPurchase)}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Total */}
                                <div className="border-t pt-4">
                                  <div className="flex justify-between items-center">
                                    <span className="text-lg font-semibold">Total Amount:</span>
                                    <span className="text-2xl font-bold text-green-600">
                                      {formatPrice(selectedPurchase.totalAmount)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredPurchases.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">
                      {searchTerm ? 'No purchases found matching your search.' : 'No purchases yet.'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default PurchaseHistory;
