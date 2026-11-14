import { NextResponse } from 'next/server';
import { z } from 'zod';
import { findUserByEmail, recordLogin } from '@/lib/data';
import { verifyPassword, signSession, COOKIE_NAME } from '@/lib/auth';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ success: false, message: 'Invalid email or password format' }, { status: 400 });
    }

    const { email, password, role } = result.data;
    const cleanEmail = email.trim().toLowerCase();
    const user = await findUserByEmail(cleanEmail);

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'browser';

    if (!user) {
      await recordLogin('unknown', cleanEmail, role || 'unknown', userAgent, ip, 'failed_user_not_found');
      return NextResponse.json({ success: false, message: 'Invalid email or password.' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      await recordLogin(String(user.id), cleanEmail, user.role, userAgent, ip, 'failed_wrong_password');
      return NextResponse.json({ success: false, message: 'Invalid email or password.' }, { status: 401 });
    }

    // Role check if provided
    if (role && user.role !== role) {
      const userRoleCap = user.role.charAt(0).toUpperCase() + user.role.slice(1);
      const reqRoleCap = role.charAt(0).toUpperCase() + role.slice(1);
      await recordLogin(String(user.id), cleanEmail, user.role, userAgent, ip, 'failed_role_mismatch');
      return NextResponse.json({
        success: false,
        message: `Role mismatch: This account belongs to a ${userRoleCap}, but you are logging in under the ${reqRoleCap} tab. Please select the ${userRoleCap} tab to login.`
      }, { status: 403 });
    }

    // Record SUCCESSFUL login in Supabase!
    await recordLogin(String(user.id), cleanEmail, user.role, userAgent, ip, 'success');

    let redirectUrl = '/student/dashboard.html';
    if (user.role === 'admin') redirectUrl = '/admin/dashboard.html';
    else if (user.role === 'manager') redirectUrl = '/manager/dashboard.html';

    const sessionPayload = {
      id: String(user.id),
      email: user.email,
      fullName: user.full_name || user.fullName,
      role: user.role,
    };

    const token = await signSession(sessionPayload as any);

    const response = NextResponse.json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: String(user.id),
        email: user.email,
        fullName: user.full_name || user.fullName,
        full_name: user.full_name || user.fullName,
        role: user.role,
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
    console.error('Login error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error during login.' }, { status: 500 });
  }
}
