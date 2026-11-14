import { NextResponse } from 'next/server';
import { getSession, verifySession } from '@/lib/auth';
import { findUserByEmail, getStudentProfile } from '@/lib/data';

export async function GET(req: Request) {
  try {
    let session = await getSession();

    // If cookie wasn't present, check Authorization header (e.g. Bearer token from localStorage)
    if (!session) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        session = await verifySession(token);
      }
    }

    if (!session) {
      return NextResponse.json({ success: false, authenticated: false, user: null }, { status: 401 });
    }

    const user = await findUserByEmail(session.email);
    if (!user) {
      return NextResponse.json({ success: false, authenticated: false, user: null }, { status: 404 });
    }

    let profile = {};
    if (user.role === 'student') {
      const studentProfile = await getStudentProfile(user.id);
      profile = studentProfile || {};
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: String(user.id),
        email: user.email,
        fullName: user.full_name || session.fullName,
        full_name: user.full_name || session.fullName,
        role: user.role,
        phone: user.phone,
        profile_completed: Boolean(user.profile_completed),
        profile,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
