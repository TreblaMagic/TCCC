import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate a unique ticket number using UUID and timestamp
function generateTicketNumber(purchaseId: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `TICKET-${purchaseId}-${timestamp}-${random}`.toUpperCase();
}

// Generate QR code data
function generateQRCodeData(ticketNumber: string, purchaseReference: string) {
  const baseUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:8080';
  const verificationUrl = `${baseUrl}/verify-ticket/${ticketNumber}`;
  
  return JSON.stringify({
    ticketNumber,
    purchaseReference,
    verificationUrl
  });
}

interface Ticket {
  ticket_number: string;
  qr_code: string;
  purchase_id: string;
  ticket_type_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface TicketType {
  id: string;
  name: string;
  price: number;
}

interface PurchaseItem {
  ticketType: TicketType;
  quantity: number;
}

interface Purchase {
  id: string;
  items: PurchaseItem[];
  reference: string;
}

// Validate ticket data before insertion
function validateTicket(ticket: Ticket): string | null {
  if (!ticket.ticket_number) return 'Ticket number is required';
  if (!ticket.qr_code) return 'QR code is required';
  if (!ticket.purchase_id) return 'Purchase ID is required';
  if (!ticket.ticket_type_id) return 'Ticket type ID is required';
  if (!ticket.status) return 'Status is required';
  if (!ticket.created_at) return 'Created at timestamp is required';
  if (!ticket.updated_at) return 'Updated at timestamp is required';
  return null;
}

// Check if tickets already exist for this purchase
async function checkExistingTickets(supabaseClient: any, purchaseId: string): Promise<Ticket[]> {
  const { data: existingTickets, error } = await supabaseClient
    .from('tickets')
    .select('*')
    .eq('purchase_id', purchaseId);

  if (error) {
    console.error('Error checking existing tickets:', error);
    return [];
  }

  return existingTickets || [];
}

serve(async (req) => {
  console.log('Edge Function called with method:', req.method);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const body = await req.json();
    console.log('Request body:', body);

    const { reference, transaction, verificationKey } = body;
    console.log('Extracted reference:', reference);
    console.log('Extracted transaction:', transaction);

    if (!reference) {
      console.error('Reference is missing from request body');
      return new Response(
        JSON.stringify({ error: 'Reference is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the verification key
    const expectedVerificationKey = Deno.env.get('PAYMENT_VERIFICATION_KEY');
    console.log('Verification key check:', {
      provided: verificationKey ? 'present' : 'missing',
      expected: expectedVerificationKey ? 'present' : 'missing'
    });
    
    if (!verificationKey || verificationKey !== expectedVerificationKey) {
      console.error('Invalid verification key');
      return new Response(
        JSON.stringify({ error: 'Invalid verification key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Paystack secret key from environment
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY')
    console.log('Paystack secret key present:', !!paystackSecretKey);

    if (!paystackSecretKey) {
      console.error('Paystack secret key not configured');
      return new Response(
        JSON.stringify({ error: 'Paystack secret key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Supabase configuration:', {
      url: supabaseUrl ? 'present' : 'missing',
      serviceKey: supabaseServiceKey ? 'present' : 'missing'
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase configuration missing');
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get purchase details first
    console.log('Fetching purchase details for reference:', reference);
    const { data: purchase, error: purchaseError } = await supabaseClient
      .from('purchases')
      .select('*')
      .eq('reference', reference)
      .single()

    if (purchaseError) {
      console.error('Error fetching purchase:', {
        error: purchaseError,
        message: purchaseError.message,
        details: purchaseError.details,
        hint: purchaseError.hint
      });
      return new Response(
        JSON.stringify({ error: 'Purchase record not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!purchase) {
      console.error('No purchase found for reference:', reference);
      return new Response(
        JSON.stringify({ error: 'Purchase record not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Purchase found:', purchase);

    // Check if tickets already exist for this purchase
    const existingTickets = await checkExistingTickets(supabaseClient, purchase.id);
    if (existingTickets.length > 0) {
      console.log('Tickets already exist for this purchase:', existingTickets.length);
      return new Response(
        JSON.stringify({ 
          status: 'success', 
          data: {
            tickets: existingTickets.map(ticket => ({
              ticketNumber: ticket.ticket_number,
              qrCode: ticket.qr_code
            }))
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify payment with Paystack
    console.log('Verifying payment with Paystack for reference:', reference);
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      }
    })

    const data = await response.json()
    console.log('Paystack verification response:', data);

    if (!response.ok) {
      console.error('Paystack verification failed:', {
        status: response.status,
        statusText: response.statusText,
        data: data
      });
      return new Response(
        JSON.stringify({ error: data.message || 'Payment verification failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update purchase status and generate tickets if verification is successful
    if (data.status && data.data.status === 'success') {
      try {
        console.log('Starting ticket creation process');
        console.log('Purchase data:', JSON.stringify(purchase, null, 2));

        // Generate tickets for each item in the purchase
        const tickets: Ticket[] = [];
        
        for (const item of purchase.items) {
          console.log('Processing item:', JSON.stringify(item, null, 2));
          
          for (let i = 0; i < item.quantity; i++) {
            const ticketNumber = generateTicketNumber(purchase.id);
            const qrCodeData = generateQRCodeData(ticketNumber, purchase.reference);
            
            const ticket: Ticket = {
              ticket_number: ticketNumber,
              qr_code: qrCodeData,
              purchase_id: purchase.id,
              ticket_type_id: item.ticketType.id,
              status: 'valid',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            // Validate ticket before adding
            const validationError = validateTicket(ticket);
            if (validationError) {
              console.error('Invalid ticket data:', {
                ticket: JSON.stringify(ticket, null, 2),
                error: validationError
              });
              continue;
            }

            console.log('Created ticket object:', JSON.stringify(ticket, null, 2));
            tickets.push(ticket);
          }
        }

        console.log(`Generated ${tickets.length} tickets`);

        // Insert tickets one by one to identify any problematic records
        const insertedTickets: Ticket[] = [];
        for (const ticket of tickets) {
          try {
            // Check if ticket already exists
            const { data: existingTicket } = await supabaseClient
              .from('tickets')
              .select('*')
              .eq('ticket_number', ticket.ticket_number)
              .single();

            if (existingTicket) {
              console.log('Ticket already exists:', ticket.ticket_number);
              insertedTickets.push(existingTicket as Ticket);
              continue;
            }

            console.log('Inserting ticket:', JSON.stringify(ticket, null, 2));
            
            const { data: insertedTicket, error: insertError } = await supabaseClient
              .from('tickets')
              .insert(ticket)
              .select()
              .single();

            if (insertError) {
              console.error('Error inserting ticket:', {
                ticket: JSON.stringify(ticket, null, 2),
                error: JSON.stringify(insertError, null, 2),
                message: insertError.message,
                details: insertError.details,
                hint: insertError.hint
              });
              // Continue with next ticket instead of throwing
              continue;
            }

            if (insertedTicket) {
              console.log('Successfully inserted ticket:', JSON.stringify(insertedTicket, null, 2));
              insertedTickets.push(insertedTicket as Ticket);
            }
          } catch (ticketError) {
            console.error('Error processing ticket:', {
              ticket: JSON.stringify(ticket, null, 2),
              error: ticketError instanceof Error ? ticketError.message : 'Unknown error',
              stack: ticketError instanceof Error ? ticketError.stack : undefined
            });
            // Continue with next ticket
            continue;
          }
        }

        if (insertedTickets.length === 0) {
          console.error('No tickets were successfully inserted');
          throw new Error('No tickets were successfully inserted');
        }

        console.log(`Successfully inserted ${insertedTickets.length} tickets`);

        // Update purchase status
        const { error: updateError } = await supabaseClient
          .from('purchases')
          .update({ 
            status: 'completed',
            payment_verified: true,
            updated_at: new Date().toISOString()
          })
          .eq('reference', reference);

        if (updateError) {
          console.error('Error updating purchase:', {
            error: JSON.stringify(updateError, null, 2),
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint
          });
          throw updateError;
        }

        console.log('Successfully updated purchase status');

        // Return success response with ticket information
        return new Response(
          JSON.stringify({ 
            status: 'success', 
            data: {
              ...data,
              tickets: insertedTickets.map(ticket => ({
                ticketNumber: ticket.ticket_number,
                qrCode: ticket.qr_code
              }))
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Error in ticket creation process:', {
          error,
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        return new Response(
          JSON.stringify({ 
            error: 'Failed to process tickets',
            details: error instanceof Error ? error.message : 'Unknown error'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ status: 'success', data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in verify-payment function:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
