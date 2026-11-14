import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';
import { supabase } from '@/lib/supabase';

function getSql() {
  return getNeonSql();
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cleanId = String(id).trim();
    const body = await req.json();
    let { assigned_id } = body;

    let appRecord: any = null;

    // 1. Try Neon
    const sql = getSql();
    if (sql) {
      try {
        const rows = await sql`
          SELECT a.*, u.short_name, u.name AS university_name, p.name AS program_name
          FROM applications a
          LEFT JOIN universities u ON a.university_id::text = u.id::text
          LEFT JOIN programs p ON a.program_id::text = p.id::text
          WHERE a.id::text = ${cleanId}
          LIMIT 1
        `;
        if (rows && rows.length > 0) {
          appRecord = rows[0];
        }
      } catch (neonErr) {
        console.warn('Neon assign-id lookup failed:', neonErr);
      }
    }

    // 2. Fallback to Supabase
    if (!appRecord) {
      const { data: supaApp } = await supabase
        .from('applications')
        .select('*')
        .eq('id', cleanId)
        .maybeSingle();

      if (supaApp) {
        const [uniRes, progRes] = await Promise.all([
          supabase.from('universities').select('name, short_name').eq('id', String(supaApp.university_id)).maybeSingle(),
          supabase.from('programs').select('name').eq('id', String(supaApp.program_id)).maybeSingle()
        ]);
        appRecord = {
          ...supaApp,
          short_name: uniRes.data?.short_name || 'UNI',
          university_name: uniRes.data?.name || 'University',
          program_name: progRes.data?.name || 'Program'
        };
      }
    }

    if (!appRecord) {
      return NextResponse.json({ success: false, message: 'Application not found.' }, { status: 404 });
    }

    if (!assigned_id || !assigned_id.trim()) {
      const shortCode = appRecord.short_name || 'UNI';
      assigned_id = `${shortCode}-2026-${cleanId.padStart(5, '0')}`;
    } else {
      assigned_id = assigned_id.trim();
    }

    // Update Neon if available
    if (sql) {
      try {
        await sql`
          UPDATE applications
          SET assigned_id = ${assigned_id},
              admit_card_generated = true
          WHERE id::text = ${cleanId}
        `;
      } catch (neonUpdateErr) {
        console.warn('Neon assign-id update failed:', neonUpdateErr);
      }
    }

    // Update Supabase
    try {
      await supabase.from('applications').update({
        assigned_id: assigned_id,
        admit_card_generated: true
      }).eq('id', cleanId);

      await supabase.from('notifications').insert({
        user_id: String(appRecord.student_id),
        title: 'Roll Number Assigned & Admit Card Ready',
        message: `You have been assigned Student Roll ID: ${assigned_id} for ${appRecord.program_name}. You can now view and print your Admit Card.`,
        type: 'success'
      });
    } catch (supaErr) {
      console.warn('Supabase assign-id update failed:', supaErr);
    }

    return NextResponse.json({
      success: true,
      message: `Assigned ID ${assigned_id} successfully. Admit card is now active.`,
      assigned_id: assigned_id
    });
  } catch (err: any) {
    console.error('Error assigning ID:', err);
    return NextResponse.json({ success: false, message: 'Failed to assign Student ID.' }, { status: 500 });
  }
}
