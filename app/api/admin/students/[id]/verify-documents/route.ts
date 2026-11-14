import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db';
import { supabase } from '@/lib/supabase';

function getSql() {
  return getNeonSql();
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cleanId = String(id).trim();
    const body = await req.json();
    const { verified = 1 } = body;
    const verifiedBool = Boolean(verified);

    // 1. Update Neon if available
    const sql = getSql();
    if (sql) {
      try {
        await sql`
          UPDATE student_profiles
          SET documents_verified = ${verifiedBool}
          WHERE user_id::text = ${cleanId}
        `;
      } catch (neonErr) {
        console.warn('Neon verify-documents update failed:', neonErr);
      }
    }

    // 2. Update Supabase
    try {
      await supabase
        .from('student_profiles')
        .update({ documents_verified: verifiedBool })
        .eq('user_id', cleanId);

      await supabase.from('notifications').insert({
        user_id: cleanId,
        title: verifiedBool ? 'Documents Verified' : 'Document Verification Notice',
        message: verifiedBool
          ? 'Your academic documents have been officially verified by UniAdmit Admissions Authority.'
          : 'Your documents require further review. Please check your uploaded files.',
        type: verifiedBool ? 'success' : 'warning'
      });
    } catch (supaErr) {
      console.warn('Supabase verify-documents update failed:', supaErr);
    }

    return NextResponse.json({
      success: true,
      message: `Documents successfully ${verifiedBool ? 'verified' : 'unverified'}.`
    });
  } catch (err: any) {
    console.error('Error verifying documents:', err);
    return NextResponse.json({ success: false, message: 'Failed to update verification status.' }, { status: 500 });
  }
}
