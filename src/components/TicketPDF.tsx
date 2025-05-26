import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import QRCode from 'qrcode';

// Register fonts
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ]
});

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    marginBottom: 10,
  },
  section: {
    margin: 10,
    padding: 10,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Helvetica',
    fontWeight: 500,
    color: '#666666',
    marginBottom: 5,
  },
  value: {
    fontSize: 14,
    fontFamily: 'Helvetica',
    fontWeight: 400,
    marginBottom: 10,
  },
  qrCode: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginVertical: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 10,
    fontFamily: 'Helvetica',
    fontStyle: 'italic',
    color: '#666666',
  },
});

interface EventDetails {
  event_name: string;
  event_date: string;
  venue: string;
}

interface TicketPDFProps {
  ticket: {
    ticketNumber: string;
    qrCode: string;
  };
  purchaseReference: string;
  qrCodeDataURL: string;
  eventDetails: EventDetails;
}

export const TicketPDF = ({ ticket, purchaseReference, qrCodeDataURL, eventDetails }: TicketPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>{eventDetails.event_name}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Ticket Number</Text>
        <Text style={styles.value}>{ticket.ticketNumber}</Text>

        <Text style={styles.label}>Purchase Reference</Text>
        <Text style={styles.value}>{purchaseReference}</Text>

        <Text style={styles.label}>Event Details</Text>
        <Text style={styles.value}>Date: {new Date(eventDetails.event_date).toLocaleDateString()}</Text>
        <Text style={styles.value}>Venue: {eventDetails.venue}</Text>
      </View>

      <View style={styles.qrCode}>
        <Image src={qrCodeDataURL} />
      </View>

      <Text style={styles.footer}>
        This ticket is valid for one-time entry only
      </Text>
    </Page>
  </Document>
); 