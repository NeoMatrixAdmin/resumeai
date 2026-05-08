import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature')!;

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);
    console.log('Razorpay webhook:', event.event);

    switch (event.event) {
      case 'subscription.activated':
      case 'subscription.charged': {
        const subscription = event.payload.subscription.entity;
        const clerkUserId = subscription.notes?.clerk_user_id;
        if (clerkUserId) {
          await supabaseAdmin
            .from('users')
            .update({
              plan: 'pro',
              subscription_status: 'active',
              razorpay_subscription_id: subscription.id,
            })
            .eq('id', clerkUserId);
          console.log(`User ${clerkUserId} activated pro`);
        }
        break;
      }

      case 'subscription.cancelled':
      case 'subscription.expired': {
        const subscription = event.payload.subscription.entity;
        await supabaseAdmin
          .from('users')
          .update({ plan: 'free', subscription_status: 'inactive' })
          .eq('razorpay_subscription_id', subscription.id);
        console.log(`Subscription cancelled: ${subscription.id}`);
        break;
      }

      case 'subscription.paused': {
        const subscription = event.payload.subscription.entity;
        await supabaseAdmin
          .from('users')
          .update({ subscription_status: 'paused' })
          .eq('razorpay_subscription_id', subscription.id);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}