import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const { slug } = params;
  
  try {
    const res = await fetch(`https://cdn.simpleicons.org/${slug}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/svg+xml'
      },
      next: { revalidate: 86400 } // cache for 24 hours
    });

    if (!res.ok) {
      return new NextResponse('Icon not found', { status: res.status });
    }

    const svg = await res.text();

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
