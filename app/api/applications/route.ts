import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getApplications, createApplication } from '@/lib/data';
import { getSession } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    const applications = await getApplications({
      studentId: session?.id,
      role: session?.role,
    });

    return NextResponse.json({
      success: true,
      applications: applications || []
    });
  } catch (error: any) {
    console.error('Fetch applications error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const body = await req.json();

    const created = await createApplication({
      universityId: body.universityId || body.university_id,
      programId: body.programId || body.program_id,
      applicantName: body.applicantName || body.applicant_name || session?.fullName || 'Applicant',
      applicantPhone: body.applicantPhone || body.applicant_phone || '+8801811223344',
      applicantEmail: body.applicantEmail || body.applicant_email || session?.email || 'student@uniadmit.com',
      paymentAmount: body.paymentAmount || body.payment_amount || 500,
      studentId: session?.id || '3',
    });

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      application: created,
      trackingId: created.trackingId,
    });
  } catch (error: any) {
    console.error('Create application error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
