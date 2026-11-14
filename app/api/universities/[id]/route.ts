import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';
import { supabase } from '@/lib/supabase';

function getSql() {
  return getNeonSql();
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cleanId = String(id).trim();

    let university: any = null;
    let programs: any[] = [];
    let notices: any[] = [];
    const sql = getSql();

    if (sql) {
      try {
        const rows = await sql`SELECT * FROM universities WHERE id::text = ${cleanId} LIMIT 1`;
        if (rows && rows.length > 0) {
          university = rows[0];
          programs = await sql`
            SELECT * FROM programs WHERE university_id::text = ${cleanId} ORDER BY department ASC, name ASC
          `;
          notices = await sql`
            SELECT * FROM notices WHERE university_id::text = ${cleanId} OR university_id IS NULL ORDER BY created_at DESC LIMIT 5
          `;
        }
      } catch (neonErr) {
        console.warn('Neon university detail query error:', neonErr);
      }
    }

    if (!university) {
      const [uRes, pRes, nRes] = await Promise.all([
        supabase.from('universities').select('*').eq('id', cleanId).maybeSingle(),
        supabase.from('programs').select('*').eq('university_id', cleanId).order('name', { ascending: true }),
        supabase.from('notices').select('*').or(`university_id.eq.${cleanId},university_id.is.null`).order('created_at', { ascending: false }).limit(5)
      ]);

      university = uRes.data || null;
      programs = pRes.data || [];
      notices = nRes.data || [];
    }

    if (!university) {
      return NextResponse.json({ success: false, message: 'University not found.' }, { status: 404 });
    }

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
