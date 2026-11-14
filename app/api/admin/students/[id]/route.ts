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

    let user: any = null;
    let profile: any = null;
    let applications: any[] = [];

    // 1. Try Neon if available
    const sql = getSql();
    if (sql) {
      try {
        const users = await sql`
          SELECT id, email, role, full_name, phone, profile_completed, created_at 
          FROM users 
          WHERE id::text = ${cleanId} OR email = ${cleanId}
          LIMIT 1
        `;

        if (users && users.length > 0) {
          user = users[0];
          const userIdStr = String(user.id);

          const profiles = await sql`
            SELECT * FROM student_profiles 
            WHERE user_id::text = ${userIdStr} 
            LIMIT 1
          `;
          if (profiles && profiles.length > 0) {
            profile = profiles[0];
          }

          applications = await sql`
            SELECT a.*, u.name AS university_name, u.short_name AS university_short_name, p.name AS program_name
            FROM applications a
            LEFT JOIN universities u ON a.university_id::text = u.id::text
            LEFT JOIN programs p ON a.program_id::text = p.id::text
            WHERE a.student_id::text = ${userIdStr}
            ORDER BY a.application_date DESC
          `;
        }
      } catch (neonErr) {
        console.warn('Neon student details fetch failed, falling back to Supabase:', neonErr);
      }
    }

    // 2. Fallback to Supabase
    if (!user) {
      // Query users in Supabase by ID or Email
      let { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', cleanId)
        .maybeSingle();

      if (!userData) {
        const { data: byEmail } = await supabase
          .from('users')
          .select('*')
          .ilike('email', cleanId)
          .maybeSingle();
        userData = byEmail;
      }

      if (!userData) {
        // Broad search across users in Supabase
        const { data: allUsers } = await supabase.from('users').select('*');
        if (allUsers) {
          userData = allUsers.find(u => String(u.id) === cleanId) || null;
        }
      }

      if (userData) {
        user = userData;
        const userIdStr = String(user.id);

        const [profRes, appsRes, unisRes, progsRes] = await Promise.all([
          supabase.from('student_profiles').select('*').eq('user_id', userIdStr).maybeSingle(),
          supabase.from('applications').select('*').eq('student_id', userIdStr).order('application_date', { ascending: false }),
          supabase.from('universities').select('id, name, short_name'),
          supabase.from('programs').select('id, name')
        ]);

        profile = profRes.data || {};
        const unisMap: Record<string, any> = Object.fromEntries((unisRes.data || []).map(u => [String(u.id), u]));
        const progsMap: Record<string, any> = Object.fromEntries((progsRes.data || []).map(p => [String(p.id), p]));

        applications = (appsRes.data || []).map((a: any) => {
          const u = unisMap[String(a.university_id)] || {};
          const p = progsMap[String(a.program_id)] || {};
          return {
            ...a,
            university_name: u.name || a.university_name || 'University',
            university_short_name: u.short_name || a.university_short_name || 'UNI',
            program_name: p.name || a.program_name || 'Program'
          };
        });
      }
    }

    if (!user) {
      return NextResponse.json({ success: false, message: 'Student not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      student: user,
      profile: profile || {},
      applications: applications || []
    });
  } catch (err: any) {
    console.error('Admin student details error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
