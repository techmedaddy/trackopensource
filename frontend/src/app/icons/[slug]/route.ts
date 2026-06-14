import { NextResponse } from 'next/server';

export const runtime = 'edge';

const brandColors: Record<string, string> = {
  "c": "A8B9CC",
  "cplusplus": "00599C",
  "go": "00ADD8",
  "openjdk": "437291",
  "javascript": "F7DF1E",
  "python": "3776AB",
  "ruby": "CC342D",
  "rust": "000000",
  "typescript": "3178C6"
};

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const { slug } = params;
  
  try {
    // Fetch the raw uncolored SVG from jsDelivr to completely bypass Cloudflare blocks
    const res = await fetch(`https://cdn.jsdelivr.net/npm/simple-icons@13.0.0/icons/${slug}.svg`, {
      next: { revalidate: 86400 } // cache for 24 hours
    });

    if (!res.ok) {
      return new NextResponse('Icon not found', { status: res.status });
    }

    let svg = await res.text();
    
    // Inject the brand color directly into the SVG path!
    const hexColor = brandColors[slug] || "000000";
    svg = svg.replace('<path ', `<path fill="#${hexColor}" `);

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
