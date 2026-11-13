const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'uniadmit.db');
const db = new Database(DB_PATH);

// Enable foreign keys and WAL mode for better concurrency
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

function initDatabase() {
  db.exec(`
    -- Users Table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'admin', 'manager')),
      full_name TEXT NOT NULL,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      profile_completed BOOLEAN DEFAULT 0
    );

    -- Student Profiles Table
    CREATE TABLE IF NOT EXISTS student_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      father_name TEXT,
      mother_name TEXT,
      date_of_birth TEXT,
      gender TEXT,
      nationality TEXT DEFAULT 'Bangladeshi',
      nid_number TEXT,
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
      documents_verified BOOLEAN DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Universities Table
    CREATE TABLE IF NOT EXISTS universities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      short_name TEXT NOT NULL,
      location TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('public', 'private')),
      website TEXT,
      description TEXT,
      logo_url TEXT,
      cover_image TEXT,
      min_gpa_ssc REAL DEFAULT 3.0,
      min_gpa_hsc REAL DEFAULT 3.0,
      application_fee REAL DEFAULT 500,
      admission_start DATE,
      admission_end DATE,
      circular_text TEXT,
      is_active BOOLEAN DEFAULT 1
    );

    -- Programs Table
    CREATE TABLE IF NOT EXISTS programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      university_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      seats INTEGER DEFAULT 50,
      required_group TEXT, -- 'Science', 'Commerce', 'Arts', or NULL for any
      min_gpa REAL DEFAULT 3.0,
      FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE
    );

    -- Applications Table
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      university_id INTEGER NOT NULL,
      program_id INTEGER NOT NULL,
      application_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'under_review', 'approved', 'rejected', 'waitlisted')),
      payment_status TEXT DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid', 'paid', 'verified')),
      payment_amount REAL DEFAULT 0,
      payment_date DATETIME,
      payment_transaction_id TEXT,
      admit_card_generated BOOLEAN DEFAULT 0,
      assigned_id TEXT,
      remarks TEXT,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE,
      FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
    );

    -- Merit List Table
    CREATE TABLE IF NOT EXISTS merit_list (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      university_id INTEGER NOT NULL,
      program_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      merit_position INTEGER NOT NULL,
      status TEXT DEFAULT 'selected' CHECK(status IN ('selected', 'waitlisted')),
      published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE,
      FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Notifications Table
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info' CHECK(type IN ('info', 'success', 'warning')),
      is_read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Activity Log Table
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Notices Table
    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      university_id INTEGER,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT 1,
      FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Safe migrations
  try {
    db.exec('ALTER TABLE universities ADD COLUMN cover_image TEXT');
  } catch (e) {
    // Column already exists
  }

  console.log('Database tables initialized.');
}

function seedDatabase() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) {
    console.log('Database already seeded. Skipping initial seed.');
    return;
  }

  console.log('Seeding database with initial data...');

  const adminHash = bcrypt.hashSync('admin123', 10);
  const managerHash = bcrypt.hashSync('manager123', 10);
  const studentHash = bcrypt.hashSync('student123', 10);
  const passHash = bcrypt.hashSync('password123', 10);

  // Insert Users
  const insertUser = db.prepare(`
    INSERT INTO users (email, password, role, full_name, phone, profile_completed)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const adminResult = insertUser.run('admin@uniadmit.com', adminHash, 'admin', 'System Administrator', '+8801711000001', 1);
  const managerResult = insertUser.run('manager@uniadmit.com', managerHash, 'manager', 'Admission Manager', '+8801711000002', 1);
  const student1 = insertUser.run('student@uniadmit.com', studentHash, 'student', 'Husna Morsaline', '+8801811223344', 1);
  const student2 = insertUser.run('tanvir@gmail.com', passHash, 'student', 'Tanvir Ahmed', '+8801912345678', 1);
  const student3 = insertUser.run('sadia@gmail.com', passHash, 'student', 'Sadia Sultana', '+8801612345678', 1);

  // Insert Student Profiles
  const insertProfile = db.prepare(`
    INSERT INTO student_profiles (
      user_id, father_name, mother_name, date_of_birth, gender, nationality, nid_number,
      present_address, permanent_address, ssc_board, ssc_roll, ssc_year, ssc_gpa, ssc_group,
      hsc_board, hsc_roll, hsc_year, hsc_gpa, hsc_group, documents_verified
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertProfile.run(
    student1.lastInsertRowid,
    'Md. Rafiqul Islam',
    'Nasima Begum',
    '2004-05-14',
    'Female',
    'Bangladeshi',
    '1998273645123',
    'House 12, Road 4, Dhanmondi, Dhaka-1205',
    'Village: Enayetpur, Upazila: Chauhali, Sirajganj',
    'Dhaka',
    '108429',
    '2021',
    5.00,
    'Science',
    'Dhaka',
    '509214',
    '2023',
    4.85,
    'Science',
    1
  );

  insertProfile.run(
    student2.lastInsertRowid,
    'Abdul Jabbar',
    'Rokeya Begum',
    '2004-09-22',
    'Male',
    'Bangladeshi',
    '2004381928471',
    'Mirpur-10, Dhaka-1216',
    'Bogura Sadar, Bogura',
    'Rajshahi',
    '219842',
    '2021',
    4.75,
    'Science',
    'Rajshahi',
    '618293',
    '2023',
    4.50,
    'Science',
    1
  );

  insertProfile.run(
    student3.lastInsertRowid,
    'M. A. Matin',
    'Suraiya Begum',
    '2005-01-10',
    'Female',
    'Bangladeshi',
    '2005918273641',
    'Uttara Sector 7, Dhaka',
    'Feni Sadar, Feni',
    'Dhaka',
    '302194',
    '2021',
    4.60,
    'Commerce',
    'Dhaka',
    '718290',
    '2023',
    4.40,
    'Commerce',
    0
  );

  // Universities and Programs
  const universitiesData = [
    {
      name: 'University of Dhaka',
      short_name: 'DU',
      location: 'Nilkhet, Dhaka',
      type: 'public',
      website: 'https://www.du.ac.bd',
      description: 'The oldest and most prestigious university in Bangladesh, established in 1921. Known as the Oxford of the East.',
      logo_url: '/images/universities/du.svg',
      min_gpa_ssc: 4.0,
      min_gpa_hsc: 4.0,
      application_fee: 1000,
      admission_start: '2026-11-01',
      admission_end: '2026-12-31',
      circular_text: 'Undergraduate Admission 2026-2027. Minimum combined GPA 8.00 in SSC & HSC required.',
      programs: [
        { name: 'Computer Science and Engineering', department: 'Engineering & Technology', seats: 60, required_group: 'Science', min_gpa: 4.5 },
        { name: 'Bachelor of Business Administration (BBA)', department: 'Faculty of Business Studies', seats: 120, required_group: null, min_gpa: 4.0 },
        { name: 'Economics', department: 'Faculty of Social Sciences', seats: 100, required_group: null, min_gpa: 4.0 },
        { name: 'English', department: 'Faculty of Arts', seats: 80, required_group: null, min_gpa: 3.8 },
        { name: 'Pharmacy', department: 'Faculty of Pharmacy', seats: 75, required_group: 'Science', min_gpa: 4.5 }
      ]
    },
    {
      name: 'Bangladesh University of Engineering and Technology',
      short_name: 'BUET',
      location: 'Palashi, Dhaka',
      type: 'public',
      website: 'https://www.buet.ac.bd',
      description: 'The premier engineering institution in Bangladesh, renowned globally for engineering and technological research.',
      logo_url: '/images/universities/buet.svg',
      min_gpa_ssc: 5.0,
      min_gpa_hsc: 5.0,
      application_fee: 1200,
      admission_start: '2026-10-15',
      admission_end: '2026-12-15',
      circular_text: 'Preliminary and Final Admission Tests for Engineering and Architecture faculties. Must have GPA 5.00 in both SSC & HSC.',
      programs: [
        { name: 'Computer Science and Engineering (CSE)', department: 'Electrical & Electronic Engineering', seats: 120, required_group: 'Science', min_gpa: 5.0 },
        { name: 'Electrical and Electronic Engineering (EEE)', department: 'Electrical & Electronic Engineering', seats: 150, required_group: 'Science', min_gpa: 5.0 },
        { name: 'Civil Engineering (CE)', department: 'Civil Engineering', seats: 180, required_group: 'Science', min_gpa: 4.8 },
        { name: 'Mechanical Engineering (ME)', department: 'Mechanical Engineering', seats: 150, required_group: 'Science', min_gpa: 4.8 },
        { name: 'Architecture', department: 'Architecture & Planning', seats: 55, required_group: 'Science', min_gpa: 4.8 }
      ]
    },
    {
      name: 'Khawaja Yunus Ali University',
      short_name: 'KYAU',
      location: 'Enayetpur, Sirajganj',
      type: 'private',
      website: 'https://www.kyau.edu.bd',
      description: 'A distinguished private university committed to academic distinction, biomedical sciences, textile, and engineering excellence.',
      logo_url: '/images/universities/kyau.png',
      min_gpa_ssc: 2.75,
      min_gpa_hsc: 2.75,
      application_fee: 600,
      admission_start: '2026-10-01',
      admission_end: '2026-12-30',
      circular_text: 'Admission open for Spring 2027. Special waivers for merit students and female applicants.',
      programs: [
        { name: 'Computer Science and Engineering (CSE)', department: 'Science & Engineering', seats: 80, required_group: 'Science', min_gpa: 3.0 },
        { name: 'Bachelor of Pharmacy (B.Pharm)', department: 'Health Sciences', seats: 60, required_group: 'Science', min_gpa: 3.5 },
        { name: 'Bachelor of Business Administration (BBA)', department: 'Business Administration', seats: 60, required_group: null, min_gpa: 2.75 },
        { name: 'English (BA Honours)', department: 'Arts & Humanities', seats: 50, required_group: null, min_gpa: 2.5 },
        { name: 'Textile Engineering', department: 'Science & Engineering', seats: 45, required_group: 'Science', min_gpa: 3.0 }
      ]
    },
    {
      name: 'Jahangirnagar University',
      short_name: 'JU',
      location: 'Savar, Dhaka',
      type: 'public',
      website: 'https://www.juniv.edu',
      description: 'A fully residential public university situated in Savar with serene nature and top-tier academic excellence.',
      logo_url: '/images/universities/ju.svg',
      min_gpa_ssc: 4.0,
      min_gpa_hsc: 4.0,
      application_fee: 900,
      admission_start: '2026-11-10',
      admission_end: '2027-01-10',
      circular_text: 'Unit-wise admission test for First Year Honours classes. Candidates must meet subject GPA criteria.',
      programs: [
        { name: 'Computer Science and Engineering', department: 'Mathematical & Physical Sciences', seats: 50, required_group: 'Science', min_gpa: 4.5 },
        { name: 'Environmental Science', department: 'Biological Sciences', seats: 40, required_group: 'Science', min_gpa: 4.0 },
        { name: 'Marketing', department: 'Business Studies', seats: 60, required_group: 'Commerce', min_gpa: 3.8 },
        { name: 'International Relations', department: 'Social Sciences', seats: 50, required_group: null, min_gpa: 3.8 }
      ]
    },
    {
      name: 'University of Rajshahi',
      short_name: 'RU',
      location: 'Motihar, Rajshahi',
      type: 'public',
      website: 'https://www.ru.ac.bd',
      description: 'The second largest public university in Bangladesh, known for its vast campus and leading research faculties.',
      logo_url: '/images/universities/ru.svg',
      min_gpa_ssc: 3.5,
      min_gpa_hsc: 3.5,
      application_fee: 800,
      admission_start: '2026-11-05',
      admission_end: '2026-12-25',
      circular_text: 'Intake for undergraduate programs 2026-2027 across Unit A, Unit B, and Unit C.',
      programs: [
        { name: 'Information & Communication Engineering', department: 'Faculty of Engineering', seats: 60, required_group: 'Science', min_gpa: 4.0 },
        { name: 'Bachelor of Laws (LL.B)', department: 'Faculty of Law', seats: 110, required_group: null, min_gpa: 4.0 },
        { name: 'Accounting & Information Systems', department: 'Business Studies', seats: 100, required_group: 'Commerce', min_gpa: 3.75 },
        { name: 'Mass Communication & Journalism', department: 'Social Sciences', seats: 60, required_group: null, min_gpa: 3.5 }
      ]
    },
    {
      name: 'Shahjalal University of Science and Technology',
      short_name: 'SUST',
      location: 'Kumargaon, Sylhet',
      type: 'public',
      website: 'https://www.sust.edu',
      description: 'A pioneering science and technology university in Sylhet known for innovation, software development and IT infrastructure.',
      logo_url: '/images/universities/sust.png',
      min_gpa_ssc: 3.8,
      min_gpa_hsc: 3.8,
      application_fee: 950,
      admission_start: '2026-11-15',
      admission_end: '2027-01-05',
      circular_text: 'SUST undergraduate admission intake. General and science units available.',
      programs: [
        { name: 'Software Engineering', department: 'Computer Science & Engineering', seats: 60, required_group: 'Science', min_gpa: 4.5 },
        { name: 'Genetic Engineering & Biotechnology', department: 'Life Sciences', seats: 45, required_group: 'Science', min_gpa: 4.2 },
        { name: 'Chemical Engineering & Polymer Science', department: 'Applied Sciences', seats: 50, required_group: 'Science', min_gpa: 4.0 },
        { name: 'Public Administration', department: 'Social Sciences', seats: 70, required_group: null, min_gpa: 3.5 }
      ]
    },
    {
      name: 'North South University',
      short_name: 'NSU',
      location: 'Bashundhara R/A, Dhaka',
      type: 'private',
      website: 'https://www.northsouth.edu',
      description: 'The first private university in Bangladesh, accredited by ACBSP and recognized for global educational standards.',
      logo_url: '/images/universities/nsu.svg',
      min_gpa_ssc: 3.5,
      min_gpa_hsc: 3.5,
      application_fee: 1500,
      admission_start: '2026-10-01',
      admission_end: '2026-12-20',
      circular_text: 'Spring 2027 Undergraduate Admission. Online application open for all four schools.',
      programs: [
        { name: 'Computer Science and Engineering', department: 'School of Engineering & Physical Sciences', seats: 200, required_group: 'Science', min_gpa: 3.8 },
        { name: 'BBA in Finance & Accounting', department: 'School of Business and Economics', seats: 250, required_group: null, min_gpa: 3.5 },
        { name: 'Bachelor of Pharmacy (B.Pharm)', department: 'School of Health & Life Sciences', seats: 100, required_group: 'Science', min_gpa: 4.0 },
        { name: 'Economics', department: 'School of Business and Economics', seats: 80, required_group: null, min_gpa: 3.5 }
      ]
    },
    {
      name: 'BRAC University',
      short_name: 'BRACU',
      location: 'Merul Badda, Dhaka',
      type: 'private',
      website: 'https://www.bracu.ac.bd',
      description: 'A leading progressive private university with state-of-the-art campus and distinguished international partnerships.',
      logo_url: '/images/universities/bracu.svg',
      min_gpa_ssc: 3.5,
      min_gpa_hsc: 3.5,
      application_fee: 1500,
      admission_start: '2026-10-10',
      admission_end: '2026-12-25',
      circular_text: 'Spring 2027 admissions open. Residential semester at Savar campus included.',
      programs: [
        { name: 'Computer Science', department: 'Computer Science and Engineering', seats: 180, required_group: 'Science', min_gpa: 3.8 },
        { name: 'Economics', department: 'Economics and Social Sciences', seats: 90, required_group: null, min_gpa: 3.5 },
        { name: 'Biotechnology', department: 'Mathematics and Natural Sciences', seats: 60, required_group: 'Science', min_gpa: 3.6 },
        { name: 'LLB (Honours)', department: 'School of Law', seats: 80, required_group: null, min_gpa: 3.5 }
      ]
    },
    {
      name: 'Ahsanullah University of Science and Technology',
      short_name: 'AUST',
      location: 'Tejgaon, Dhaka',
      type: 'private',
      website: 'https://www.aust.edu',
      description: 'Renowned engineering-focused private university sponsored by the Dhaka Ahsania Mission.',
      logo_url: '/images/universities/aust.svg',
      min_gpa_ssc: 4.0,
      min_gpa_hsc: 4.0,
      application_fee: 1200,
      admission_start: '2026-10-15',
      admission_end: '2026-12-15',
      circular_text: 'Admissions based on GPA and competitive written test in Mathematics and Physics.',
      programs: [
        { name: 'Electrical and Electronic Engineering', department: 'Engineering', seats: 120, required_group: 'Science', min_gpa: 4.2 },
        { name: 'Computer Science and Engineering', department: 'Engineering', seats: 150, required_group: 'Science', min_gpa: 4.5 },
        { name: 'Civil Engineering', department: 'Engineering', seats: 120, required_group: 'Science', min_gpa: 4.0 },
        { name: 'Bachelor of Business Administration', department: 'Business', seats: 80, required_group: null, min_gpa: 3.5 }
      ]
    },
    {
      name: 'Independent University, Bangladesh',
      short_name: 'IUB',
      location: 'Bashundhara R/A, Dhaka',
      type: 'private',
      website: 'https://www.iub.edu.bd',
      description: 'Established in 1993, IUB is known for liberal arts education, modern labs, and comprehensive research facilities.',
      logo_url: '/images/universities/iub.svg',
      min_gpa_ssc: 3.0,
      min_gpa_hsc: 3.0,
      application_fee: 1000,
      admission_start: '2026-10-20',
      admission_end: '2027-01-15',
      circular_text: 'Undergraduate admissions for Spring 2027. Multiple scholarships up to 100% available.',
      programs: [
        { name: 'Computer Science', department: 'School of Engineering', seats: 120, required_group: 'Science', min_gpa: 3.5 },
        { name: 'Media and Communication', department: 'School of Liberal Arts', seats: 80, required_group: null, min_gpa: 3.0 },
        { name: 'Human Resource Management', department: 'School of Business', seats: 90, required_group: 'Commerce', min_gpa: 3.2 },
        { name: 'Biochemistry and Microbiology', department: 'School of Life Sciences', seats: 70, required_group: 'Science', min_gpa: 3.4 }
      ]
    },
    {
      name: 'United International University',
      short_name: 'UIU',
      location: 'Madani Avenue, Badda, Dhaka',
      type: 'private',
      website: 'https://www.uiu.ac.bd',
      description: 'Renowned for high research output, robotics, renewable energy research, and engineering labs.',
      logo_url: '/images/universities/uiu.svg',
      min_gpa_ssc: 3.0,
      min_gpa_hsc: 3.0,
      application_fee: 1000,
      admission_start: '2026-10-01',
      admission_end: '2026-12-30',
      circular_text: 'Admissions open for upcoming term. Merit scholarships up to 100% based on SSC/HSC results.',
      programs: [
        { name: 'Data Science', department: 'Computer Science & Engineering', seats: 60, required_group: 'Science', min_gpa: 3.5 },
        { name: 'Computer Science and Engineering', department: 'Computer Science & Engineering', seats: 160, required_group: 'Science', min_gpa: 3.5 },
        { name: 'BBA in Marketing', department: 'School of Business & Economics', seats: 100, required_group: null, min_gpa: 3.0 },
        { name: 'Civil Engineering', department: 'Engineering', seats: 80, required_group: 'Science', min_gpa: 3.2 }
      ]
    },
    {
      name: 'Chittagong University of Engineering and Technology',
      short_name: 'CUET',
      location: 'Raozan, Chittagong',
      type: 'public',
      website: 'https://www.cuet.ac.bd',
      description: 'Major engineering public university situated amidst the picturesque green hills of Chittagong.',
      logo_url: '/images/universities/cuet.svg',
      min_gpa_ssc: 4.5,
      min_gpa_hsc: 4.5,
      application_fee: 1100,
      admission_start: '2026-11-01',
      admission_end: '2026-12-20',
      circular_text: 'Engineering Cluster Combined Admission 2026-2027.',
      programs: [
        { name: 'Computer Science and Engineering', department: 'Electrical & Computer Engineering', seats: 130, required_group: 'Science', min_gpa: 4.8 },
        { name: 'Electrical and Electronic Engineering', department: 'Electrical Engineering', seats: 130, required_group: 'Science', min_gpa: 4.6 },
        { name: 'Petroleum and Mining Engineering', department: 'Mechanical & Chemical Engineering', seats: 60, required_group: 'Science', min_gpa: 4.5 },
        { name: 'Urban and Regional Planning', department: 'Architecture & Planning', seats: 50, required_group: 'Science', min_gpa: 4.2 }
      ]
    }
  ];

  const insertUni = db.prepare(`
    INSERT INTO universities (
      name, short_name, location, type, website, description, logo_url, cover_image,
      min_gpa_ssc, min_gpa_hsc, application_fee, admission_start, admission_end, circular_text, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const insertProg = db.prepare(`
    INSERT INTO programs (university_id, name, department, seats, required_group, min_gpa)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const createdUniversities = [];
  const createdPrograms = [];

  for (const uni of universitiesData) {
    const res = insertUni.run(
      uni.name,
      uni.short_name,
      uni.location,
      uni.type,
      uni.website,
      uni.description,
      uni.logo_url,
      uni.cover_image || `/images/universities/covers/${uni.short_name.toLowerCase()}.jpg`,
      uni.min_gpa_ssc,
      uni.min_gpa_hsc,
      uni.application_fee,
      uni.admission_start,
      uni.admission_end,
      uni.circular_text
    );
    const uniId = res.lastInsertRowid;
    createdUniversities.push({ id: uniId, ...uni });

    for (const prog of uni.programs) {
      const pRes = insertProg.run(
        uniId,
        prog.name,
        prog.department,
        prog.seats,
        prog.required_group,
        prog.min_gpa
      );
      createdPrograms.push({ id: pRes.lastInsertRowid, university_id: uniId, ...prog });
    }
  }

  // Insert Applications for sample students
  const insertApp = db.prepare(`
    INSERT INTO applications (
      student_id, university_id, program_id, application_date, status,
      payment_status, payment_amount, payment_date, payment_transaction_id,
      admit_card_generated, assigned_id, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Student 1 (Husna) applied to DU (CSE) and KYAU (CSE)
  const duCse = createdPrograms.find(p => p.short_name === 'DU' || p.name.includes('Computer Science and Engineering') && p.university_id === 1);
  const kyauCse = createdPrograms.find(p => p.university_id === 3 && p.name.includes('CSE'));
  const buetCse = createdPrograms.find(p => p.university_id === 2 && p.name.includes('CSE'));

  const app1 = insertApp.run(
    student1.lastInsertRowid,
    1, // DU
    duCse ? duCse.id : 1,
    '2026-10-16 09:30:00',
    'approved',
    'verified',
    1000,
    '2026-10-16 10:00:00',
    'TXN_BKASH_DU_881920',
    1,
    'DU-2026-CSE-1042',
    'Documents verified. Eligible for admission test.'
  );

  const app2 = insertApp.run(
    student1.lastInsertRowid,
    3, // KYAU
    kyauCse ? kyauCse.id : 11,
    '2026-10-17 14:15:00',
    'under_review',
    'paid',
    600,
    '2026-10-17 14:20:00',
    'TXN_NAGAD_KYAU_5512',
    0,
    null,
    'Payment received. Document verification in progress.'
  );

  // Student 2 (Tanvir) applied to BUET and DU
  const app3 = insertApp.run(
    student2.lastInsertRowid,
    2, // BUET
    buetCse ? buetCse.id : 6,
    '2026-10-16 11:20:00',
    'pending',
    'paid',
    1200,
    '2026-10-16 11:30:00',
    'TXN_ROCKET_BUET_3910',
    0,
    null,
    'Application submitted.'
  );

  // Merit List Entries
  const insertMerit = db.prepare(`
    INSERT INTO merit_list (university_id, program_id, student_id, merit_position, status, published_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  if (duCse) {
    insertMerit.run(1, duCse.id, student1.lastInsertRowid, 14, 'selected', '2026-10-17 18:00:00');
    insertMerit.run(1, duCse.id, student2.lastInsertRowid, 89, 'waitlisted', '2026-10-17 18:00:00');
  }

  // Notices
  const insertNotice = db.prepare(`
    INSERT INTO notices (title, content, university_id, created_by)
    VALUES (?, ?, ?, ?)
  `);

  insertNotice.run(
    'Admission Test Schedule 2026-2027 Announced',
    'The centralized admission tests will commence from 15th December 2026. All students are advised to download their admit cards.',
    null,
    adminResult.lastInsertRowid
  );
  insertNotice.run(
    'Khawaja Yunus Ali University (KYAU) Scholarship Circular',
    'KYAU offers 20% to 100% tuition waiver for meritorious candidates with GPA 5.00 in SSC and HSC examinations.',
    3,
    managerResult.lastInsertRowid
  );
  insertNotice.run(
    'Payment Gateway Integration Notice',
    'Students can now pay admission fees using bKash, Nagad, Rocket, or major debit/credit cards.',
    null,
    adminResult.lastInsertRowid
  );

  // Notifications
  const insertNotif = db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, is_read)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertNotif.run(
    student1.lastInsertRowid,
    'Welcome to UniAdmit!',
    'Your account has been registered successfully. Explore universities and start applying today.',
    'info',
    1
  );
  insertNotif.run(
    student1.lastInsertRowid,
    'Application Approved - University of Dhaka',
    'Your application for Computer Science and Engineering at University of Dhaka has been approved. Your Roll ID is DU-2026-CSE-1042.',
    'success',
    0
  );
  insertNotif.run(
    student1.lastInsertRowid,
    'Admit Card Available',
    'Your Admit Card for University of Dhaka is ready for download. Please print and bring it on exam day.',
    'info',
    0
  );
  insertNotif.run(
    student2.lastInsertRowid,
    'Payment Received',
    'Your fee payment of 1,200 BDT for BUET application has been recorded.',
    'success',
    1
  );

  // Activity Log
  const insertLog = db.prepare(`
    INSERT INTO activity_log (user_id, action, details)
    VALUES (?, ?, ?)
  `);

  insertLog.run(adminResult.lastInsertRowid, 'SYSTEM_INIT', 'System initialized with default universities and programs.');
  insertLog.run(student1.lastInsertRowid, 'REGISTER', 'Student account registered: student@uniadmit.com');
  insertLog.run(student1.lastInsertRowid, 'APPLICATION_SUBMITTED', 'Submitted application to University of Dhaka (CSE)');
  insertLog.run(student1.lastInsertRowid, 'PAYMENT_SUCCESS', 'Paid 1000 BDT for DU application via bKash');
  insertLog.run(managerResult.lastInsertRowid, 'APPLICATION_APPROVED', 'Approved student 3 application for DU (CSE) with Assigned ID DU-2026-CSE-1042');

  console.log('Seed data inserted successfully!');
}

// Initialize tables and run seed
initDatabase();
seedDatabase();

module.exports = {
  db,
  initDatabase,
  seedDatabase
};
