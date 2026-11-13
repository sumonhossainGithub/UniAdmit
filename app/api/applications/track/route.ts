import { NextResponse } from 'next/server';
import { trackApplication } from '@/lib/data';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'Tracking query parameter (q) is required' }, { status: 400 });
    }

    const applications = await trackApplication(query);
    return NextResponse.json({ applications });
  } catch (error: any) {
    console.error('Track error:', error);
    return NextResponse.json({ error: 'Failed to search application' }, { status: 500 });
  }
}
