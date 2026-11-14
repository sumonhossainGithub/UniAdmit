import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';
import { supabase } from '@/lib/supabase';

function getSql() {
  return getNeonSql();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || 'all';

    let universities: any[] = [];
    let allPrograms: any[] = [];
    const sql = getSql();

    if (sql) {
      try {
        let query = sql`SELECT * FROM universities WHERE is_active = true`;
        if (type !== 'all') {
          query = sql`SELECT * FROM universities WHERE is_active = true AND LOWER(type) = LOWER(${type})`;
        }
        universities = await query;
        allPrograms = await sql`SELECT * FROM programs ORDER BY name ASC`;
      } catch (neonErr) {
        console.warn('Neon universities query error, using Supabase fallback:', neonErr);
      }
    }

    if (!universities || universities.length === 0) {
      let uQuery = supabase.from('universities').select('*').eq('is_active', true);
      if (type !== 'all') {
        uQuery = uQuery.ilike('type', type);
      }

      const [uRes, pRes] = await Promise.all([
        uQuery,
        supabase.from('programs').select('*').order('name', { ascending: true })
      ]);

      universities = uRes.data || [];
      allPrograms = pRes.data || [];
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      universities = universities.filter(u =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.short_name && u.short_name.toLowerCase().includes(q)) ||
        (u.location && u.location.toLowerCase().includes(q))
      );
    }

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
