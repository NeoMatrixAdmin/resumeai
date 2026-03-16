import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url?.includes('wellfound.com') &&
        !url?.includes('naukri.com') && !url?.includes('indeed.com') &&
        !url?.includes('internshala.com')) {
      return NextResponse.json({ error: 'Unsupported URL' }, { status: 400 });
    }

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    console.log('Scrape status:', res.status, 'URL:', url);

    if (!res.ok) {
      console.log('Scrape failed with status:', res.status);
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 400 });
    }
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 400 });
    }

    const html = await res.text();

    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s{2,}/g, '\n')
      .trim();

    const jdMatch =
      text.match(/About the job([\s\S]{100,3000})/i) ||
      text.match(/Job description([\s\S]{100,3000})/i) ||
      text.match(/About this role([\s\S]{100,3000})/i) ||
      text.match(/Responsibilities([\s\S]{100,3000})/i) ||
      text.match(/Job Summary([\s\S]{100,3000})/i);

    const extracted = jdMatch ? jdMatch[1].trim() : text.slice(0, 3000);

    if (extracted.length < 100) {
      return NextResponse.json({ error: 'Could not extract JD' }, { status: 400 });
    }

    return NextResponse.json({ text: extracted });

  } catch {
    return NextResponse.json({ error: 'Failed to fetch URL' }, { status: 500 });
  }
}