
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

    // Generate QR code data
    const qrCodeData = `TICKET_${reference}`
    
    // Create QR code SVG
    const qrCodeSvg = generateQRCodeSVG(qrCodeData)
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Update purchase with QR code
    const { error } = await supabaseClient
      .from('purchases')
      .update({ qr_code: qrCodeData })
      .eq('reference', reference)

    if (error) {
      console.error('Error updating purchase:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to update purchase' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({ qr_code: qrCodeData, qr_svg: qrCodeSvg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

function generateQRCodeSVG(data: string): string {
  // Simple QR code generation using a basic pattern
  // In production, you'd use a proper QR code library
  return `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="white"/>
    <text x="100" y="100" text-anchor="middle" fill="black" font-size="12">${data}</text>
  </svg>`
}
