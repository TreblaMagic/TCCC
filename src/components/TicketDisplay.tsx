import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '@/hooks/use-toast';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { TicketPDF } from './TicketPDF';
import QRCode from 'qrcode';
import { supabase } from '@/lib/supabase';

interface Ticket {
  ticketNumber: string;
  qrCode: string;
}

interface EventDetails {
  event_name: string;
  event_date: string;
  venue: string;
}

interface TicketDisplayProps {
  tickets: Ticket[];
  purchaseReference: string;
}

export function TicketDisplay({ tickets, purchaseReference }: TicketDisplayProps) {
  const { toast } = useToast();
  const [qrCodeDataURLs, setQrCodeDataURLs] = useState<Record<string, string>>({});
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);

  useEffect(() => {
    loadEventDetails();
    generateQRCodeDataURLs();
  }, [tickets]);

  const loadEventDetails = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_current_event_details');

      if (error) throw error;
      setEventDetails(data);
    } catch (error) {
      console.error('Error loading event details:', error);
      toast({
        title: "Error",
        description: "Failed to load event details. Please try again.",
        variant: "destructive"
      });
    }
  };

  const generateQRCodeDataURLs = async () => {
    const dataURLs: Record<string, string> = {};
    for (const ticket of tickets) {
      try {
        const dataURL = await QRCode.toDataURL(ticket.qrCode, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
        dataURLs[ticket.ticketNumber] = dataURL;
      } catch (error) {
        console.error('Error generating QR code:', error);
        toast({
          title: "Error",
          description: "Failed to generate QR code for ticket. Please try again.",
          variant: "destructive"
        });
      }
    }
    setQrCodeDataURLs(dataURLs);
  };

  if (!eventDetails) {
    return <div>Loading event details...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Your Tickets</h2>
        <p className="text-gray-600">Purchase Reference: {purchaseReference}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tickets.map((ticket) => (
          <Card key={ticket.ticketNumber} className="relative">
            <CardHeader>
              <CardTitle className="text-center">{eventDetails.event_name}</CardTitle>
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
                <p>{new Date(eventDetails.event_date).toLocaleDateString()}</p>
                <p>{eventDetails.venue}</p>
              </div>

              {qrCodeDataURLs[ticket.ticketNumber] && (
                <PDFDownloadLink
                  document={
                    <TicketPDF
                      ticket={ticket}
                      purchaseReference={purchaseReference}
                      qrCodeDataURL={qrCodeDataURLs[ticket.ticketNumber]}
                      eventDetails={eventDetails}
                    />
                  }
                  fileName={`ticket-${ticket.ticketNumber}.pdf`}
                  className="w-full"
                >
                  {({ loading, error }) => {
                    if (error) {
                      toast({
                        title: "Error",
                        description: "Failed to generate PDF. Please try again.",
                        variant: "destructive"
                      });
                    }
                    return (
                      <Button
                        className="w-full"
                        disabled={loading}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {loading ? 'Generating PDF...' : 'Download Ticket'}
                      </Button>
                    );
                  }}
                </PDFDownloadLink>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 