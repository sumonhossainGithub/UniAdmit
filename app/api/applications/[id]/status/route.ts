import { NextResponse } from 'next/server';
import { updateApplicationStatus, updatePaymentStatus } from '@/lib/data';
import { getSession } from '@/lib/auth';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'manager')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    if (body.status) {
      await updateApplicationStatus(id, body.status, body.remarks, body.assignedId);
    }

    if (body.paymentStatus) {
      await updatePaymentStatus(id, body.paymentStatus, body.transactionId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update status error:', error);
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
  }
}
