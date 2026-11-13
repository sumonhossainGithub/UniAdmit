import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import path from 'path';
import { createId } from '@paralleldrive/cuid2';

async function seed() {
  console.log('🌱 Starting UniAdmit database seed...');

  const dbPath = path.join(process.cwd(), 'uniadmit.db');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // Drop existing legacy tables to ensure modern CUID2 schema
  db.exec(`
    DROP TABLE IF EXISTS merit_list;
    DROP TABLE IF EXISTS notifications;
    DROP TABLE IF EXISTS activity_log;
    DROP TABLE IF EXISTS applications;
    DROP TABLE IF EXISTS student_profiles;
    DROP TABLE IF EXISTS programs;
    DROP TABLE IF EXISTS universities;
    DROP TABLE IF EXISTS notices;
    DROP TABLE IF EXISTS users;
  `);

  // Create modern CUID2 enabled tables
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      profile_completed BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE student_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      father_name TEXT,
      mother_name TEXT,
      date_of_birth TEXT,
      gender TEXT,
      nationality TEXT DEFAULT 'Bangladeshi',
      nid_number TEXT,
      district TEXT,
      upazila TEXT,
      present_address TEXT,
      permanent_address TEXT,
      ssc_board TEXT,
      ssc_roll TEXT,
      ssc_year TEXT,
      ssc_gpa REAL,
      ssc_group TEXT,
      hsc_board TEXT,
      hsc_roll TEXT,
      hsc_year TEXT,
      hsc_gpa REAL,
      hsc_group TEXT,
      photo_path TEXT,
      signature_path TEXT,
      documents_verified BOOLEAN DEFAULT 0
    );

    CREATE TABLE universities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      short_name TEXT NOT NULL,
      location TEXT NOT NULL,
      district TEXT,
      type TEXT NOT NULL,
      website TEXT,
      description TEXT,
      logo_url TEXT,
      cover_image TEXT,
      min_gpa_ssc REAL DEFAULT 2.5,
      min_gpa_hsc REAL DEFAULT 2.5,
      application_fee REAL DEFAULT 500,
      admission_start TEXT,
      admission_end TEXT,
      circular_text TEXT,
      is_active BOOLEAN DEFAULT 1
    );

    CREATE TABLE programs (
      id TEXT PRIMARY KEY,
      university_id TEXT NOT NULL,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      seats INTEGER DEFAULT 60,
      required_group TEXT,
      min_gpa REAL DEFAULT 2.5,
      fee_per_semester REAL DEFAULT 45000
    );

    CREATE TABLE applications (
      id TEXT PRIMARY KEY,
      tracking_id TEXT UNIQUE NOT NULL,
      student_id TEXT NOT NULL,
      university_id TEXT NOT NULL,
      program_id TEXT NOT NULL,
      applicant_name TEXT NOT NULL,
      applicant_phone TEXT NOT NULL,
      applicant_email TEXT,
      status TEXT DEFAULT 'pending',
      payment_status TEXT DEFAULT 'unpaid',
      payment_amount REAL DEFAULT 500,
      payment_transaction_id TEXT,
      payment_date DATETIME,
      admit_card_generated BOOLEAN DEFAULT 0,
      assigned_id TEXT,
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE notices (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT DEFAULT 'General',
      university_id TEXT,
      created_by TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('Inserting Users...');
  const adminId = createId();
  const managerId = createId();
  const studentId1 = createId();
  const studentId2 = createId();

  const adminHash = bcrypt.hashSync('admin123', 10);
  const managerHash = bcrypt.hashSync('manager123', 10);
  const studentHash = bcrypt.hashSync('student123', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password, role, full_name, phone, profile_completed)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(adminId, 'admin@uniadmit.com', adminHash, 'admin', 'System Administrator', '+8801711000001', 1);
  insertUser.run(managerId, 'manager@uniadmit.com', managerHash, 'manager', 'KYAU Admission Manager', '+8801711000002', 1);
  insertUser.run(studentId1, 'student@uniadmit.com', studentHash, 'student', 'Morsaline & Husna', '01811223344', 1);
  insertUser.run(studentId2, 'tanvir@gmail.com', studentHash, 'student', 'Tanvir Ahmed', '01912345678', 1);

  // Student Profiles
  const insertProfile = db.prepare(`
    INSERT INTO student_profiles (
      id, user_id, father_name, mother_name, date_of_birth, gender, nationality, nid_number,
      district, upazila, present_address, permanent_address, ssc_board, ssc_roll, ssc_year,
      ssc_gpa, ssc_group, hsc_board, hsc_roll, hsc_year, hsc_gpa, hsc_group, documents_verified
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertProfile.run(
    createId(), studentId1, 'Md. Rafiqul Islam', 'Hosne Ara Begum', '2004-05-12', 'Female', 'Bangladeshi',
    '19951234567890', 'Sirajganj', 'Chauhali (Enayetpur / KYAU)', 'Enayetpur, Sirajganj', 'Enayetpur, Sirajganj',
    'Rajshahi', '458921', '2021', 5.0, 'Science', 'Rajshahi', '124982', '2023', 5.0, 'Science', 1
  );

  // Universities
  console.log('Inserting Universities...');
  const kyauId = createId();
  const duId = createId();
  const buetId = createId();
  const ruId = createId();

  const insertUni = db.prepare(`
    INSERT INTO universities (
      id, name, short_name, location, district, type, website, description,
      logo_url, cover_image, min_gpa_ssc, min_gpa_hsc, application_fee, admission_start, admission_end, circular_text
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertUni.run(
    kyauId,
    'Khwaja Yunus Ali University (KYAU)',
    'KYAU',
    'Enayetpur, Sirajganj, Bangladesh',
    'Sirajganj',
    'private',
    'https://kyau.edu.bd',
    'Khwaja Yunus Ali University is an exceptional higher education institution located on the scenic banks of Jamuna in Enayetpur, Sirajganj, recognized for top-notch engineering, medical, pharmacy, and science programs.',
    '/Logo.png',
    'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80',
    3.0, 3.0, 500, '2026-10-01', '2026-12-31',
    'KYAU Spring & Fall 2026-2027 Admission Circular: Apply online for CSE, EEE, Pharmacy, BBA, and English.'
  );

  insertUni.run(
    duId,
    'University of Dhaka',
    'DU',
    'Nilkhet, Dhaka-1000',
    'Dhaka',
    'public',
    'https://du.ac.bd',
    'The premier university of Bangladesh, established in 1921.',
    '/bd-govt-crest.svg',
    'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80',
    3.5, 3.5, 1000, '2026-11-01', '2026-12-15',
    'Undergraduate Admission 2026-2027: Science, Arts, Business Studies Units.'
  );

  insertUni.run(
    buetId,
    'Bangladesh University of Engineering and Technology',
    'BUET',
    'Palashi, Dhaka',
    'Dhaka',
    'public',
    'https://buet.ac.bd',
    'Leading engineering and architecture university of Bangladesh.',
    '/National_emblem_of_Bangladesh.svg',
    'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80',
    4.0, 4.0, 1200, '2026-11-10', '2026-12-20',
    'Undergraduate Engineering Admission Circular 2026-2027.'
  );

  insertUni.run(
    ruId,
    'University of Rajshahi',
    'RU',
    'Motihar, Rajshahi',
    'Rajshahi',
    'public',
    'https://ru.ac.bd',
    'Second largest public university of Bangladesh located in Rajshahi.',
    '/bd-govt-crest.svg',
    'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=1200&q=80',
    3.25, 3.25, 800, '2026-10-15', '2026-12-10',
    'Combined Admission Circular 2026-2027.'
  );

  // Programs
  console.log('Inserting Programs...');
  const insertProgram = db.prepare(`
    INSERT INTO programs (id, university_id, name, department, seats, required_group, min_gpa, fee_per_semester)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const pCseKyau = createId();
  const pEeeKyau = createId();
  const pPharmKyau = createId();
  const pBbaKyau = createId();
  const pEngKyau = createId();

  insertProgram.run(pCseKyau, kyauId, 'B.Sc in Computer Science & Engineering', 'CSE', 80, 'Science', 3.0, 52000);
  insertProgram.run(pEeeKyau, kyauId, 'B.Sc in Electrical & Electronic Engineering', 'EEE', 60, 'Science', 3.0, 48000);
  insertProgram.run(pPharmKyau, kyauId, 'Bachelor of Pharmacy (B.Pharm Professional)', 'Pharmacy', 60, 'Science', 3.5, 65000);
  insertProgram.run(pBbaKyau, kyauId, 'Bachelor of Business Administration', 'BBA', 50, 'Any', 2.75, 42000);
  insertProgram.run(pEngKyau, kyauId, 'B.A. (Hons) in English Literature', 'English', 40, 'Any', 2.5, 38000);

  insertProgram.run(createId(), duId, 'B.Sc in Computer Science & Engineering', 'CSE', 60, 'Science', 4.0, 15000);
  insertProgram.run(createId(), duId, 'BBA in Finance & Accounting', 'IBA / FBS', 120, 'Any', 3.75, 18000);
  insertProgram.run(createId(), buetId, 'B.Sc in Computer Science & Engineering', 'CSE', 120, 'Science', 5.0, 12000);

  // Applications
  console.log('Inserting Applications with instant tracking...');
  const insertApp = db.prepare(`
    INSERT INTO applications (
      id, tracking_id, student_id, university_id, program_id, applicant_name, applicant_phone,
      applicant_email, status, payment_status, payment_amount, payment_transaction_id, admit_card_generated, assigned_id, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertApp.run(
    createId(),
    'APP-2026-KYAU-1001',
    studentId1,
    kyauId,
    pCseKyau,
    'Morsaline & Husna',
    '01811223344',
    'student@uniadmit.com',
    'approved',
    'paid',
    500,
    'TRX-BKASH-982341A',
    1,
    'KYAU-CSE-2026-042',
    'Admitted into Merit List. Verified SSC & HSC GPA 5.00.'
  );

  insertApp.run(
    createId(),
    'APP-2026-KYAU-1002',
    studentId2,
    kyauId,
    pPharmKyau,
    'Tanvir Ahmed',
    '01912345678',
    'tanvir@gmail.com',
    'under_review',
    'paid',
    500,
    'TRX-NAGAD-551920B',
    0,
    null,
    'Documents under review by Admission Office.'
  );

  // Notices
  console.log('Inserting Notices...');
  const insertNotice = db.prepare(`
    INSERT INTO notices (id, title, content, category, university_id, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertNotice.run(
    createId(),
    'KYAU Spring 2026 Admission Circular Published',
    'Online application forms are invited from eligible candidates for admission into B.Sc. in CSE, EEE, Pharmacy, BBA, and English for the upcoming academic session at Khwaja Yunus Ali University.',
    'Circular',
    kyauId,
    adminId
  );

  insertNotice.run(
    createId(),
    'Special Scholarship on Tuition Fees based on SSC & HSC GPA',
    'Up to 100% tuition waiver is offered for students with Golden GPA 5.00 in both SSC & HSC at KYAU. Female students and siblings also receive a special waiver.',
    'Scholarship',
    kyauId,
    adminId
  );

  console.log('✅ Seeding completed successfully!');
  console.log('----------------------------------------------------');
  console.log('Demo Accounts:');
  console.log('  Admin:     admin@uniadmit.com     / admin123');
  console.log('  Manager:   manager@uniadmit.com   / manager123');
  console.log('  Student:   student@uniadmit.com   / student123');
  console.log('Instant Tracking IDs:');
  console.log('  APP-2026-KYAU-1001 (Approved & Paid)');
  console.log('  APP-2026-KYAU-1002 (Under Review)');
  console.log('  Or track by phone: 01811223344');
  console.log('----------------------------------------------------');
}

seed().catch(console.error);
