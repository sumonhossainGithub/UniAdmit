import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { createId } from '@paralleldrive/cuid2';

function getSql() {
  return getNeonSql();
}

export async function GET() {
  try {
    let managers: any[] = [];
    const sql = getSql();

    if (sql) {
      try {
        managers = await sql`
          SELECT id, email, full_name, phone, created_at, profile_completed AS is_active
          FROM users
          WHERE role = 'manager'
          ORDER BY created_at DESC
        `;
      } catch (neonErr) {
        console.warn('Neon managers query failed, using Supabase fallback:', neonErr);
      }
    }

    if (!managers || managers.length === 0) {
      const { data } = await supabase
        .from('users')
        .select('id, email, full_name, phone, created_at, profile_completed')
        .eq('role', 'manager')
        .order('created_at', { ascending: false });

      managers = (data || []).map(m => ({
        ...m,
        is_active: m.profile_completed
      }));
    }

    return NextResponse.json({
      success: true,
      count: managers.length,
      managers
    });
  } catch (err: any) {
    console.error('Error listing managers:', err);
    return NextResponse.json({ success: true, count: 0, managers: [] });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, full_name, phone } = body;

    if (!email || !password || !full_name) {
      return NextResponse.json({ success: false, message: 'Email, password, and full name are required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = full_name.trim();
    const cleanPhone = phone ? phone.trim() : null;
    const hashed = await hashPassword(password);
    const newId = createId();

    const sql = getSql();
    if (sql) {
      try {
        const existing = await sql`SELECT id FROM users WHERE LOWER(email) = ${cleanEmail} LIMIT 1`;
        if (existing.length > 0) {
          return NextResponse.json({ success: false, message: 'User with this email already exists.' }, { status: 400 });
        }

        const [manager] = await sql`
          INSERT INTO users (id, email, password, role, full_name, phone, profile_completed, created_at)
          VALUES (${newId}, ${cleanEmail}, ${hashed}, 'manager', ${cleanName}, ${cleanPhone}, true, NOW())
          RETURNING id, email, full_name, role
        `;

        try {
          await supabase.from('users').upsert({
            id: newId,
            email: cleanEmail,
            password: hashed,
            role: 'manager',
            full_name: cleanName,
            phone: cleanPhone,
            profile_completed: true,
            created_at: new Date().toISOString()
          });
        } catch (e) {}

        return NextResponse.json({
          success: true,
          message: 'Admission Manager created successfully.',
          manager
        });
      } catch (neonErr) {
        console.warn('Neon manager create failed, trying Supabase:', neonErr);
      }
    }

    // Supabase fallback
    const { data: existingUser } = await supabase.from('users').select('id').eq('email', cleanEmail).maybeSingle();
    if (existingUser) {
      return NextResponse.json({ success: false, message: 'User with this email already exists.' }, { status: 400 });
    }

    await supabase.from('users').insert({
      id: newId,
      email: cleanEmail,
      password: hashed,
      role: 'manager',
      full_name: cleanName,
      phone: cleanPhone,
      profile_completed: true,
      created_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Admission Manager created successfully.',
      manager: {
        id: newId,
        email: cleanEmail,
        full_name: cleanName,
        role: 'manager'
      }
    });
  } catch (err: any) {
    console.error('Error creating manager:', err);
    return NextResponse.json({ success: false, message: err.message || 'Internal server error' }, { status: 500 });
  }
}
