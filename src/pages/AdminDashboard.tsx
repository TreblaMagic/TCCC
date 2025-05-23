import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TicketType, Purchase } from '@/types/ticketing';
import { Ticket, DollarSign, Users, TrendingUp, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminNav from '@/components/AdminNav';
import PaymentGatewaySettings from '@/components/PaymentGatewaySettings';

const AdminDashboard = () => {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load ticket types
      const { data: ticketTypesData } = await supabase
        .from('ticket_types')
        .select('*');

      // Load purchases
      const { data: purchasesData } = await supabase
        .from('purchases')
        .select('*')
        .order('created_at', { ascending: false });

      if (ticketTypesData) {
        setTicketTypes(ticketTypesData);
      }

      if (purchasesData) {
        const formattedPurchases = purchasesData.map((p: any) => ({
          ...p,
          createdAt: new Date(p.created_at),
          customerInfo: p.customer_info,
          totalAmount: p.total_amount,
          qrCode: p.qr_code,
          usedTickets: p.entries_used || 0
        }));
        setPurchases(formattedPurchases);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount / 100);
  };

  const getTotalRevenue = () => {
    return purchases.reduce((total, purchase) => total + purchase.totalAmount, 0);
  };

  const getTotalTicketsSold = () => {
    return purchases.reduce((total, purchase) => 
      total + purchase.items.reduce((itemTotal, item) => itemTotal + item.quantity, 0), 0
    );
  };

  const getTicketsSoldByType = () => {
    const soldByType: { [key: string]: number } = {};
    purchases.forEach(purchase => {
      purchase.items.forEach(item => {
        const typeName = item.ticketType.name;
        soldByType[typeName] = (soldByType[typeName] || 0) + item.quantity;
      });
    });
    return soldByType;
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <AdminNav />
        
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">Overview of your event ticketing system</p>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="w-4 h-4 mr-2" />
                Payment Gateway
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatPrice(getTotalRevenue())}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      From {purchases.length} transactions
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
                    <Ticket className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {getTotalTicketsSold()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Across all ticket types
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Customers</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {purchases.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Unique purchases
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {purchases.length > 0 ? formatPrice(getTotalRevenue() / purchases.length) : formatPrice(0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Per transaction
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                {/* Ticket Types Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Ticket Types</CardTitle>
                    <CardDescription>Current availability and sales</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {ticketTypes.map((ticket) => {
                        const sold = getTicketsSoldByType()[ticket.name] || 0;
                        const percentage = ticket.total > 0 ? (sold / ticket.total) * 100 : 0;
                        
                        return (
                          <div key={ticket.id} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <div>
                                <h4 className="font-medium">{ticket.name}</h4>
                                <p className="text-sm text-gray-600">{formatPrice(ticket.price)}</p>
                              </div>
                              <div className="text-right">
                                <Badge variant={ticket.available > 0 ? "default" : "destructive"}>
                                  {ticket.available} available
                                </Badge>
                                <p className="text-sm text-gray-600 mt-1">
                                  {sold} sold
                                </p>
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Purchases */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Purchases</CardTitle>
                    <CardDescription>Latest ticket purchases</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {purchases.slice(0, 5).map((purchase) => (
                        <div key={purchase.id} className="flex justify-between items-start p-4 bg-gray-50 rounded-lg">
                          <div>
                            <h4 className="font-medium">{purchase.customerInfo.name}</h4>
                            <p className="text-sm text-gray-600">{purchase.customerInfo.email}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(purchase.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600">
                              {formatPrice(purchase.totalAmount)}
                            </p>
                            <Badge variant="outline" className="mt-1">
                              {purchase.items.reduce((total, item) => total + item.quantity, 0)} tickets
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {purchases.length === 0 && (
                        <p className="text-center text-gray-500 py-8">No purchases yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="settings">
              <PaymentGatewaySettings />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default AdminDashboard;
