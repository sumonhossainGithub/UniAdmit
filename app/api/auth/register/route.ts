import { NextResponse } from 'next/server';
import { findUserByEmail, createUser, recordLogin } from '@/lib/data';
import { hashPassword, signSession, COOKIE_NAME } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { neon } from '@neondatabase/serverless';

const DEFAULT_DATABASE_URL = "postgresql://neondb_owner:npg_CX28zBtFYoUx@ep-wandering-leaf-bffq3q3n-pooler.c-5.us-west-2.aws.neon.tech/neondb?sslmode=require";

function getNeonSql() {
  const connectionString = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  if (connectionString && connectionString.startsWith('postgres')) {
    return neon(connectionString);
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const rawFullName = body.fullName || body.full_name || body.name;
    const rawEmail = body.email;
    const rawPassword = body.password;
    const rawPhone = body.phone;

    if (!rawFullName || String(rawFullName).trim().length < 2) {
      return NextResponse.json({
        success: false,
        message: 'Please enter your full name (at least 2 characters).'
      }, { status: 400 });
    }

    if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(rawEmail).trim())) {
      return NextResponse.json({
        success: false,
        message: 'Please provide a valid email address.'
      }, { status: 400 });
    }

    if (!rawPassword || String(rawPassword).length < 4) {
      return NextResponse.json({
        success: false,
        message: 'Password must be at least 4 characters long.'
      }, { status: 400 });
    }

    const cleanEmail = String(rawEmail).trim().toLowerCase();
    const cleanFullName = String(rawFullName).trim();
    const cleanPhone = rawPhone ? String(rawPhone).trim() : '';

    const existing = await findUserByEmail(cleanEmail);
    if (existing) {
      return NextResponse.json({
        success: false,
        message: 'An account with this email already exists.'
      }, { status: 409 });
    }

    const hashedPassword = await hashPassword(String(rawPassword));
    const newUser = await createUser({
      email: cleanEmail,
      password: hashedPassword,
      fullName: cleanFullName,
      phone: cleanPhone,
      role: 'student',
    });

    const newUserId = String(newUser.id);

    // Initialize student profile in Supabase & Neon
    try {
      await supabase.from('student_profiles').upsert({
        user_id: newUserId,
        nationality: 'Bangladeshi',
        documents_verified: false
      }, { onConflict: 'user_id' });
    } catch (e) {
      console.warn('Supabase profile init error:', e);
    }

    const sql = getNeonSql();
    if (sql) {
      try {
        await sql`
          INSERT INTO student_profiles (user_id, nationality, documents_verified)
          VALUES (${newUserId}, 'Bangladeshi', false)
          ON CONFLICT (user_id) DO NOTHING
        `;
      } catch (e) {
        console.warn('Neon profile init error:', e);
      }
    }

    // Welcome notification
    try {
      await supabase.from('notifications').insert({
        user_id: newUserId,
        title: 'Welcome to UniAdmit!',
        message: 'Your student account has been created. Complete your academic profile to unlock tailored recommendations and start applying.',
        type: 'info'
      });
    } catch {}

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'browser';
    await recordLogin(newUserId, cleanEmail, 'student', userAgent, ip, 'registered_and_logged_in');

    const sessionPayload = {
      id: newUserId,
      email: cleanEmail,
      fullName: cleanFullName,
      role: 'student' as const,
    };

    const token = await signSession(sessionPayload);

    const response = NextResponse.json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: newUserId,
        email: cleanEmail,
        fullName: cleanFullName,
        full_name: cleanFullName,
        role: 'student',
        profile_completed: false
      },
      redirectUrl: '/student/dashboard.html',
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error during registration.' }, { status: 500 });
  }
}
