import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Razorpay from 'razorpay';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getPricingForCountry } from '@/lib/ppp';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { countryCode } = await req.json();
    
    // 1. Get the pricing info 
    // Fallback to 'IN' if countryCode is missing to ensure pricing object exists
    const pricing = getPricingForCountry(countryCode || 'IN');

    // 2. Select Plan ID (Matched to your Vercel variable names)
    let currentPlanId = '';
    if (pricing.tier === 'TIER1') {
      currentPlanId = process.env.RAZORPAY_PLAN_ID_TIER1!;
    } else if (pricing.tier === 'TIER2') {
      currentPlanId = process.env.RAZORPAY_PLAN_ID_TIER2!;
    } else {
      // Correctly points to your RAZORPAY_PLAN_ID_INDIA variable
      currentPlanId = process.env.RAZORPAY_PLAN_ID_INDIA!;
    }

    // CRITICAL: Fail early if the environment variable is actually missing
    if (!currentPlanId) {
      console.error(`Missing Plan ID for Tier: ${pricing.tier}`);
      return NextResponse.json({ error: 'Pricing configuration error' }, { status: 500 });
    }

    // ... (User selection logic remains the same)

    // Create Razorpay subscription
    const subscription = await (razorpay.subscriptions as any).create({
      plan_id: currentPlanId,
      customer_notify: 1,
      total_count: 12,
      notes: {
        clerk_user_id: userId,
        country_code: countryCode || 'IN',
        pricing_tier: pricing.tier,
      },
    });

    // Save to Supabase
    await supabaseAdmin
      .from('users')
      .update({
        razorpay_subscription_id: subscription.id,
        country_code: countryCode || 'IN',
        pricing_tier: pricing.tier,
        plan: 'pro', // Optional: Set plan to pro pending payment verification
      })
      .eq('id', userId);

    return NextResponse.json({
      subscriptionId: subscription.id,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      pricing,
    });
  } catch (err) {
    console.error('Subscription creation error:', err);
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  }
}