import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Scan, X, Keyboard } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface QRCodeScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  isActive: boolean;
  onClose: () => void;
}

const QRCodeScanner = ({ onScan, onError, isActive, onClose }: QRCodeScannerProps) => {
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  const scannerRef = useRef<HTMLDivElement>(null);
  const hasScanned = useRef(false);
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  useEffect(() => {
    if (isActive && scannerRef.current && !hasScanned.current) {
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
      };

      const html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        config,
        false
      );

      html5QrcodeScanner.render(
        async (decodedText) => {
          if (!hasScanned.current) {
            hasScanned.current = true;
            await html5QrcodeScanner.clear();
            
            // Extract ticket number from the QR code
            const match = decodedText.match(/^TICKET:(.+)$/);
            if (match) {
              onScan(match[1]);
            } else {
              onError?.('Invalid QR code format');
              setShowManualInput(true);
            }
            onClose();
          }
        },
        (errorMessage) => {
          console.log("QR scan error:", errorMessage);
          if (errorMessage.includes('No MultiFormat Readers were able to detect the code')) {
            setShowManualInput(true);
          }
          onError?.(errorMessage);
        }
      );

      setScanner(html5QrcodeScanner);

      return () => {
        html5QrcodeScanner.clear().catch(console.error);
        hasScanned.current = false;
      };
    }
  }, [isActive, onScan, onError, onClose]);

  const handleClose = () => {
    if (scanner) {
      scanner.clear().catch(console.error);
    }
    hasScanned.current = false;
    setShowManualInput(false);
    setManualInput('');
    onClose();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onScan(manualInput.trim());
      handleClose();
    }
  };

  if (!isActive) return null;

  return (
    <Card className="fixed inset-4 z-50 bg-white">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2">
          <Scan className="w-5 h-5" />
          QR Code Scanner
        </CardTitle>
        <Button variant="outline" size="sm" onClick={handleClose}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertDescription>
            Position the QR code within the scanning area. Make sure it's well-lit and clearly visible.
          </AlertDescription>
        </Alert>
        
        {showManualInput ? (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Enter ticket number manually"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="flex-1"
              />
              <Button type="submit">
                <Keyboard className="w-4 h-4 mr-2" />
                Submit
              </Button>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowManualInput(false)}
              className="w-full"
            >
              Try Scanning Again
            </Button>
          </form>
        ) : (
          <div id="qr-reader" ref={scannerRef}></div>
        )}
      </CardContent>
    </Card>
  );
};

export default QRCodeScanner;
