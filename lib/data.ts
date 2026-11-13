import { neon } from '@neondatabase/serverless';
import { createId } from '@paralleldrive/cuid2';

function getNeonSql() {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString && connectionString.startsWith('postgres')) {
    return neon(connectionString);
  }
  return null;
}

function getSqlite() {
  // Dynamic require so better-sqlite3 is not bundled into Vercel Serverless environment
  const Database = require('better-sqlite3');
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'uniadmit.db');
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  return sqlite;
}

export async function findUserByEmail(email: string) {
  const sql = getNeonSql();
  if (sql) {
    const rows = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
    return rows[0] || null;
  }
  const db = getSqlite();
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
}

export async function createUser(data: { email: string; password: string; fullName: string; phone?: string; role?: string }) {
  const id = createId();
  const sql = getNeonSql();
  if (sql) {
    await sql`
      INSERT INTO users (id, email, password, role, full_name, phone, profile_completed)
      VALUES (${id}, ${data.email}, ${data.password}, ${data.role || 'student'}, ${data.fullName}, ${data.phone || ''}, true)
    `;
    return { id, email: data.email, fullName: data.fullName, role: data.role || 'student' };
  }
  const db = getSqlite();
  db.prepare(`
    INSERT INTO users (id, email, password, role, full_name, phone, profile_completed)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.email, data.password, data.role || 'student', data.fullName, data.phone || '', 1);
  return { id, email: data.email, fullName: data.fullName, role: data.role || 'student' };
}

export async function getUniversities() {
  const sql = getNeonSql();
  if (sql) {
    return (await sql`SELECT * FROM universities WHERE is_active = true ORDER BY name ASC`) as any[];
  }
  const db = getSqlite();
  return db.prepare('SELECT * FROM universities WHERE is_active = 1 ORDER BY name ASC').all() as any[];
}

export async function getPrograms(universityId?: string) {
  const sql = getNeonSql();
  if (sql) {
    if (universityId) {
      return (await sql`
        SELECT p.*, u.name as university_name, u.short_name as university_short_name
        FROM programs p
        JOIN universities u ON p.university_id = u.id
        WHERE p.university_id = ${universityId}
      `) as any[];
    }
    return (await sql`
      SELECT p.*, u.name as university_name, u.short_name as university_short_name
      FROM programs p
      JOIN universities u ON p.university_id = u.id
      ORDER BY p.name ASC
    `) as any[];
  }
  const db = getSqlite();
  if (universityId) {
    return db.prepare(`
      SELECT p.*, u.name as university_name, u.short_name as university_short_name
      FROM programs p
      JOIN universities u ON p.university_id = u.id
      WHERE p.university_id = ?
    `).all(universityId) as any[];
  }
  return db.prepare(`
    SELECT p.*, u.name as university_name, u.short_name as university_short_name
    FROM programs p
    JOIN universities u ON p.university_id = u.id
    ORDER BY p.name ASC
  `).all() as any[];
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
        WHERE a.student_id = ${params.studentId}
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
  const db = getSqlite();
  if (params?.studentId && params.role === 'student') {
    return db.prepare(`
      SELECT a.*, u.name as university_name, u.short_name as university_short_name, p.name as program_name, p.department
      FROM applications a
      JOIN universities u ON a.university_id = u.id
      JOIN programs p ON a.program_id = p.id
      WHERE a.student_id = ?
      ORDER BY a.created_at DESC
    `).all(params.studentId) as any[];
  }
  return db.prepare(`
    SELECT a.*, u.name as university_name, u.short_name as university_short_name, p.name as program_name, p.department
    FROM applications a
    JOIN universities u ON a.university_id = u.id
    JOIN programs p ON a.program_id = p.id
    ORDER BY a.created_at DESC
  `).all() as any[];
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
      WHERE a.tracking_id = ${trimmed} OR a.applicant_phone = ${trimmed}
      ORDER BY a.created_at DESC
    `) as any[];
  }
  const db = getSqlite();
  return db.prepare(`
    SELECT a.*, u.name as university_name, u.short_name as university_short_name, u.location as university_location,
           p.name as program_name, p.department
    FROM applications a
    JOIN universities u ON a.university_id = u.id
    JOIN programs p ON a.program_id = p.id
    WHERE a.tracking_id = ? OR a.applicant_phone = ?
    ORDER BY a.created_at DESC
  `).all(trimmed, trimmed) as any[];
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
        ${id}, ${trackingId}, ${data.studentId}, ${data.universityId}, ${data.programId},
        ${data.applicantName}, ${data.applicantPhone}, ${data.applicantEmail}, 'pending', 'paid', ${data.paymentAmount || 500}
      )
    `;
    return { id, trackingId };
  }

  const db = getSqlite();
  db.prepare(`
    INSERT INTO applications (
      id, tracking_id, student_id, university_id, program_id, applicant_name,
      applicant_phone, applicant_email, status, payment_status, payment_amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'paid', ?)
  `).run(
    id,
    trackingId,
    data.studentId,
    data.universityId,
    data.programId,
    data.applicantName,
    data.applicantPhone,
    data.applicantEmail,
    data.paymentAmount || 500
  );

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
      WHERE id = ${id} OR tracking_id = ${id}
    `;
    return { success: true };
  }

  const db = getSqlite();
  db.prepare(`
    UPDATE applications
    SET status = ?, remarks = COALESCE(?, remarks), assigned_id = COALESCE(?, assigned_id),
        admit_card_generated = CASE WHEN ? = 'approved' THEN 1 ELSE admit_card_generated END
    WHERE id = ? OR tracking_id = ?
  `).run(status, remarks || null, assignedId || null, status, id, id);
  return { success: true };
}

export async function updatePaymentStatus(id: string, paymentStatus: string, transactionId?: string) {
  const sql = getNeonSql();
  if (sql) {
    await sql`
      UPDATE applications
      SET payment_status = ${paymentStatus},
          payment_transaction_id = COALESCE(${transactionId || null}, payment_transaction_id),
          payment_date = NOW()
      WHERE id = ${id} OR tracking_id = ${id}
    `;
    return { success: true };
  }

  const db = getSqlite();
  db.prepare(`
    UPDATE applications
    SET payment_status = ?, payment_transaction_id = COALESCE(?, payment_transaction_id), payment_date = CURRENT_TIMESTAMP
    WHERE id = ? OR tracking_id = ?
  `).run(paymentStatus, transactionId || null, id, id);
  return { success: true };
}

export async function getNotices() {
  const sql = getNeonSql();
  if (sql) {
    return (await sql`SELECT * FROM notices WHERE is_active = true ORDER BY created_at DESC`) as any[];
  }
  const db = getSqlite();
  return db.prepare('SELECT * FROM notices WHERE is_active = 1 ORDER BY created_at DESC').all() as any[];
}
