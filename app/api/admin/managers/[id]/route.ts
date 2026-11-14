import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

function getSql() {
  return getNeonSql();
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cleanId = String(id).trim();
    const body = await req.json();
    const { full_name, phone, password, is_active } = body;

    const sql = getSql();

    let hashed: string | null = null;
    if (password && password.trim()) {
      hashed = await hashPassword(password.trim());
    }

    const activeBool = is_active !== undefined ? Boolean(is_active) : undefined;

    if (sql) {
      try {
        if (hashed) {
          await sql`
            UPDATE users
            SET full_name = COALESCE(${full_name ? full_name.trim() : null}, full_name),
                phone = COALESCE(${phone ? phone.trim() : null}, phone),
                password = ${hashed},
                profile_completed = COALESCE(${activeBool ?? null}, profile_completed)
            WHERE id::text = ${cleanId}
          `;
        } else {
          await sql`
            UPDATE users
            SET full_name = COALESCE(${full_name ? full_name.trim() : null}, full_name),
                phone = COALESCE(${phone ? phone.trim() : null}, phone),
                profile_completed = COALESCE(${activeBool ?? null}, profile_completed)
            WHERE id::text = ${cleanId}
          `;
        }
      } catch (neonErr) {
        console.warn('Neon manager update failed:', neonErr);
      }
    }

    try {
      const updateData: any = {};
      if (full_name) updateData.full_name = full_name.trim();
      if (phone) updateData.phone = phone.trim();
      if (hashed) updateData.password = hashed;
      if (activeBool !== undefined) updateData.profile_completed = activeBool;
      if (Object.keys(updateData).length > 0) {
        await supabase.from('users').update(updateData).eq('id', cleanId);
      }
    } catch (supaErr) {
      console.warn('Supabase manager update failed:', supaErr);
    }

    return NextResponse.json({ success: true, message: 'Manager updated successfully.' });
  } catch (err: any) {
    console.error('Error updating manager:', err);
    return NextResponse.json({ success: false, message: 'Failed to update manager.' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cleanId = String(id).trim();
    const sql = getSql();

    if (sql) {
      try {
        await sql`UPDATE users SET profile_completed = false WHERE id::text = ${cleanId}`;
      } catch (neonErr) {
        console.warn('Neon manager deactivate failed:', neonErr);
      }
    }

    try {
      await supabase.from('users').update({ profile_completed: false }).eq('id', cleanId);
    } catch (supaErr) {
      console.warn('Supabase manager deactivate failed:', supaErr);
    }

    return NextResponse.json({ success: true, message: 'Manager deactivated successfully.' });
  } catch (err: any) {
    console.error('Error deactivating manager:', err);
    return NextResponse.json({ success: false, message: 'Failed to deactivate manager.' }, { status: 500 });
  }
}
