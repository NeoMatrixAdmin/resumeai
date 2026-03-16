import { NextRequest, NextResponse } from 'next/server';
import { getUsageCount } from '@/lib/redis';

export async function GET(req: NextRequest) {
  const fp = req.nextUrl.searchParams.get('fp');
  if (!fp) return NextResponse.json({ count: 0 });
  const count = await getUsageCount(fp);
  return NextResponse.json({ count });
}