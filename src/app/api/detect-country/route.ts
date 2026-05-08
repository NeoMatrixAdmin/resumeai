import { NextRequest, NextResponse } from 'next/server';
import { getPricingForCountry } from '@/lib/ppp';

export async function GET(req: NextRequest) {
  // Vercel automatically sets this header in production
  const countryCode = req.headers.get('x-vercel-ip-country') || 
                      req.headers.get('cf-ipcountry') || 
                      'US'; // Default to US for local testing
  
  // Pass the detected country into our new 3-Tier PPP logic
  const pricing = getPricingForCountry(countryCode);

  // Return the full pricing object so the frontend knows exactly what to display
  return NextResponse.json({ 
    country: countryCode,
    pricing: pricing 
  });
}