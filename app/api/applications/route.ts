import { NextResponse } from 'next/server';
import { getApplications, createApplication } from '@/lib/data';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await getSessionUser(req);
    const applications = await getApplications({
      studentId: session?.id || '3',
      role: session?.role || 'student',
    });

    return NextResponse.json({
      success: true,
      count: applications ? applications.length : 0,
      applications: applications || []
    });
  } catch (error: any) {
    console.error('Fetch applications error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionUser(req);
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
      message: 'Application submitted successfully! Please proceed to fee payment.',
      application: created,
      application_id: created.id,
      trackingId: created.trackingId,
      fee_amount: 500
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create application error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
