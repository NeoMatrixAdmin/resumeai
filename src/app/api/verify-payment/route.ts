import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = await req.json();

    // Verify signature
    const body = razorpay_payment_id + '|' + razorpay_subscription_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    // Activate pro plan
    await supabaseAdmin
      .from('users')
      .update({
        plan: 'pro',
        subscription_status: 'active',
        razorpay_subscription_id,
      })
      .eq('id', userId);

    console.log(`Payment verified for user ${userId}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Payment verification error:', err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}