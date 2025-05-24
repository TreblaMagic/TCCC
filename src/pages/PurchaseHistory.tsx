import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Receipt, RefreshCw, Trash2 } from 'lucide-react';
import { Purchase } from '@/types/ticketing';
import { supabase } from '@/integrations/supabase/client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminNav from '@/components/AdminNav';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";

const PurchaseHistory = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalPurchases: 0,
    totalCustomers: 0,
    averageOrderValue: 0
  });

  useEffect(() => {
    loadPurchases();

    // Subscribe to real-time changes
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
          console.log('Real-time update:', payload);
          loadPurchases();
        }
      )
      .subscribe();

    return () => {
      purchaseSubscription.unsubscribe();
    };
  }, []);

  const loadPurchases = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const formattedPurchases = data.map((p: any) => ({
        id: p.id,
        reference: p.reference,
        customerInfo: p.customer_info,
        items: p.items,
        totalAmount: p.total_amount,
        qrCode: p.qr_code,
        status: p.status,
        createdAt: new Date(p.created_at),
        usedTickets: p.entries_used || 0
      }));

      setPurchases(formattedPurchases);

      // Calculate stats
      const uniqueCustomers = new Set(formattedPurchases.map(p => p.customerInfo.email));
      const totalRevenue = formattedPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
      const totalPurchases = formattedPurchases.length;
      const averageOrderValue = totalPurchases > 0 ? totalRevenue / totalPurchases : 0;

      setStats({
        totalRevenue,
        totalPurchases,
        totalCustomers: uniqueCustomers.size,
        averageOrderValue
      });
    } catch (err) {
      console.error('Error loading purchases:', err);
      setError('Failed to load purchases. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount / 100);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const clearHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Get all completed purchase IDs
      const { data: purchasesToDelete, error: fetchError } = await supabase
        .from('purchases')
        .select('id')
        .eq('status', 'completed');

      if (fetchError) throw fetchError;

      const purchaseIds = purchasesToDelete.map((p: { id: string }) => p.id);

      if (purchaseIds.length > 0) {
        // 2. Delete all tickets for these purchases (regardless of status)
        const { error: ticketsError } = await supabase
          .from('tickets')
          .delete()
          .in('purchase_id', purchaseIds);

        if (ticketsError) {
          console.error('Error deleting tickets:', ticketsError);
          throw ticketsError;
        }

        // 3. Delete the purchases
        const { error: purchasesError } = await supabase
          .from('purchases')
          .delete()
          .eq('status', 'completed');

        if (purchasesError) {
          console.error('Error deleting purchases:', purchasesError);
          throw purchasesError;
        }

        // Reset local state
        setPurchases([]);
        setStats({
          totalRevenue: 0,
          totalPurchases: 0,
          totalCustomers: 0,
          averageOrderValue: 0
        });

        toast({
          title: "Purchase history cleared successfully"
        });
      } else {
        toast({
          title: "No completed purchases to clear"
        });
      }
    } catch (err) {
      console.error('Error clearing purchase history:', err);
      setError('Failed to clear purchase history. Please try again.');
      toast({
        title: "Failed to clear purchase history",
        description: err instanceof Error ? err.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <AdminNav />
        
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
            <h1 className="text-3xl font-bold mb-2">Purchase History</h1>
                <p className="text-gray-600">View all ticket purchases and statistics</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={loadPurchases}
                  disabled={isLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isLoading || purchases.length === 0}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear History
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear Purchase History</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action will permanently delete all completed purchase records. This action cannot be undone.
                        Are you sure you want to continue?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={clearHistory}>Clear History</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
          </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatPrice(stats.totalRevenue)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Total Purchases</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.totalPurchases}
                  </p>
                </CardContent>
              </Card>
            <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Total Customers</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.totalCustomers}
                  </p>
              </CardContent>
            </Card>
            <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Average Order Value</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatPrice(stats.averageOrderValue)}
                  </p>
              </CardContent>
            </Card>
            </div>

            {error && (
              <Alert className="mb-8 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  All Purchases
                </CardTitle>
              <CardDescription>
                  {purchases.length} purchase{purchases.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading purchases...</p>
                  </div>
                ) : purchases.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No purchases found
                  </div>
                ) : (
              <div className="space-y-4">
                    {purchases.map((purchase) => (
                      <Card key={purchase.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                        <div>
                              <h3 className="font-semibold">{purchase.customerInfo.name}</h3>
                          <p className="text-sm text-gray-600">{purchase.customerInfo.email}</p>
                            </div>
                            <Badge className={getStatusColor(purchase.status)}>
                              {purchase.status}
                            </Badge>
                        </div>
                        
                          <div className="grid md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-gray-500">Reference</p>
                          <p className="font-mono text-sm">{purchase.reference}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Date</p>
                              <p className="text-sm">{formatDate(purchase.createdAt)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Amount</p>
                              <p className="font-semibold text-green-600">
                                {formatPrice(purchase.totalAmount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Tickets</p>
                              <p className="text-sm">
                                {purchase.items.reduce((total, item) => total + item.quantity, 0)} tickets
                              </p>
                          </div>
                        </div>
                        
                          <div className="mt-4">
                            <p className="text-sm text-gray-500 mb-2">Items</p>
                            <div className="space-y-1">
                              {purchase.items.map((item, index) => (
                                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                  <span>{item.ticketType.name}</span>
                                  <span className="text-sm text-gray-600">
                                    Qty: {item.quantity}
                                  </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default PurchaseHistory;
