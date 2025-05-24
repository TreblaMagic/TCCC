import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Receipt, RefreshCw } from 'lucide-react';
import { Purchase } from '@/types/ticketing';
import { supabase } from '@/integrations/supabase/client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminNav from '@/components/AdminNav';
import { Button } from '@/components/ui/button';

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalTickets: 0,
    completedTransactions: 0
  });

  useEffect(() => {
    loadTransactions();

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
          loadTransactions();
        }
      )
      .subscribe();

    return () => {
      purchaseSubscription.unsubscribe();
    };
  }, []);

  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      const formattedTransactions = data.map((t: any) => ({
        id: t.id,
        reference: t.reference,
        customerInfo: t.customer_info,
        items: t.items,
        totalAmount: t.total_amount,
        qrCode: t.qr_code,
        status: t.status,
        createdAt: new Date(t.created_at),
        usedTickets: t.entries_used || 0
      }));

      setTransactions(formattedTransactions);

      // Calculate stats
      const stats = formattedTransactions.reduce((acc, t) => {
        const ticketCount = t.items.reduce((total: number, item: any) => total + item.quantity, 0);
        return {
          totalSales: acc.totalSales + (t.status === 'completed' ? t.totalAmount : 0),
          totalTickets: acc.totalTickets + ticketCount,
          completedTransactions: acc.completedTransactions + (t.status === 'completed' ? 1 : 0)
        };
      }, { totalSales: 0, totalTickets: 0, completedTransactions: 0 });

      setStats(stats);
    } catch (err) {
      console.error('Error loading transactions:', err);
      setError('Failed to load transactions. Please try again.');
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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <AdminNav />
        
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">Transaction History</h1>
                <p className="text-gray-600">View all recent ticket purchases</p>
              </div>
              <Button
                variant="outline"
                onClick={loadTransactions}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Total Sales</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatPrice(stats.totalSales)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Total Tickets Sold</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.totalTickets}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Completed Transactions</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.completedTransactions}
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
                  Recent Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading transactions...</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No transactions found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.map((transaction) => (
                      <Card key={transaction.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-semibold">{transaction.customerInfo.name}</h3>
                              <p className="text-sm text-gray-600">{transaction.customerInfo.email}</p>
                            </div>
                            <Badge className={getStatusColor(transaction.status)}>
                              {transaction.status}
                            </Badge>
                          </div>
                          
                          <div className="grid md:grid-cols-2 gap-4 mt-4">
                            <div>
                              <p className="text-sm text-gray-500">Reference</p>
                              <p className="font-mono text-sm">{transaction.reference}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Date</p>
                              <p className="text-sm">{formatDate(transaction.createdAt)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Amount</p>
                              <p className="font-semibold text-green-600">
                                {formatPrice(transaction.totalAmount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Tickets</p>
                              <p className="text-sm">
                                {transaction.items.reduce((total, item) => total + item.quantity, 0)} tickets
                              </p>
                            </div>
                          </div>

                          <div className="mt-4">
                            <p className="text-sm text-gray-500 mb-2">Items</p>
                            <div className="space-y-1">
                              {transaction.items.map((item, index) => (
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

export default TransactionHistory; 