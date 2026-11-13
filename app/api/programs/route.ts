import { NextResponse } from 'next/server';
import { getPrograms, getUniversities } from '@/lib/data';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const universityId = searchParams.get('universityId') || undefined;

    const [programsList, universitiesList] = await Promise.all([
      getPrograms(universityId),
      getUniversities(),
    ]);

    return NextResponse.json({
      programs: programsList,
      universities: universitiesList,
    });
  } catch (error: any) {
    console.error('Programs fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch programs' }, { status: 500 });
  }
}
