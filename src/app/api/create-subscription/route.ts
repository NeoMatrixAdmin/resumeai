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
    
    // 1. Get the pricing info (which now includes the economic Tier)
    const pricing = getPricingForCountry(countryCode || 'IN');

    // 2. Select the right Plan ID based on their Tier
    let currentPlanId = process.env.RAZORPAY_PLAN_ID_TIER1!; // Default to highest tier ($9)
    if (pricing.tier === 'TIER2') {
      currentPlanId = process.env.RAZORPAY_PLAN_ID_TIER2!; // ($5)
    } else if (pricing.tier === 'TIER3') {
      currentPlanId = process.env.RAZORPAY_PLAN_ID_TIER3!; // (₹199 / $2.50)
    }

    // Get user data
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('razorpay_customer_id, email')
      .eq('id', userId)
      .single();

    // Create Razorpay subscription
    const subscription = await (razorpay.subscriptions as any).create({
      plan_id: currentPlanId,
      customer_notify: 1,
      total_count: 12, // 12 months
      notes: {
        clerk_user_id: userId,
        country_code: countryCode,
        pricing_currency: pricing.currency,
        pricing_tier: pricing.tier, // Added so you can track tier performance in Razorpay
      },
    });

    // Save subscription ID to Supabase
    await supabaseAdmin
      .from('users')
      .update({
        razorpay_subscription_id: subscription.id,
        country_code: countryCode,
        pricing_tier: pricing.tier,
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