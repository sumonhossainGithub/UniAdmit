import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getApplications, createApplication } from '@/lib/data';
import { getSession } from '@/lib/auth';

const appSchema = z.object({
  universityId: z.string().min(1),
  programId: z.string().min(1),
  applicantName: z.string().min(2),
  applicantPhone: z.string().min(10),
  applicantEmail: z.string().email(),
  paymentAmount: z.number().optional(),
});

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const applications = await getApplications({
      studentId: session.id,
      role: session.role,
    });

    return NextResponse.json({ applications });
  } catch (error: any) {
    console.error('Fetch applications error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const result = appSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid application data' }, { status: 400 });
    }

    const created = await createApplication({
      ...result.data,
      studentId: session.id,
    });

    return NextResponse.json({ success: true, application: created }, { status: 201 });
  } catch (error: any) {
    console.error('Create application error:', error);
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 });
  }
}
