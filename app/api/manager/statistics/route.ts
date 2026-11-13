import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const DEFAULT_DATABASE_URL = "postgresql://neondb_owner:npg_CX28zBtFYoUx@ep-wandering-leaf-bffq3q3n-pooler.c-5.us-west-2.aws.neon.tech/neondb?sslmode=require";

function getSql() {
  const connectionString = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  return neon(connectionString);
}

export async function GET() {
  try {
    const sql = getSql();
    const [appCount] = await sql`SELECT COUNT(*) as c FROM applications`;
    const [underReview] = await sql`SELECT COUNT(*) as c FROM applications WHERE status = 'under_review'`;
    const [approved] = await sql`SELECT COUNT(*) as c FROM applications WHERE status = 'approved'`;
    const [paid] = await sql`SELECT COUNT(*) as c FROM applications WHERE payment_status = 'paid' OR payment_status = 'verified'`;

    return NextResponse.json({
      success: true,
      statistics: {
        totalApplications: Number(appCount.c),
        underReview: Number(underReview.c),
        approved: Number(approved.c),
        paidCount: Number(paid.c),
        verificationRate: '100%'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
