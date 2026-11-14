import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { hashPassword } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { createId } from '@paralleldrive/cuid2';

const DEFAULT_DATABASE_URL = "postgresql://neondb_owner:npg_CX28zBtFYoUx@ep-wandering-leaf-bffq3q3n-pooler.c-5.us-west-2.aws.neon.tech/neondb?sslmode=require";

function getSql() {
  const connectionString = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  return neon(connectionString);
}

export async function GET() {
  try {
    const sql = getSql();

    const managers = await sql`
      SELECT id, email, full_name, phone, created_at, profile_completed AS is_active
      FROM users
      WHERE role = 'manager'
      ORDER BY created_at DESC
    `;

    return NextResponse.json({
      success: true,
      count: managers.length,
      managers
    });
  } catch (err: any) {
    console.error('Error listing managers:', err);
    return NextResponse.json({ success: false, message: 'Failed to retrieve managers.' }, { status: 500 });
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
    const sql = getSql();

    const existing = await sql`SELECT id FROM users WHERE LOWER(email) = ${cleanEmail} LIMIT 1`;
    if (existing.length > 0) {
      return NextResponse.json({ success: false, message: 'User with this email already exists.' }, { status: 400 });
    }

    const hashed = await hashPassword(password);
    const newId = createId();

    const [manager] = await sql`
      INSERT INTO users (id, email, password, role, full_name, phone, profile_completed, created_at)
      VALUES (${newId}, ${cleanEmail}, ${hashed}, 'manager', ${full_name.trim()}, ${phone ? phone.trim() : null}, true, NOW())
      RETURNING id, email, full_name, role
    `;

    try {
      await supabase.from('users').insert({
        id: newId,
        email: cleanEmail,
        password: hashed,
        role: 'manager',
        full_name: full_name.trim(),
        phone: phone ? phone.trim() : null,
        profile_completed: true
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Manager account created successfully!',
      manager
    }, { status: 201 });
  } catch (err: any) {
    console.error('Error creating manager:', err);
    return NextResponse.json({ success: false, message: 'Failed to create manager.' }, { status: 500 });
  }
}
