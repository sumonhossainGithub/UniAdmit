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
    const [userCount] = await sql`SELECT COUNT(*) as c FROM users WHERE role = 'student'`;
    const [managerCount] = await sql`SELECT COUNT(*) as c FROM users WHERE role = 'manager'`;
    const [uniCount] = await sql`SELECT COUNT(*) as c FROM universities WHERE is_active = true`;
    const [progCount] = await sql`SELECT COUNT(*) as c FROM programs`;
    const [appCount] = await sql`SELECT COUNT(*) as c FROM applications`;
    const [approvedCount] = await sql`SELECT COUNT(*) as c FROM applications WHERE status = 'approved'`;
    const [paidCount] = await sql`SELECT COUNT(*) as c FROM applications WHERE payment_status = 'paid' OR payment_status = 'verified'`;

    return NextResponse.json({
      success: true,
      stats: {
        totalStudents: Number(userCount.c),
        totalManagers: Number(managerCount.c),
        totalUniversities: Number(uniCount.c),
        totalPrograms: Number(progCount.c),
        totalApplications: Number(appCount.c),
        approvedApplications: Number(approvedCount.c),
        paidApplications: Number(paidCount.c),
        totalRevenue: Number(paidCount.c) * 500
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
