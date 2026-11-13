import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const DEFAULT_DATABASE_URL = "postgresql://neondb_owner:npg_CX28zBtFYoUx@ep-wandering-leaf-bffq3q3n-pooler.c-5.us-west-2.aws.neon.tech/neondb?sslmode=require";

function getSql() {
  const connectionString = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  return neon(connectionString);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || 'all';

    const sql = getSql();

    let query = sql`SELECT * FROM universities WHERE is_active = true`;
    if (type !== 'all') {
      query = sql`SELECT * FROM universities WHERE is_active = true AND LOWER(type) = LOWER(${type})`;
    }

    const universities = await query;
    const allPrograms = await sql`SELECT * FROM programs ORDER BY name ASC`;

    const enriched = universities.map((u: any) => ({
      ...u,
      programs: allPrograms.filter((p: any) => String(p.university_id) === String(u.id))
    }));

    return NextResponse.json({
      success: true,
      count: enriched.length,
      universities: enriched
    });
  } catch (err: any) {
    console.error('Universities fetch error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
