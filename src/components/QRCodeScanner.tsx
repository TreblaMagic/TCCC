import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Scan, X } from 'lucide-react';

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

  useEffect(() => {
    if (isActive && scannerRef.current && !hasScanned.current) {
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
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
            onScan(decodedText);
            onClose();
          }
        },
        (errorMessage) => {
          console.log("QR scan error:", errorMessage);
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
    onClose();
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
        <div id="qr-reader" ref={scannerRef}></div>
      </CardContent>
    </Card>
  );
};

export default QRCodeScanner;
