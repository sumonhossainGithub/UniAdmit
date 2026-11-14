import { NextResponse } from 'next/server';
import { z } from 'zod';
import { findUserByEmail, createUser, recordLogin } from '@/lib/data';
import { hashPassword, signSession, COOKIE_NAME } from '@/lib/auth';

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(4),
  phone: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ success: false, message: 'Please check your input fields. Password must be at least 4 characters.' }, { status: 400 });
    }

    const { fullName, email, password, phone } = result.data;
    const cleanEmail = email.trim().toLowerCase();
    const existing = await findUserByEmail(cleanEmail);
    if (existing) {
      return NextResponse.json({ success: false, message: 'An account with this email already exists.' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);
    const newUser = await createUser({
      email: cleanEmail,
      password: hashedPassword,
      fullName,
      phone,
      role: 'student',
    });

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'browser';
    await recordLogin(String(newUser.id), cleanEmail, 'student', userAgent, ip, 'registered_and_logged_in');

    const sessionPayload = {
      id: String(newUser.id),
      email: newUser.email,
      fullName: newUser.fullName,
      role: 'student' as any,
    };

    const token = await signSession(sessionPayload);

    const response = NextResponse.json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: sessionPayload,
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
