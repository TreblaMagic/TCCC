import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface Ticket {
  ticketNumber: string;
  qrCode: string;
}

interface TicketDisplayProps {
  tickets: Ticket[];
  purchaseReference: string;
}

export function TicketDisplay({ tickets, purchaseReference }: TicketDisplayProps) {
  const [downloading, setDownloading] = useState(false);

  const downloadTicket = async (ticket: Ticket) => {
    setDownloading(true);
    try {
      const ticketElement = document.getElementById(`ticket-${ticket.ticketNumber}`);
      if (!ticketElement) return;

      const canvas = await html2canvas(ticketElement);
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`ticket-${ticket.ticketNumber}.pdf`);
    } catch (error) {
      console.error('Error downloading ticket:', error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Your Tickets</h2>
        <p className="text-gray-600">Purchase Reference: {purchaseReference}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tickets.map((ticket) => (
          <Card key={ticket.ticketNumber} id={`ticket-${ticket.ticketNumber}`} className="relative">
            <CardHeader>
              <CardTitle className="text-center">Tech Conference 2024</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="inline-block p-4 bg-white rounded-lg shadow-sm">
                  <QRCodeSVG
                    value={ticket.qrCode}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>
              </div>
              
              <div className="text-center space-y-2">
                <p className="font-semibold">Ticket Number</p>
                <p className="text-lg font-mono">{ticket.ticketNumber}</p>
              </div>

              <div className="text-center space-y-2">
                <p className="font-semibold">Event Details</p>
                <p>December 15, 2024</p>
                <p>Lagos Convention Center</p>
              </div>

              <Button
                className="w-full"
                onClick={() => downloadTicket(ticket)}
                disabled={downloading}
              >
                <Download className="w-4 h-4 mr-2" />
                {downloading ? 'Downloading...' : 'Download Ticket'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 