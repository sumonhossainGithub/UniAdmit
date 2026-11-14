import { NextResponse } from 'next/server';
import { findUserByEmail, createUser, recordLogin } from '@/lib/data';
import { hashPassword, signSession, COOKIE_NAME } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { getNeonSql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, fullName, full_name, name, photoUrl, user_id } = body;

    const rawEmail = email;
    const rawFullName = fullName || full_name || name || 'Google User';

    if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(rawEmail).trim())) {
      return NextResponse.json({ success: false, message: 'Valid email address is required from Google.' }, { status: 400 });
    }

    const cleanEmail = String(rawEmail).trim().toLowerCase();
    const cleanFullName = String(rawFullName).trim();

    // 1. Check if user already exists
    let user = await findUserByEmail(cleanEmail);

    if (!user) {
      // Create new student account automatically
      const randomSecret = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const hashedPassword = await hashPassword(randomSecret);

      const newUser = await createUser({
        email: cleanEmail,
        password: hashedPassword,
        fullName: cleanFullName,
        role: 'student',
      });

      user = {
        id: String(newUser.id),
        email: cleanEmail,
        full_name: cleanFullName,
        fullName: cleanFullName,
        role: 'student',
        profile_completed: false
      };

      // Initialize student profile
      try {
        await supabase.from('student_profiles').upsert({
          user_id: String(user.id),
          nationality: 'Bangladeshi',
          photo_path: photoUrl || null,
          documents_verified: false
        }, { onConflict: 'user_id' });
      } catch (e) {
        console.warn('Google profile init error:', e);
      }

      const sql = getNeonSql();
      if (sql) {
        try {
          await sql`
            INSERT INTO student_profiles (user_id, nationality, photo_path, documents_verified)
            VALUES (${String(user.id)}, 'Bangladeshi', ${photoUrl || null}, false)
            ON CONFLICT (user_id) DO NOTHING
          `;
        } catch (e) {}
      }

      // Welcome Notification
      try {
        await supabase.from('notifications').insert({
          user_id: String(user.id),
          title: 'Welcome via Google to UniAdmit!',
          message: 'Your student account has been created via Google Sign-In. Complete your academic profile to start applying.',
          type: 'info'
        });
      } catch {}
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'browser';

    // Record login in Supabase login_history
    await recordLogin(String(user.id), cleanEmail, user.role || 'student', userAgent, ip, 'google_login_success');

    let redirectUrl = '/student/dashboard.html';
    if (user.role === 'admin') redirectUrl = '/admin/dashboard.html';
    else if (user.role === 'manager') redirectUrl = '/manager/dashboard.html';

    const sessionPayload = {
      id: String(user.id),
      email: user.email,
      fullName: user.full_name || user.fullName || cleanFullName,
      role: (user.role || 'student') as any,
    };

    const token = await signSession(sessionPayload);

    const response = NextResponse.json({
      success: true,
      message: 'Signed in with Google successfully!',
      token,
      user: {
        id: String(user.id),
        email: user.email,
        fullName: user.full_name || user.fullName || cleanFullName,
        full_name: user.full_name || user.fullName || cleanFullName,
        role: user.role || 'student',
        profile_completed: Boolean(user.profile_completed),
      },
      redirectUrl,
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
    console.error('Google Sign-In backend error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal error during Google Sign-In.' }, { status: 500 });
  }
}
