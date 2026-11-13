import { NextResponse } from 'next/server';
import { z } from 'zod';
import { findUserByEmail } from '@/lib/data';
import { verifyPassword, signSession, COOKIE_NAME } from '@/lib/auth';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
  role: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ success: false, error: 'Invalid email or password format' }, { status: 400 });
    }

    const { email, password, role } = result.data;
    const user = await findUserByEmail(email);

    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    // Role check if provided
    if (role && user.role !== role) {
      const userRoleCap = user.role.charAt(0).toUpperCase() + user.role.slice(1);
      const reqRoleCap = role.charAt(0).toUpperCase() + role.slice(1);
      return NextResponse.json({
        success: false,
        error: `Role mismatch: This account belongs to a ${userRoleCap}, but you are logging in under the ${reqRoleCap} tab.`
      }, { status: 403 });
    }

    let redirectUrl = '/student/dashboard';
    if (user.role === 'admin') redirectUrl = '/admin/dashboard';
    else if (user.role === 'manager') redirectUrl = '/manager/dashboard';

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
        fullName: user.full_name,
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
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
