import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { QrCode, Scan, CheckCircle, XCircle, AlertTriangle, Camera } from 'lucide-react';
import { Purchase, CustomerInfo, CartItem, isCustomerInfo, isCartItemArray } from '@/types/ticketing';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminNav from '@/components/AdminNav';
import QRCodeScanner from '@/components/QRCodeScanner';
import { Database } from '@/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

interface Stats {
  totalPurchases: number;
  entriesProcessed: number;
  pendingEntries: number;
}

// Add type for the RPC function
type ValidateTicketParams = {
  ticket_id: string;
  purchase_id: string;
};

const QRScanner = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [scannedCode, setScannedCode] = useState('');
  const [scanResult, setScanResult] = useState<{
    type: 'success' | 'error' | 'warning' | null;
    purchase: Purchase | null;
    message: string;
  }>({ type: null, purchase: null, message: '' });
  const [isManualMode, setIsManualMode] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalPurchases: 0,
    entriesProcessed: 0,
    pendingEntries: 0
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

      // Get all completed purchases
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (purchasesError) {
        throw purchasesError;
      }

      // Get all entries
      const { data: entriesData, error: entriesError } = await supabase
        .from('entries')
        .select('*');

      if (entriesError) {
        throw entriesError;
      }

      const formattedPurchases = purchasesData.map((p: any) => {
        const customerInfo = JSON.parse(JSON.stringify(p.customer_info));
        const items = JSON.parse(JSON.stringify(p.items));

        if (!isCustomerInfo(customerInfo)) {
          throw new Error('Invalid customer info format');
        }

        if (!isCartItemArray(items)) {
          throw new Error('Invalid items format');
        }
        
        return {
        id: p.id,
        reference: p.reference,
          customerInfo,
          items,
          totalAmount: p.total_amount as number,
        qrCode: p.qr_code,
          status: p.status as 'completed' | 'pending' | 'failed',
        createdAt: new Date(p.created_at),
        usedTickets: p.entries_used || 0
        };
      });

      setPurchases(formattedPurchases);

      // Calculate entry statistics
      const totalPurchases = formattedPurchases.length;
      const entriesProcessed = entriesData?.length || 0;
      const pendingEntries = formattedPurchases.reduce((total, p) => {
        const totalTickets = getTotalTickets(p);
        return total + (totalTickets - (p.usedTickets || 0));
      }, 0);

      setStats({
        totalPurchases,
        entriesProcessed,
        pendingEntries
      });
    } catch (err) {
      console.error('Error loading purchases:', err);
      setError('Failed to load purchases. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScan = async (ticketNumber?: string) => {
    const codeToScan = ticketNumber || scannedCode.trim();

    if (!codeToScan) {
      toast({
        title: "Please enter a ticket number",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch the specific ticket by ticket_number
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          *,
          ticket_type:ticket_types (
            id,
            name,
            price
          )
        `)
        .eq('ticket_number', codeToScan)
        .single();

      if (ticketError) {
        console.error('Error fetching ticket:', ticketError);
        setScanResult({
          type: 'error',
          purchase: null,
          message: `Error fetching ticket: ${ticketError.message}`
        });
        return;
      }

      if (!ticket) {
        setScanResult({
          type: 'error',
          purchase: null,
          message: 'No ticket found for this number.'
        });
        return;
      }

      // Check if ticket is already validated
      if (ticket.validated) {
        setScanResult({
          type: 'error',
          purchase: null,
          message: 'This ticket has already been used.'
        });
        return;
      }

      // Validate the ticket
      const { data: validationResult, error: validationError } = await supabase
        .rpc('validate_ticket', {
          ticket_id: ticket.id,
          purchase_id: ticket.purchase_id
        });

      if (validationError) {
        console.error('Validation error:', validationError);
        setScanResult({
          type: 'error',
          purchase: null,
          message: `Validation error: ${validationError.message}`
        });
        return;
      }

      if (!validationResult) {
        setScanResult({
          type: 'error',
          purchase: null,
          message: 'No validation result received'
        });
        return;
      }

      if (validationResult.status === 'error') {
        setScanResult({
          type: 'error',
          purchase: null,
          message: validationResult.message || 'Validation failed'
        });
        return;
      }

      // Create a simplified purchase object for display
      const purchase: Purchase = {
        id: ticket.purchase_id,
        reference: ticket.ticket_number,
        customerInfo: {
          name: 'Ticket Holder',
          email: 'N/A',
          phone: 'N/A'
        },
        items: [{
          ticketType: {
            id: ticket.ticket_type.id,
            name: ticket.ticket_type.name,
            price: ticket.ticket_type.price,
            description: '',
            available: 0,
            total: 0
          },
          quantity: 1
        }],
        totalAmount: ticket.ticket_type.price,
        status: 'completed',
        createdAt: new Date(ticket.created_at),
        usedTickets: 1,
        qrCode: ticket.qr_code
      };

      setScanResult({
        type: 'success',
        purchase,
        message: 'Ticket validated successfully!'
      });

      toast({
        title: "Ticket Validated",
        description: "Entry has been recorded successfully.",
      });

      // Reload purchases to update stats
      await loadPurchases();
    } catch (error) {
      console.error('Error validating ticket:', error);
      setScanResult({
        type: 'error',
        purchase: null,
        message: error instanceof Error ? error.message : 'An error occurred while validating the ticket.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetScan = () => {
    setScanResult({ type: null, purchase: null, message: '' });
    setScannedCode('');
    setIsCameraActive(false);
  };

  const handleCameraScan = handleScan;

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount / 100);
  };

  const getTotalTickets = (purchase: Purchase) => {
    return purchase.items.reduce((total, item) => total + item.quantity, 0);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <AdminNav />
        
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">QR Code Scanner</h1>
              <p className="text-gray-600">Scan tickets for event entry validation</p>
            </div>

            {/* Scanner Interface */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="w-5 h-5" />
                  Ticket Validation
                </CardTitle>
                <CardDescription>
                  {isManualMode ? 'Enter QR code manually or use camera to scan' : 'Use camera to scan QR code'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Mode Toggle */}
                <div className="flex gap-2">
                  <Button
                    variant={isManualMode ? "default" : "outline"}
                    onClick={() => {
                      setIsManualMode(true);
                      setIsCameraActive(false);
                    }}
                    size="sm"
                  >
                    Manual Entry
                  </Button>
                  <Button
                    variant={!isManualMode ? "default" : "outline"}
                    onClick={() => {
                      setIsManualMode(false);
                      setIsCameraActive(true);
                    }}
                    size="sm"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Camera Scan
                  </Button>
                </div>

                {/* Manual Input */}
                {isManualMode && (
                  <div className="space-y-4">
                    <div>
                      <Input
                        placeholder="Enter QR code (e.g., TICKET_TXN_1234567890)"
                        value={scannedCode}
                        onChange={(e) => setScannedCode(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleScan()}
                        className="font-mono"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleScan()} className="flex-1">
                        <QrCode className="w-4 h-4 mr-2" />
                        Validate Ticket
                      </Button>
                      <Button variant="outline" onClick={resetScan}>
                        Clear
                      </Button>
                    </div>
                  </div>
                )}

                {/* Camera Scanner */}
                {!isManualMode && (
                  <div className="text-center">
                    <Button 
                      onClick={() => setIsCameraActive(true)}
                      disabled={isCameraActive}
                      className="mb-4"
                    >
                      <Scan className="w-4 h-4 mr-2" />
                      {isCameraActive ? 'Scanner Active' : 'Start Camera Scanner'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Scan Result */}
            {scanResult.type && (
              <Card className="mb-8">
                <CardContent className="p-6">
                  <Alert className={`mb-4 ${
                    scanResult.type === 'success' ? 'border-green-200 bg-green-50' :
                    scanResult.type === 'error' ? 'border-red-200 bg-red-50' :
                    'border-yellow-200 bg-yellow-50'
                  }`}>
                    <div className="flex items-center gap-2">
                      {scanResult.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                      {scanResult.type === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
                      {scanResult.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-600" />}
                      <AlertDescription className={
                        scanResult.type === 'success' ? 'text-green-800' :
                        scanResult.type === 'error' ? 'text-red-800' :
                        'text-yellow-800'
                      }>
                        {scanResult.message}
                      </AlertDescription>
                    </div>
                  </Alert>

                  {scanResult.purchase && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Purchase Details</h3>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm text-gray-500">Customer</p>
                            <p className="font-medium">{scanResult.purchase.customerInfo.name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Email</p>
                            <p className="font-medium">{scanResult.purchase.customerInfo.email}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Phone</p>
                            <p className="font-medium">{scanResult.purchase.customerInfo.phone}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm text-gray-500">Reference</p>
                            <p className="font-mono text-sm">{scanResult.purchase.reference}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Total Amount</p>
                            <p className="font-semibold text-green-600">
                              {formatPrice(scanResult.purchase.totalAmount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Entry Status</p>
                            <div className="flex items-center gap-2">
                              <Badge variant={
                                scanResult.purchase.usedTickets < getTotalTickets(scanResult.purchase) ? 
                                "default" : "secondary"
                              }>
                                {scanResult.purchase.usedTickets}/{getTotalTickets(scanResult.purchase)} used
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500 mb-2">Tickets</p>
                        <div className="space-y-1">
                          {scanResult.purchase.items.map((item, index) => (
                            <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <span>{item.ticketType.name}</span>
                              <span className="text-sm text-gray-600">
                                Qty: {item.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Entry Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.totalPurchases}
                    </div>
                    <p className="text-sm text-gray-600">Total Purchases</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {stats.entriesProcessed}
                    </div>
                    <p className="text-sm text-gray-600">Entries Processed</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {stats.pendingEntries}
                    </div>
                    <p className="text-sm text-gray-600">Pending Entries</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* QR Code Scanner Modal */}
        <QRCodeScanner
          onScan={handleCameraScan}
          onError={(error) => console.log('Scanner error:', error)}
          isActive={isCameraActive}
          onClose={() => setIsCameraActive(false)}
        />
      </div>
    </ProtectedRoute>
  );
};

export default QRScanner;
