import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const DEFAULT_DATABASE_URL = "postgresql://neondb_owner:npg_CX28zBtFYoUx@ep-wandering-leaf-bffq3q3n-pooler.c-5.us-west-2.aws.neon.tech/neondb?sslmode=require";

function getSql() {
  const connectionString = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  return neon(connectionString);
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
