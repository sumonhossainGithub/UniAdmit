import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';

function getSql() {
  return getNeonSql();
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sql = getSql();

    const [university] = await sql`SELECT * FROM universities WHERE id = ${id}`;
    if (!university) {
      return NextResponse.json({ success: false, message: 'University not found.' }, { status: 404 });
    }

    const programs = await sql`
      SELECT * FROM programs WHERE university_id = ${id} ORDER BY department ASC, name ASC
    `;

    const notices = await sql`
      SELECT * FROM notices WHERE university_id = ${id} OR university_id IS NULL ORDER BY created_at DESC LIMIT 5
    `;

    return NextResponse.json({
      success: true,
      university,
      programs,
      notices
    });
  } catch (err: any) {
    console.error('Error fetching university:', err);
    return NextResponse.json({ success: false, message: 'Error retrieving university details.' }, { status: 500 });
  }
}
