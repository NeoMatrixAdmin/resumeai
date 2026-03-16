import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserOptimizations, deleteOptimization } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const optimizations = await getUserOptimizations(userId);
  return NextResponse.json({ optimizations });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const success = await deleteOptimization(id);
  if (!success) return NextResponse.json({ error: 'Delete failed' }, { status: 500 });

  return NextResponse.json({ success: true });
}