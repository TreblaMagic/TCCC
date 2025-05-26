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
    const { data } = await req.json()
    console.log('Received data:', data)

    if (!data) {
      throw new Error('No data provided for QR code generation')
    }

    // Ensure data is a string
    const qrData = typeof data === 'string' ? data : JSON.stringify(data)
    console.log('QR data to encode:', qrData)

    // Generate QR code URL
    const qrCodeUrl = `https://qrcode.tec-it.com/API/QRCode?data=${encodeURIComponent(qrData)}&errorcorrection=M&size=medium&dpi=300`
    console.log('Generated QR code URL:', qrCodeUrl)
    
    // Fetch the QR code image
    const response = await fetch(qrCodeUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch QR code: ${response.status} ${response.statusText}`)
    }
    
    const imageBuffer = await response.arrayBuffer()
    console.log('Received image buffer size:', imageBuffer.byteLength)
    
    // Convert to base64
    const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)))
    const base64Data = `data:image/png;base64,${base64}`
    console.log('Generated base64 data length:', base64Data.length)
    
    // Return the base64 data
    const responseData = { imageData: base64Data }
    console.log('Sending response with image data')
    
    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    )
  } catch (error) {
    console.error('Error in Edge Function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})

function generateQRCodeSVG(data: string): string {
  const qrCodeUrl = `https://qrcode.tec-it.com/API/QRCode?data=${encodeURIComponent(data)}&errorcorrection=M&size=medium&dpi=300`;
  return qrCodeUrl;
}
