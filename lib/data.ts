import { neon } from '@neondatabase/serverless';
import { createId } from '@paralleldrive/cuid2';
import { supabase } from './supabase';

const DEFAULT_DATABASE_URL = "postgresql://neondb_owner:npg_CX28zBtFYoUx@ep-wandering-leaf-bffq3q3n-pooler.c-5.us-west-2.aws.neon.tech/neondb?sslmode=require";

function getNeonSql() {
  const connectionString = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  if (connectionString && connectionString.startsWith('postgres')) {
    return neon(connectionString);
  }
  return null;
}

export async function recordLogin(userId: string, email: string, role: string, userAgent?: string, ip?: string, status: string = 'success') {
  try {
    await supabase.from('login_history').insert({
      user_id: userId,
      email,
      role,
      user_agent: userAgent || 'browser',
      ip_address: ip || '127.0.0.1',
      status,
      login_at: new Date().toISOString()
    });
  } catch (e) {
    console.warn('Record login to Supabase error:', e);
  }
}

export async function findUserByEmail(email: string) {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Check Supabase first
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', cleanEmail)
      .limit(1)
      .maybeSingle();

    if (data && !error) {
      return data;
    }
  } catch (e) {
    console.warn('Supabase findUser error, checking Neon:', e);
  }

  // 2. Fallback to Neon
  const sql = getNeonSql();
  if (sql) {
    const rows = await sql`SELECT * FROM users WHERE LOWER(email) = LOWER(${cleanEmail}) LIMIT 1`;
    return rows[0] || null;
  }
  return null;
}

export async function getStudentProfile(userId: string) {
  // 1. Check Supabase
  try {
    const { data } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('user_id', String(userId))
      .limit(1)
      .maybeSingle();

    if (data) return data;
  } catch (e) {}

  // 2. Check Neon
  const sql = getNeonSql();
  if (sql) {
    const rows = await sql`SELECT * FROM student_profiles WHERE user_id = ${String(userId)} LIMIT 1`;
    return rows[0] || null;
  }
  return null;
}

export async function createUser(data: { email: string; password: string; fullName: string; phone?: string; role?: string }) {
  const id = createId();
  const cleanEmail = data.email.trim().toLowerCase();
  const userData = {
    id,
    email: cleanEmail,
    password: data.password,
    role: data.role || 'student',
    full_name: data.fullName,
    phone: data.phone || '',
    profile_completed: true,
  };

  // 1. Store in Supabase
  try {
    await supabase.from('users').insert(userData);
  } catch (e) {
    console.warn('Supabase createUser error:', e);
  }

  // 2. Store in Neon
  const sql = getNeonSql();
  if (sql) {
    try {
      await sql`
        INSERT INTO users (id, email, password, role, full_name, phone, profile_completed)
        VALUES (${id}, ${cleanEmail}, ${data.password}, ${data.role || 'student'}, ${data.fullName}, ${data.phone || ''}, true)
      `;
    } catch (e) {
      console.warn('Neon createUser error:', e);
    }
  }

  return { id, email: cleanEmail, fullName: data.fullName, role: data.role || 'student' };
}

export async function getUniversities() {
  try {
    const { data } = await supabase.from('universities').select('*').eq('is_active', true).order('name', { ascending: true });
    if (data && data.length > 0) return data;
  } catch (e) {}

  const sql = getNeonSql();
  if (sql) {
    return (await sql`SELECT * FROM universities WHERE is_active = true ORDER BY name ASC`) as any[];
  }
  return [];
}

export async function getPrograms(universityId?: string) {
  try {
    let query = supabase.from('programs').select('*, universities(name, short_name)');
    if (universityId) query = query.eq('university_id', String(universityId));
    const { data } = await query.order('name', { ascending: true });
    if (data && data.length > 0) {
      return data.map((p: any) => ({
        ...p,
        university_name: p.universities?.name || '',
        university_short_name: p.universities?.short_name || ''
      }));
    }
  } catch (e) {}

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

  // Supabase
  try {
    await supabase.from('applications').insert({
      id,
      tracking_id: trackingId,
      student_id: String(data.studentId),
      university_id: String(data.universityId),
      program_id: String(data.programId),
      applicant_name: data.applicantName,
      applicant_phone: data.applicantPhone,
      applicant_email: data.applicantEmail,
      status: 'pending',
      payment_status: 'paid',
      payment_amount: data.paymentAmount || 500,
    });
  } catch (e) {}

  // Neon
  const sql = getNeonSql();
  if (sql) {
    try {
      await sql`
        INSERT INTO applications (
          id, tracking_id, student_id, university_id, program_id, applicant_name,
          applicant_phone, applicant_email, status, payment_status, payment_amount
        ) VALUES (
          ${id}, ${trackingId}, ${String(data.studentId)}, ${String(data.universityId)}, ${String(data.programId)},
          ${data.applicantName}, ${data.applicantPhone}, ${data.applicantEmail}, 'pending', 'paid', ${data.paymentAmount || 500}
        )
      `;
    } catch (e) {}
  }

  return { id, trackingId };
}

export async function updateApplicationStatus(id: string, status: string, remarks?: string, assignedId?: string) {
  try {
    await supabase.from('applications').update({
      status,
      remarks,
      assigned_id: assignedId,
      admit_card_generated: status === 'approved'
    }).eq('id', String(id));
  } catch (e) {}

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
  try {
    await supabase.from('applications').update({
      payment_status: paymentStatus,
      payment_transaction_id: transactionId,
      payment_date: new Date().toISOString()
    }).eq('id', String(id));
  } catch (e) {}

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
  try {
    const { data } = await supabase.from('notices').select('*').eq('is_active', true).order('created_at', { ascending: false });
    if (data && data.length > 0) return data;
  } catch (e) {}

  const sql = getNeonSql();
  if (sql) {
    return (await sql`SELECT * FROM notices WHERE is_active = true ORDER BY created_at DESC`) as any[];
  }
  return [];
}
