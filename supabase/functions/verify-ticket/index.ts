import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get ticket number from URL
    const url = new URL(req.url);
    const ticketNumber = url.pathname.split('/').pop();
    
    if (!ticketNumber) {
      return new Response(
        JSON.stringify({ error: 'Ticket number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Query ticket details
    const { data: ticket, error: ticketError } = await supabaseClient
      .from('tickets')
      .select(`
        *,
        purchase:purchases (
          reference,
          customer_info,
          created_at
        ),
        ticket_type:ticket_types (
          name,
          price
        )
      `)
      .eq('ticket_number', ticketNumber)
      .single();

    if (ticketError || !ticket) {
      return new Response(
        JSON.stringify({ error: 'Ticket not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format response
    const response = {
      status: 'success',
      data: {
        ticketNumber: ticket.ticket_number,
        status: ticket.status,
        purchaseDate: ticket.purchase.created_at,
        customerInfo: ticket.purchase.customer_info,
        ticketType: ticket.ticket_type.name,
        price: ticket.ticket_type.price
      }
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error verifying ticket:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}); 