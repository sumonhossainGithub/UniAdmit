import { NextResponse } from 'next/server';
import { getNotices } from '@/lib/data';

export async function GET() {
  try {
    const noticesList = await getNotices();
    return NextResponse.json({ notices: noticesList });
  } catch (error: any) {
    console.error('Notices fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch notices' }, { status: 500 });
  }
}
