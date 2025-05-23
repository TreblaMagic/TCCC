import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { QrCode, Scan, CheckCircle, XCircle, AlertTriangle, Camera } from 'lucide-react';
import { Purchase } from '@/types/ticketing';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminNav from '@/components/AdminNav';
import QRCodeScanner from '@/components/QRCodeScanner';

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

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*');

      if (error) {
        console.error('Error loading purchases:', error);
        return;
      }

      const purchasesData = data?.map((p: any) => ({
        ...p,
        createdAt: new Date(p.created_at),
        customerInfo: p.customer_info,
        totalAmount: p.total_amount,
        qrCode: p.qr_code,
        usedTickets: p.entries_used || 0
      })) || [];

      setPurchases(purchasesData);
    } catch (error) {
      console.error('Error loading purchases:', error);
    }
  };

  const handleScan = async (qrCode?: string) => {
    const codeToScan = qrCode || scannedCode.trim();
    
    if (!codeToScan) {
      toast({
        title: "Please enter a QR code",
        variant: "destructive"
      });
      return;
    }

    try {
      // Find purchase by QR code
      const { data: purchaseData, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('qr_code', codeToScan)
        .single();

      if (error || !purchaseData) {
        setScanResult({
          type: 'error',
          purchase: null,
          message: 'Invalid QR code. This code was not found in our system.'
        });
        return;
      }

      const purchase = {
        ...purchaseData,
        createdAt: new Date(purchaseData.created_at),
        customerInfo: purchaseData.customer_info,
        totalAmount: purchaseData.total_amount,
        qrCode: purchaseData.qr_code,
        usedTickets: purchaseData.entries_used || 0
      };

      const totalTickets = purchase.max_entries || 0;
      
      if (purchase.usedTickets >= totalTickets) {
        setScanResult({
          type: 'warning',
          purchase,
          message: 'All tickets for this purchase have already been used for entry.'
        });
        return;
      }

      // Record entry
      const { error: entryError } = await supabase
        .from('entries')
        .insert({
          purchase_id: purchase.reference,
          scanned_by: 'scanner'
        });

      if (entryError) {
        console.error('Error recording entry:', entryError);
        setScanResult({
          type: 'error',
          purchase: null,
          message: 'Failed to record entry. Please try again.'
        });
        return;
      }

      // Update purchase entries count
      const newEntriesUsed = purchase.usedTickets + 1;
      const { error: updateError } = await supabase
        .from('purchases')
        .update({ entries_used: newEntriesUsed })
        .eq('reference', purchase.reference);

      if (updateError) {
        console.error('Error updating purchase:', updateError);
      }

      const remainingTickets = totalTickets - newEntriesUsed;
      
      setScanResult({
        type: 'success',
        purchase: { ...purchase, usedTickets: newEntriesUsed },
        message: `Entry granted! ${remainingTickets} ticket${remainingTickets !== 1 ? 's' : ''} remaining for this purchase.`
      });

      // Clear the scanned code for next scan
      setScannedCode('');
      setIsCameraActive(false);

      toast({
        title: "Entry granted",
        description: `Welcome ${purchase.customerInfo.name}!`
      });

      // Reload purchases to update stats
      loadPurchases();
    } catch (error) {
      console.error('Error processing scan:', error);
      setScanResult({
        type: 'error',
        purchase: null,
        message: 'An error occurred while processing the scan.'
      });
    }
  };

  const resetScan = () => {
    setScanResult({ type: null, purchase: null, message: '' });
    setScannedCode('');
    setIsCameraActive(false);
  };

  const handleCameraScan = (result: string) => {
    setScannedCode(result);
    handleScan(result);
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
                      {purchases.length}
                    </div>
                    <p className="text-sm text-gray-600">Total Purchases</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {purchases.reduce((total, p) => total + (p.usedTickets || 0), 0)}
                    </div>
                    <p className="text-sm text-gray-600">Entries Processed</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {purchases.reduce((total, p) => {
                        const totalTickets = getTotalTickets(p);
                        return total + (totalTickets - (p.usedTickets || 0));
                      }, 0)}
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
