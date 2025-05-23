
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { reference } = await req.json()

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get Paystack secret key from settings
    const { data: settingsData } = await supabaseClient
      .from('settings')
      .select('value')
      .eq('key', 'paystack_secret_key')
      .single()

    if (!settingsData?.value) {
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Verify payment with Paystack
    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        'Authorization': `Bearer ${settingsData.value}`,
        'Content-Type': 'application/json'
      }
    })

    const verifyData = await verifyResponse.json()

    if (verifyData.status && verifyData.data.status === 'success') {
      // Update purchase status
      const { data: purchase, error } = await supabaseClient
        .from('purchases')
        .update({ 
          status: 'completed',
          payment_verified: true
        })
        .eq('reference', reference)
        .select()
        .single()

      if (error) {
        console.error('Error updating purchase:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to update purchase' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      // Generate QR code
      const qrResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-qr-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
        },
        body: JSON.stringify({ reference })
      })

      const qrData = await qrResponse.json()

      return new Response(
        JSON.stringify({ 
          success: true, 
          purchase,
          qr_code: qrData.qr_code 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      return new Response(
        JSON.stringify({ error: 'Payment verification failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
