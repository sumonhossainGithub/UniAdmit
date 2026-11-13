import { neon } from '@neondatabase/serverless';
import { createId } from '@paralleldrive/cuid2';

const DEFAULT_DATABASE_URL = "postgresql://neondb_owner:npg_CX28zBtFYoUx@ep-wandering-leaf-bffq3q3n-pooler.c-5.us-west-2.aws.neon.tech/neondb?sslmode=require";

function getNeonSql() {
  const connectionString = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  if (connectionString && connectionString.startsWith('postgres')) {
    return neon(connectionString);
  }
  return null;
}

export async function findUserByEmail(email: string) {
  const sql = getNeonSql();
  if (sql) {
    const rows = await sql`SELECT * FROM users WHERE LOWER(email) = LOWER(${email.trim()}) LIMIT 1`;
    return rows[0] || null;
  }
  return null;
}

export async function getStudentProfile(userId: string) {
  const sql = getNeonSql();
  if (sql) {
    const rows = await sql`SELECT * FROM student_profiles WHERE user_id = ${String(userId)} LIMIT 1`;
    return rows[0] || null;
  }
  return null;
}

export async function createUser(data: { email: string; password: string; fullName: string; phone?: string; role?: string }) {
  const id = createId();
  const sql = getNeonSql();
  if (sql) {
    await sql`
      INSERT INTO users (id, email, password, role, full_name, phone, profile_completed)
      VALUES (${id}, ${data.email.trim().toLowerCase()}, ${data.password}, ${data.role || 'student'}, ${data.fullName}, ${data.phone || ''}, true)
    `;
    return { id, email: data.email, fullName: data.fullName, role: data.role || 'student' };
  }
  return { id, email: data.email, fullName: data.fullName, role: data.role || 'student' };
}

export async function getUniversities() {
  const sql = getNeonSql();
  if (sql) {
    return (await sql`SELECT * FROM universities WHERE is_active = true ORDER BY name ASC`) as any[];
  }
  return [];
}

export async function getPrograms(universityId?: string) {
  const sql = getNeonSql();
  if (sql) {
    if (universityId) {
      return (await sql`
        SELECT p.*, u.name as university_name, u.short_name as university_short_name
        FROM programs p
        JOIN universities u ON p.university_id = u.id
        WHERE p.university_id = ${String(universityId)}
        ORDER BY p.name ASC
      `) as any[];
    }
    return (await sql`
      SELECT p.*, u.name as university_name, u.short_name as university_short_name
      FROM programs p
      JOIN universities u ON p.university_id = u.id
      ORDER BY p.name ASC
    `) as any[];
  }
  return [];
}

export async function getApplications(params?: { studentId?: string; role?: string }) {
  const sql = getNeonSql();
  if (sql) {
    if (params?.studentId && params.role === 'student') {
      return (await sql`
        SELECT a.*, u.name as university_name, u.short_name as university_short_name, p.name as program_name, p.department
        FROM applications a
        JOIN universities u ON a.university_id = u.id
        JOIN programs p ON a.program_id = p.id
        WHERE a.student_id = ${String(params.studentId)}
        ORDER BY a.created_at DESC
      `) as any[];
    }
    return (await sql`
      SELECT a.*, u.name as university_name, u.short_name as university_short_name, p.name as program_name, p.department
      FROM applications a
      JOIN universities u ON a.university_id = u.id
      JOIN programs p ON a.program_id = p.id
      ORDER BY a.created_at DESC
    `) as any[];
  }
  return [];
}

export async function trackApplication(query: string) {
  const trimmed = query.trim();
  const sql = getNeonSql();
  if (sql) {
    return (await sql`
      SELECT a.*, u.name as university_name, u.short_name as university_short_name, u.location as university_location,
             p.name as program_name, p.department
      FROM applications a
      JOIN universities u ON a.university_id = u.id
      JOIN programs p ON a.program_id = p.id
      WHERE a.tracking_id = ${trimmed} OR a.applicant_phone = ${trimmed} OR a.assigned_id = ${trimmed}
      ORDER BY a.created_at DESC
    `) as any[];
  }
  return [];
}

export async function createApplication(data: {
  studentId: string;
  universityId: string;
  programId: string;
  applicantName: string;
  applicantPhone: string;
  applicantEmail: string;
  paymentAmount?: number;
}) {
  const id = createId();
  const trackingNumber = Math.floor(1000 + Math.random() * 9000);
  const trackingId = `APP-2026-KYAU-${trackingNumber}`;

  const sql = getNeonSql();
  if (sql) {
    await sql`
      INSERT INTO applications (
        id, tracking_id, student_id, university_id, program_id, applicant_name,
        applicant_phone, applicant_email, status, payment_status, payment_amount
      ) VALUES (
        ${id}, ${trackingId}, ${String(data.studentId)}, ${String(data.universityId)}, ${String(data.programId)},
        ${data.applicantName}, ${data.applicantPhone}, ${data.applicantEmail}, 'pending', 'paid', ${data.paymentAmount || 500}
      )
    `;
    return { id, trackingId };
  }

  return { id, trackingId };
}

export async function updateApplicationStatus(id: string, status: string, remarks?: string, assignedId?: string) {
  const sql = getNeonSql();
  if (sql) {
    await sql`
      UPDATE applications
      SET status = ${status},
          remarks = COALESCE(${remarks || null}, remarks),
          assigned_id = COALESCE(${assignedId || null}, assigned_id),
          admit_card_generated = CASE WHEN ${status} = 'approved' THEN true ELSE admit_card_generated END
      WHERE id = ${String(id)} OR tracking_id = ${String(id)}
    `;
    return { success: true };
  }
  return { success: false };
}

export async function updatePaymentStatus(id: string, paymentStatus: string, transactionId?: string) {
  const sql = getNeonSql();
  if (sql) {
    await sql`
      UPDATE applications
      SET payment_status = ${paymentStatus},
          payment_transaction_id = COALESCE(${transactionId || null}, payment_transaction_id),
          payment_date = NOW()
      WHERE id = ${String(id)} OR tracking_id = ${String(id)}
    `;
    return { success: true };
  }
  return { success: false };
}

export async function getNotices() {
  const sql = getNeonSql();
  if (sql) {
    return (await sql`SELECT * FROM notices WHERE is_active = true ORDER BY created_at DESC`) as any[];
  }
  return [];
}
