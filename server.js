const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('./database');
const { generateChallanHTML } = require('./challan-template');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.test(ext) || allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WEBP) are allowed'));
    }
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express Session
app.use(
  session({
    secret: 'uniadmit-central-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: false
    }
  })
);

// Dev / Screenshot session simulator
app.use((req, res, next) => {
  if (req.query.dev_role) {
    if (req.query.dev_role === 'student') {
      req.session.user = { id: 3, email: 'student@uniadmit.com', role: 'student', full_name: 'Husna Morsaline', profile_completed: true };
    } else if (req.query.dev_role === 'manager') {
      req.session.user = { id: 2, email: 'manager@uniadmit.com', role: 'manager', full_name: 'Admission Manager' };
    } else if (req.query.dev_role === 'admin') {
      req.session.user = { id: 1, email: 'admin@uniadmit.com', role: 'admin', full_name: 'System Administrator' };
    }
  }
  next();
});

// Serve static assets from 'public'
app.use(express.static(path.join(__dirname, 'public')));
// Also serve Logo.png directly from root if requested
app.get('/Logo.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'Logo.png'));
});

// Helper: Activity Logger
function logActivity(userId, action, details) {
  try {
    db.prepare(`
      INSERT INTO activity_log (user_id, action, details)
      VALUES (?, ?, ?)
    `).run(userId || null, action, details || '');
  } catch (err) {
    console.error('Error logging activity:', err.message);
  }
}

// Helper: Notification Dispatcher
function createNotification(userId, title, message, type = 'info') {
  try {
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, ?)
    `).run(userId, title, message, type);
  } catch (err) {
    console.error('Error creating notification:', err.message);
  }
}

// Authentication & Role Middleware
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    }
    return res.redirect('/?redirect=' + encodeURIComponent(req.originalUrl));
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }
      return res.redirect('/');
    }
    if (!roles.includes(req.session.user.role)) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(403).json({ success: false, message: 'Access denied. Unauthorized role.' });
      }
      return res.status(403).send(`
        <!DOCTYPE html>
        <html><head><title>Access Denied - UniAdmit</title>
        <link rel="stylesheet" href="/css/styles.css"></head>
        <body style="font-family:system-ui,sans-serif;text-align:center;padding:50px;">
          <h2>403 - Forbidden</h2>
          <p>You do not have permission to view this page.</p>
          <a href="/dashboard" style="color:#2563eb;text-decoration:none;">Return to Dashboard</a>
        </body></html>
      `);
    }
    next();
  };
}

// ============================================================================
// AUTH ROUTES
// ============================================================================

// POST /api/auth/register - Register student
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password, full_name, phone } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ success: false, message: 'Email, password, and full name are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO users (email, password, role, full_name, phone, profile_completed)
      VALUES (?, ?, 'student', ?, ?, 0)
    `).run(email.trim().toLowerCase(), hashedPassword, full_name.trim(), phone ? phone.trim() : null);

    const newUserId = result.lastInsertRowid;

    // Initialize empty student profile
    db.prepare(`
      INSERT INTO student_profiles (user_id, nationality, documents_verified)
      VALUES (?, 'Bangladeshi', 0)
    `).run(newUserId);

    // Create welcome notification
    createNotification(
      newUserId,
      'Welcome to UniAdmit!',
      'Your student account has been created. Complete your academic profile to unlock tailored recommendations and start applying.',
      'info'
    );

    // Log activity
    logActivity(newUserId, 'STUDENT_REGISTER', `New student registered with email: ${email}`);

    // Set session
    req.session.user = {
      id: newUserId,
      email: email.trim().toLowerCase(),
      role: 'student',
      full_name: full_name.trim(),
      phone: phone ? phone.trim() : null,
      profile_completed: 0
    };

    return res.status(201).json({
      success: true,
      message: 'Student registration successful!',
      user: req.session.user
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during registration.' });
  }
});

// POST /api/auth/login - Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Role mismatch verification: ensure credentials match the selected portal/role
    if (role && role !== user.role) {
      const userRoleCap = user.role.charAt(0).toUpperCase() + user.role.slice(1);
      const requestedRoleCap = role.charAt(0).toUpperCase() + role.slice(1);
      return res.status(403).json({
        success: false,
        message: `Role mismatch: This account belongs to a ${userRoleCap}, but you are logging in under the ${requestedRoleCap} tab. Please select the ${userRoleCap} tab to login.`
      });
    }

    // Set session
    req.session.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      phone: user.phone,
      profile_completed: Boolean(user.profile_completed)
    };

    logActivity(user.id, 'USER_LOGIN', `User ${user.email} logged in with role ${user.role}`);

    let redirectUrl = '/student/dashboard.html';
    if (user.role === 'admin') redirectUrl = '/admin/dashboard.html';
    else if (user.role === 'manager') redirectUrl = '/manager/dashboard.html';

    return res.json({
      success: true,
      message: 'Login successful!',
      user: req.session.user,
      redirectUrl
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
});

// POST /api/auth/logout - Logout
app.post('/api/auth/logout', (req, res) => {
  const userId = req.session && req.session.user ? req.session.user.id : null;
  if (userId) {
    logActivity(userId, 'USER_LOGOUT', 'User logged out.');
  }

  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to log out.' });
    }
    res.clearCookie('connect.sid');
    return res.json({ success: true, message: 'Logged out successfully.' });
  });
});

// GET /api/auth/me - Get current user
app.get('/api/auth/me', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ success: false, authenticated: false, message: 'Not authenticated.' });
  }

  const user = db.prepare('SELECT id, email, role, full_name, phone, profile_completed, created_at FROM users WHERE id = ?').get(req.session.user.id);
  if (!user) {
    return res.status(404).json({ success: false, authenticated: false, message: 'User not found.' });
  }

  let profile = null;
  if (user.role === 'student') {
    profile = db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(user.id);
  }

  return res.json({
    success: true,
    authenticated: true,
    user: {
      ...user,
      profile_completed: Boolean(user.profile_completed),
      profile
    }
  });
});

// ============================================================================
// STUDENT ROUTES
// ============================================================================

// GET /api/student/profile - Get profile
app.get('/api/student/profile', requireAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = db.prepare('SELECT id, email, role, full_name, phone, profile_completed FROM users WHERE id = ?').get(userId);
    let profile = db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(userId);

    if (!profile) {
      db.prepare('INSERT INTO student_profiles (user_id) VALUES (?)').run(userId);
      profile = db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(userId);
    }

    return res.json({
      success: true,
      user,
      profile
    });
  } catch (err) {
    console.error('Error fetching profile:', err);
    return res.status(500).json({ success: false, message: 'Error retrieving profile.' });
  }
});

// PUT /api/student/profile - Update profile (support multipart photo and signature)
app.put(
  '/api/student/profile',
  requireAuth,
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'signature', maxCount: 1 }
  ]),
  (req, res) => {
    try {
      const userId = req.session.user.id;
      const {
        full_name,
        phone,
        father_name,
        mother_name,
        date_of_birth,
        gender,
        nationality,
        nid_number,
        present_address,
        permanent_address,
        ssc_board,
        ssc_roll,
        ssc_year,
        ssc_gpa,
        ssc_group,
        hsc_board,
        hsc_roll,
        hsc_year,
        hsc_gpa,
        hsc_group
      } = req.body;

      // Update user details
      if (full_name || phone) {
        db.prepare(`
          UPDATE users
          SET full_name = COALESCE(?, full_name),
              phone = COALESCE(?, phone),
              profile_completed = 1
          WHERE id = ?
        `).run(full_name || null, phone || null, userId);

        if (full_name) req.session.user.full_name = full_name;
        req.session.user.profile_completed = true;
      }

      // Check existing profile
      let existingProfile = db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(userId);
      if (!existingProfile) {
        db.prepare('INSERT INTO student_profiles (user_id) VALUES (?)').run(userId);
        existingProfile = db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(userId);
      }

      let photoPath = existingProfile.photo_path;
      let signaturePath = existingProfile.signature_path;

      if (req.files && req.files['photo'] && req.files['photo'][0]) {
        photoPath = '/uploads/' + req.files['photo'][0].filename;
      }
      if (req.files && req.files['signature'] && req.files['signature'][0]) {
        signaturePath = '/uploads/' + req.files['signature'][0].filename;
      }

      // Update profile
      db.prepare(`
        UPDATE student_profiles
        SET father_name = ?,
            mother_name = ?,
            date_of_birth = ?,
            gender = ?,
            nationality = ?,
            nid_number = ?,
            present_address = ?,
            permanent_address = ?,
            ssc_board = ?,
            ssc_roll = ?,
            ssc_year = ?,
            ssc_gpa = ?,
            ssc_group = ?,
            hsc_board = ?,
            hsc_roll = ?,
            hsc_year = ?,
            hsc_gpa = ?,
            hsc_group = ?,
            photo_path = ?,
            signature_path = ?
        WHERE user_id = ?
      `).run(
        father_name || existingProfile.father_name,
        mother_name || existingProfile.mother_name,
        date_of_birth || existingProfile.date_of_birth,
        gender || existingProfile.gender,
        nationality || existingProfile.nationality || 'Bangladeshi',
        nid_number || existingProfile.nid_number,
        present_address || existingProfile.present_address,
        permanent_address || existingProfile.permanent_address,
        ssc_board || existingProfile.ssc_board,
        ssc_roll || existingProfile.ssc_roll,
        ssc_year || existingProfile.ssc_year,
        ssc_gpa !== undefined && ssc_gpa !== '' ? parseFloat(ssc_gpa) : existingProfile.ssc_gpa,
        ssc_group || existingProfile.ssc_group,
        hsc_board || existingProfile.hsc_board,
        hsc_roll || existingProfile.hsc_roll,
        hsc_year || existingProfile.hsc_year,
        hsc_gpa !== undefined && hsc_gpa !== '' ? parseFloat(hsc_gpa) : existingProfile.hsc_gpa,
        hsc_group || existingProfile.hsc_group,
        photoPath,
        signaturePath,
        userId
      );

      // Ensure profile_completed flag is set
      db.prepare('UPDATE users SET profile_completed = 1 WHERE id = ?').run(userId);
      req.session.user.profile_completed = true;

      logActivity(userId, 'PROFILE_UPDATE', 'Student updated personal and academic profile.');

      const updatedProfile = db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(userId);

      return res.json({
        success: true,
        message: 'Profile updated successfully!',
        profile: updatedProfile
      });
    } catch (err) {
      console.error('Error updating profile:', err);
      return res.status(500).json({ success: false, message: 'Failed to update profile: ' + err.message });
    }
  }
);

// GET /api/universities - List universities (search, filter)
app.get('/api/universities', (req, res) => {
  try {
    const { search, type, min_gpa } = req.query;

    let sql = `
      SELECT u.*,
        (SELECT COUNT(*) FROM programs p WHERE p.university_id = u.id) AS program_count,
        (SELECT MIN(application_fee) FROM universities WHERE id = u.id) AS min_fee
      FROM universities u
      WHERE is_active = 1
    `;
    const params = [];

    if (search && search.trim()) {
      sql += ` AND (u.name LIKE ? OR u.short_name LIKE ? OR u.location LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (type && type !== 'all') {
      sql += ` AND u.type = ?`;
      params.push(type.trim().toLowerCase());
    }

    if (min_gpa) {
      sql += ` AND (u.min_gpa_ssc <= ? AND u.min_gpa_hsc <= ?)`;
      params.push(parseFloat(min_gpa), parseFloat(min_gpa));
    }

    sql += ` ORDER BY u.type ASC, u.name ASC`;

    const universities = db.prepare(sql).all(...params);

    // Attach programs for each university
    const getPrograms = db.prepare('SELECT * FROM programs WHERE university_id = ?');
    const enriched = universities.map(u => ({
      ...u,
      programs: getPrograms.all(u.id)
    }));

    return res.json({
      success: true,
      count: enriched.length,
      universities: enriched
    });
  } catch (err) {
    console.error('Error listing universities:', err);
    return res.status(500).json({ success: false, message: 'Error retrieving universities.' });
  }
});

// GET /api/universities/suggestions - Get matching universities based on student qualifications
app.get('/api/universities/suggestions', requireAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    const profile = db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(userId);

    if (!profile || profile.ssc_gpa === null || profile.hsc_gpa === null) {
      return res.json({
        success: true,
        incomplete_profile: true,
        message: 'Please complete your SSC and HSC GPA in your profile to receive smart university suggestions.',
        suggestions: []
      });
    }

    const sscGpa = parseFloat(profile.ssc_gpa) || 0;
    const hscGpa = parseFloat(profile.hsc_gpa) || 0;
    const hscGroup = (profile.hsc_group || '').trim().toLowerCase();

    // Find universities where student meets both SSC and HSC minimum requirements
    const universities = db.prepare(`
      SELECT * FROM universities
      WHERE is_active = 1
        AND min_gpa_ssc <= ?
        AND min_gpa_hsc <= ?
      ORDER BY min_gpa_hsc DESC, name ASC
    `).all(sscGpa, hscGpa);

    // For each university, find matching programs
    const suggestions = [];
    const getProgStmt = db.prepare(`
      SELECT * FROM programs
      WHERE university_id = ?
        AND min_gpa <= ?
        AND (
          required_group IS NULL
          OR required_group = ''
          OR LOWER(required_group) = ?
          OR ? = 'science' -- Science students are eligible for general/arts/commerce programs in BD universities
        )
      ORDER BY min_gpa DESC
    `);

    for (const uni of universities) {
      const eligiblePrograms = getProgStmt.all(uni.id, hscGpa, hscGroup, hscGroup);

      if (eligiblePrograms.length > 0) {
        // Calculate match percentage / tier
        const avgGpa = (sscGpa + hscGpa) / 2;
        const requiredAvg = (uni.min_gpa_ssc + uni.min_gpa_hsc) / 2;
        let matchTier = 'Eligible';
        if (avgGpa >= requiredAvg + 0.8) {
          matchTier = 'High Chance';
        } else if (avgGpa >= requiredAvg + 0.3) {
          matchTier = 'Competitive Match';
        }

        suggestions.push({
          university: uni,
          match_tier: matchTier,
          eligible_programs_count: eligiblePrograms.length,
          eligible_programs: eligiblePrograms
        });
      }
    }

    return res.json({
      success: true,
      student_qualifications: {
        ssc_gpa: sscGpa,
        ssc_group: profile.ssc_group,
        hsc_gpa: hscGpa,
        hsc_group: profile.hsc_group
      },
      count: suggestions.length,
      suggestions
    });
  } catch (err) {
    console.error('Error generating suggestions:', err);
    return res.status(500).json({ success: false, message: 'Error generating suggestions.' });
  }
});

// GET /api/universities/:id - University details
app.get('/api/universities/:id', (req, res) => {
  try {
    const uniId = parseInt(req.params.id, 10);
    const university = db.prepare('SELECT * FROM universities WHERE id = ?').get(uniId);

    if (!university) {
      return res.status(404).json({ success: false, message: 'University not found.' });
    }

    const programs = db.prepare('SELECT * FROM programs WHERE university_id = ? ORDER BY department ASC, name ASC').all(uniId);
    const notices = db.prepare('SELECT * FROM notices WHERE university_id = ? OR university_id IS NULL ORDER BY created_at DESC LIMIT 5').all(uniId);

    return res.json({
      success: true,
      university,
      programs,
      notices
    });
  } catch (err) {
    console.error('Error fetching university:', err);
    return res.status(500).json({ success: false, message: 'Error retrieving university details.' });
  }
});


// POST /api/applications - Apply to university (can apply to multiple)
app.post('/api/applications', requireAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    const { university_id, program_id } = req.body;

    // ── Profile completion gate ──
    const user = db.prepare('SELECT profile_completed FROM users WHERE id = ?').get(userId);
    if (!user || !user.profile_completed) {
      return res.status(403).json({
        success: false,
        message: 'You must complete your profile before applying. Please fill in all personal, address, and academic information.',
        redirect: '/student/profile.html'
      });
    }

    const profile = db.prepare('SELECT ssc_gpa, hsc_gpa, ssc_group, hsc_group FROM student_profiles WHERE user_id = ?').get(userId);
    if (!profile || !profile.ssc_gpa || !profile.hsc_gpa) {
      return res.status(403).json({
        success: false,
        message: 'Your academic information is incomplete. Please update your SSC and HSC details in your profile before applying.',
        redirect: '/student/profile.html'
      });
    }

    if (!university_id || !program_id) {
      return res.status(400).json({ success: false, message: 'University and Program IDs are required.' });
    }

    // Verify university & program exist
    const university = db.prepare('SELECT * FROM universities WHERE id = ? AND is_active = 1').get(university_id);
    if (!university) {
      return res.status(404).json({ success: false, message: 'Selected university is not active or does not exist.' });
    }

    const program = db.prepare('SELECT * FROM programs WHERE id = ? AND university_id = ?').get(program_id, university_id);
    if (!program) {
      return res.status(404).json({ success: false, message: 'Selected program is not offered by this university.' });
    }

    // Check if already applied
    const existing = db.prepare(`
      SELECT id FROM applications
      WHERE student_id = ? AND university_id = ? AND program_id = ?
    `).get(userId, university_id, program_id);

    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already applied for this program.' });
    }

    // Insert Application
    const result = db.prepare(`
      INSERT INTO applications (
        student_id, university_id, program_id, status, payment_status, payment_amount, application_date
      ) VALUES (?, ?, ?, 'pending', 'unpaid', ?, CURRENT_TIMESTAMP)
    `).run(userId, university_id, program_id, university.application_fee);

    const applicationId = result.lastInsertRowid;

    // Send Notification
    createNotification(
      userId,
      `Application Submitted: ${program.name}`,
      `Your application for ${program.name} at ${university.name} has been received. Please pay the application fee of ${university.application_fee} BDT to complete submission.`,
      'info'
    );

    // Log Activity
    logActivity(
      userId,
      'APPLICATION_SUBMITTED',
      `Applied to ${university.short_name} for ${program.name}. App ID: ${applicationId}`
    );

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully! Please proceed to fee payment.',
      application_id: applicationId,
      fee_amount: university.application_fee
    });
  } catch (err) {
    console.error('Error submitting application:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit application: ' + err.message });
  }
});

// GET /api/applications - List my applications
app.get('/api/applications', requireAuth, (req, res) => {
  try {
    const userId = req.session.user.id;

    const applications = db.prepare(`
      SELECT 
        a.*,
        u.name AS university_name,
        u.short_name AS university_short_name,
        u.logo_url AS university_logo,
        u.location AS university_location,
        p.name AS program_name,
        p.department AS program_department
      FROM applications a
      JOIN universities u ON a.university_id = u.id
      JOIN programs p ON a.program_id = p.id
      WHERE a.student_id = ?
      ORDER BY a.application_date DESC
    `).all(userId);

    return res.json({
      success: true,
      count: applications.length,
      applications
    });
  } catch (err) {
    console.error('Error fetching applications:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve applications.' });
  }
});

// POST /api/applications/:id/pay - Pay application fee
app.post('/api/applications/:id/pay', requireAuth, (req, res) => {
  try {
    const applicationId = parseInt(req.params.id, 10);
    const userId = req.session.user.id;
    const { payment_method = 'bKash', transaction_id } = req.body;

    const application = db.prepare(`
      SELECT a.*, u.name AS university_name, p.name AS program_name
      FROM applications a
      JOIN universities u ON a.university_id = u.id
      JOIN programs p ON a.program_id = p.id
      WHERE a.id = ? AND a.student_id = ?
    `).get(applicationId, userId);

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found or unauthorized.' });
    }

    if (application.payment_status === 'paid' || application.payment_status === 'verified') {
      return res.status(400).json({ success: false, message: 'Application fee has already been paid.' });
    }

    const generatedTxn = transaction_id || `TXN_${payment_method.toUpperCase()}_${Date.now().toString().slice(-6)}`;

    // Update application - status stays as-is; only admin/manager can change it
    db.prepare(`
      UPDATE applications
      SET payment_status = 'paid',
          payment_date = CURRENT_TIMESTAMP,
          payment_transaction_id = ?
      WHERE id = ?
    `).run(generatedTxn, applicationId);

    // Notify student
    createNotification(
      userId,
      'Payment Received',
      `Payment of ${application.payment_amount} BDT for ${application.program_name} at ${application.university_name} has been confirmed. Transaction ID: ${generatedTxn}.`,
      'success'
    );

    // Log Activity
    logActivity(
      userId,
      'PAYMENT_COMPLETED',
      `Paid ${application.payment_amount} BDT for application #${applicationId} via ${payment_method} (${generatedTxn})`
    );

    return res.json({
      success: true,
      message: 'Payment received successfully!',
      transaction_id: generatedTxn,
      payment_status: 'paid'
    });
  } catch (err) {
    console.error('Error processing payment:', err);
    return res.status(500).json({ success: false, message: 'Failed to process payment.' });
  }
});

// GET /api/student/payments - Get student payments summary and history
app.get('/api/student/payments', requireAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    const payments = db.prepare(`
      SELECT 
        a.id AS application_id,
        a.university_id,
        a.program_id,
        a.payment_amount,
        a.payment_status,
        a.payment_date,
        a.payment_transaction_id,
        a.application_date,
        u.name AS university_name,
        u.short_name AS university_short_name,
        u.logo_url AS university_logo,
        p.name AS program_name,
        p.department AS program_department
      FROM applications a
      JOIN universities u ON a.university_id = u.id
      JOIN programs p ON a.program_id = p.id
      WHERE a.student_id = ?
      ORDER BY a.payment_date DESC, a.application_date DESC
    `).all(userId);

    const totalPaid = payments
      .filter(p => p.payment_status === 'paid' || p.payment_status === 'verified')
      .reduce((sum, p) => sum + (p.payment_amount || 0), 0);

    const totalPending = payments
      .filter(p => p.payment_status === 'unpaid')
      .reduce((sum, p) => sum + (p.payment_amount || 0), 0);

    return res.json({
      success: true,
      total_paid: totalPaid,
      total_pending: totalPending,
      count: payments.length,
      payments
    });
  } catch (err) {
    console.error('Error fetching student payments:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve payments.' });
  }
});

// GET /api/applications/:id/challan & /invoice - BD Govt Automated Challan (A-Challan / T.R. Form No. 6)
const handleChallanRequest = (req, res) => {
  try {
    const applicationId = parseInt(req.params.id, 10);
    const user = req.session.user;

    const application = db.prepare(`
      SELECT 
        a.*,
        u.name AS university_name,
        u.short_name AS university_short_name,
        u.logo_url AS university_logo,
        u.location AS university_location,
        p.name AS program_name,
        p.department AS program_department,
        sp.father_name,
        sp.mother_name,
        sp.date_of_birth,
        sp.gender,
        sp.nationality,
        sp.nid_number,
        sp.present_address,
        sp.permanent_address,
        sp.ssc_board,
        sp.ssc_roll,
        sp.ssc_gpa,
        sp.hsc_board,
        sp.hsc_roll,
        sp.hsc_gpa,
        sp.photo_path,
        sp.signature_path,
        usr.full_name AS student_name,
        usr.email AS student_email,
        usr.phone AS student_phone
      FROM applications a
      JOIN universities u ON a.university_id = u.id
      JOIN programs p ON a.program_id = p.id
      JOIN users usr ON a.student_id = usr.id
      LEFT JOIN student_profiles sp ON sp.user_id = usr.id
      WHERE a.id = ?
    `).get(applicationId);

    if (!application) {
      if (req.query.format === 'json') {
        return res.status(404).json({ success: false, message: 'Application record not found.' });
      }
      return res.status(404).send('<h2>Application record not found.</h2>');
    }

    // Role check: Only the applicant or staff (admin/manager) can view
    if (user.role === 'student' && application.student_id !== user.id) {
      if (req.query.format === 'json') {
        return res.status(403).json({ success: false, message: 'Unauthorized: You can only view your own challan invoice.' });
      }
      return res.status(403).send('<h2>Unauthorized: You can only view your own challan invoice.</h2>');
    }

    const html = generateChallanHTML(application, user);

    if (req.query.format === 'json') {
      return res.json({
        success: true,
        application,
        html
      });
    }

    return res.send(html);
  } catch (err) {
    console.error('Error generating BD Govt e-Challan:', err);
    if (req.query.format === 'json') {
      return res.status(500).json({ success: false, message: 'Error rendering e-Challan.' });
    }
    return res.status(500).send('<h2>Internal Server Error generating e-Challan.</h2>');
  }
};

app.get('/api/applications/:id/challan', requireAuth, handleChallanRequest);
app.get('/api/applications/:id/invoice', requireAuth, handleChallanRequest);

// GET /api/applications/:id/admit-card - Download/view admit card
app.get('/api/applications/:id/admit-card', requireAuth, (req, res) => {
  try {
    const applicationId = parseInt(req.params.id, 10);
    const user = req.session.user;

    const application = db.prepare(`
      SELECT 
        a.*,
        u.name AS university_name,
        u.short_name AS university_short_name,
        u.logo_url AS university_logo,
        u.location AS university_location,
        p.name AS program_name,
        p.department AS program_department,
        sp.father_name,
        sp.mother_name,
        sp.date_of_birth,
        sp.gender,
        sp.nationality,
        sp.nid_number,
        sp.ssc_board,
        sp.ssc_roll,
        sp.ssc_gpa,
        sp.hsc_board,
        sp.hsc_roll,
        sp.hsc_gpa,
        sp.photo_path,
        sp.signature_path,
        usr.full_name AS student_name,
        usr.email AS student_email,
        usr.phone AS student_phone
      FROM applications a
      JOIN universities u ON a.university_id = u.id
      JOIN programs p ON a.program_id = p.id
      JOIN users usr ON a.student_id = usr.id
      LEFT JOIN student_profiles sp ON sp.user_id = usr.id
      WHERE a.id = ?
    `).get(applicationId);

    if (!application) {
      return res.status(404).send('<h2>Application not found.</h2>');
    }

    // Role check: Only the applicant or staff (admin/manager) can view
    if (user.role === 'student' && application.student_id !== user.id) {
      return res.status(403).send('<h2>Unauthorized: You can only view your own admit card.</h2>');
    }

    // Candidate Assigned ID or Roll
    const assignedRoll = application.assigned_id || `${application.university_short_name}-2026-${String(application.id).padStart(5, '0')}`;
    const studentPhoto = application.photo_path || '/images/default-avatar.png';
    const studentSign = application.signature_path || '';

    // Mark admit card as generated if not yet marked
    if (!application.admit_card_generated) {
      db.prepare(`
        UPDATE applications
        SET admit_card_generated = 1,
            assigned_id = COALESCE(assigned_id, ?)
        WHERE id = ?
      `).run(assignedRoll, applicationId);
    }

    // Render Printable HTML Admit Card
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admit Card - ${assignedRoll} - UniAdmit</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
            background: #f1f5f9;
            color: #0f172a;
            padding: 24px;
          }
          .actions-bar {
            max-width: 800px;
            margin: 0 auto 16px auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .btn {
            background: #2563eb;
            color: #fff;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }
          .btn-secondary {
            background: #64748b;
          }
          .admit-card {
            max-width: 800px;
            margin: 0 auto;
            background: #ffffff;
            border: 2px solid #1e293b;
            border-radius: 8px;
            padding: 32px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.08);
            position: relative;
            overflow: hidden;
          }
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            font-size: 72px;
            font-weight: 900;
            color: rgba(148, 163, 184, 0.12);
            pointer-events: none;
            user-select: none;
            white-space: nowrap;
            text-transform: uppercase;
          }
          .header-table {
            width: 100%;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .logo-cell {
            width: 110px;
            vertical-align: middle;
          }
          .logo-cell img {
            max-width: 95px;
            max-height: 95px;
            object-fit: contain;
          }
          .title-cell {
            text-align: center;
            vertical-align: middle;
          }
          .title-cell h3 {
            font-size: 14px;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 4px;
          }
          .title-cell h1 {
            font-size: 22px;
            color: #0f172a;
            font-weight: 800;
            margin-bottom: 4px;
          }
          .title-cell p {
            font-size: 13px;
            color: #64748b;
          }
          .badge-box {
            display: inline-block;
            margin-top: 8px;
            background: #0f172a;
            color: #ffffff;
            padding: 5px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.5px;
          }
          .content-grid {
            display: grid;
            grid-template-columns: 1fr 180px;
            gap: 24px;
            margin-bottom: 24px;
          }
          .details-table {
            width: 100%;
            border-collapse: collapse;
          }
          .details-table td {
            padding: 7px 10px;
            font-size: 13px;
            border-bottom: 1px solid #e2e8f0;
          }
          .details-table td.label {
            font-weight: 600;
            color: #475569;
            width: 150px;
          }
          .details-table td.val {
            color: #0f172a;
            font-weight: 600;
          }
          .photo-box {
            text-align: center;
          }
          .photo-frame {
            width: 150px;
            height: 180px;
            border: 2px solid #cbd5e1;
            border-radius: 4px;
            overflow: hidden;
            background: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 10px auto;
          }
          .photo-frame img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .roll-badge {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            color: #1d4ed8;
            padding: 6px;
            font-weight: 700;
            font-size: 13px;
            border-radius: 4px;
          }
          .exam-schedule-box {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-left: 4px solid #2563eb;
            padding: 14px 18px;
            border-radius: 4px;
            margin-bottom: 20px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }
          .schedule-item h4 {
            font-size: 11px;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .schedule-item p {
            font-size: 13px;
            font-weight: 700;
            color: #0f172a;
          }
          .instructions-box {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 14px 18px;
            margin-bottom: 30px;
            background: #ffffff;
          }
          .instructions-box h4 {
            font-size: 13px;
            color: #0f172a;
            margin-bottom: 8px;
            text-transform: uppercase;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
          }
          .instructions-box ol {
            padding-left: 20px;
            font-size: 11.5px;
            color: #334155;
            line-height: 1.6;
          }
          .signatures-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 40px;
            padding-top: 20px;
          }
          .sig-box {
            text-align: center;
            width: 200px;
          }
          .sig-line {
            border-top: 1px dashed #0f172a;
            padding-top: 6px;
            font-size: 12px;
            font-weight: 600;
            color: #334155;
          }
          .sig-img {
            max-height: 45px;
            margin-bottom: 6px;
          }
          @media print {
            body { background: #ffffff; padding: 0; }
            .actions-bar { display: none !important; }
            .admit-card {
              border: 1.5px solid #000;
              box-shadow: none;
              padding: 20px;
              max-width: 100%;
            }
          }
        </style>
      </head>
      <body>
        <div class="actions-bar">
          <a href="/my-applications" class="btn btn-secondary">← Back to Applications</a>
          <button onclick="window.print()" class="btn">🖨️ Print Admit Card</button>
        </div>

        <div class="admit-card">
          <div class="watermark">${application.university_short_name} ADMISSION</div>

          <table class="header-table">
            <tr>
              <td class="logo-cell">
                <img src="/Logo.png" alt="UniAdmit Logo">
              </td>
              <td class="title-cell">
                <h3>CENTRAL STUDENT ADMISSION SYSTEM - UNIDADMIT</h3>
                <h1>${application.university_name}</h1>
                <p>${application.university_location} | Admission Session: 2026-2027</p>
                <div class="badge-box">ADMISSION TEST ADMIT CARD</div>
              </td>
              <td class="logo-cell" style="text-align:right;">
                ${application.university_logo ? `<img src="${application.university_logo}" alt="University Logo" style="max-height:75px;">` : ''}
              </td>
            </tr>
          </table>

          <div class="content-grid">
            <div>
              <table class="details-table">
                <tr>
                  <td class="label">Candidate Name:</td>
                  <td class="val">${application.student_name || 'N/A'}</td>
                </tr>
                <tr>
                  <td class="label">Father's Name:</td>
                  <td class="val">${application.father_name || 'N/A'}</td>
                </tr>
                <tr>
                  <td class="label">Mother's Name:</td>
                  <td class="val">${application.mother_name || 'N/A'}</td>
                </tr>
                <tr>
                  <td class="label">Applied Program:</td>
                  <td class="val">${application.program_name} (${application.program_department})</td>
                </tr>
                <tr>
                  <td class="label">Application ID:</td>
                  <td class="val">#${application.id}</td>
                </tr>
                <tr>
                  <td class="label">Assigned Roll No:</td>
                  <td class="val" style="color:#2563eb; font-size:15px;">${assignedRoll}</td>
                </tr>
                <tr>
                  <td class="label">SSC Result:</td>
                  <td class="val">GPA ${application.ssc_gpa ? application.ssc_gpa.toFixed(2) : 'N/A'} (${application.ssc_board || 'General'})</td>
                </tr>
                <tr>
                  <td class="label">HSC Result:</td>
                  <td class="val">GPA ${application.hsc_gpa ? application.hsc_gpa.toFixed(2) : 'N/A'} (${application.hsc_board || 'General'})</td>
                </tr>
                <tr>
                  <td class="label">Payment Status:</td>
                  <td class="val" style="color:green; text-transform:uppercase;">${application.payment_status} (${application.payment_transaction_id || 'VERIFIED'})</td>
                </tr>
              </table>
            </div>

            <div class="photo-box">
              <div class="photo-frame">
                ${
                  application.photo_path
                    ? `<img src="${application.photo_path}" alt="Applicant Photo">`
                    : `<span style="color:#94a3b8;font-size:12px;">PHOTO</span>`
                }
              </div>
              <div class="roll-badge">ROLL: ${assignedRoll}</div>
            </div>
          </div>

          <div class="exam-schedule-box">
            <div class="schedule-item">
              <h4>Examination Date & Time</h4>
              <p>15 December 2026, 10:00 AM</p>
            </div>
            <div class="schedule-item">
              <h4>Examination Venue</h4>
              <p>${application.university_short_name} Main Campus, Hall A</p>
            </div>
            <div class="schedule-item">
              <h4>Reporting Time</h4>
              <p>09:30 AM (30 mins prior)</p>
            </div>
          </div>

          <div class="instructions-box">
            <h4>Instructions for the Candidate</h4>
            <ol>
              <li>This printed admit card must be presented in the examination hall along with an original photo ID.</li>
              <li>Candidates must bring black ballpoint pens for marking the OMR answers.</li>
              <li>Mobile phones, programmable calculators, smart watches, and any digital storage devices are strictly prohibited.</li>
              <li>Candidates will not be allowed to enter the exam room 15 minutes after the exam commences.</li>
              <li>Any form of unfair means will result in immediate disqualification and legal action.</li>
            </ol>
          </div>

          <div class="signatures-row">
            <div class="sig-box">
              ${
                application.signature_path
                  ? `<img src="${application.signature_path}" class="sig-img" alt="Student Signature">`
                  : `<div style="height:35px;"></div>`
              }
              <div class="sig-line">Candidate's Signature</div>
            </div>
            <div class="sig-box">
              <div style="font-family:'Courier New', monospace; font-size:11px; color:#1e293b; font-weight:bold; height:35px; display:flex; align-items:center; justify-content:center;">
                [ OFFICIAL SEAL & VERIFIED ]
              </div>
              <div class="sig-line">Convener / Controller of Exams</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  } catch (err) {
    console.error('Error rendering admit card:', err);
    return res.status(500).send('<h2>Failed to generate admit card.</h2>');
  }
});

// GET /api/merit-lists - View merit lists
app.get('/api/merit-lists', (req, res) => {
  try {
    const { university_id, program_id } = req.query;

    let sql = `
      SELECT 
        m.id,
        m.merit_position,
        m.status,
        m.published_at,
        u.name AS university_name,
        u.short_name AS university_short_name,
        p.name AS program_name,
        p.department AS program_department,
        usr.full_name AS student_name,
        sp.ssc_gpa,
        sp.hsc_gpa,
        sp.hsc_group
      FROM merit_list m
      JOIN universities u ON m.university_id = u.id
      JOIN programs p ON m.program_id = p.id
      JOIN users usr ON m.student_id = usr.id
      LEFT JOIN student_profiles sp ON sp.user_id = usr.id
      WHERE 1=1
    `;
    const params = [];

    if (university_id) {
      sql += ` AND m.university_id = ?`;
      params.push(parseInt(university_id, 10));
    }

    if (program_id) {
      sql += ` AND m.program_id = ?`;
      params.push(parseInt(program_id, 10));
    }

    sql += ` ORDER BY m.university_id ASC, m.program_id ASC, m.merit_position ASC`;

    const meritList = db.prepare(sql).all(...params);

    return res.json({
      success: true,
      count: meritList.length,
      merit_list: meritList
    });
  } catch (err) {
    console.error('Error fetching merit list:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve merit lists.' });
  }
});

// GET /api/notifications - Get notifications
app.get('/api/notifications', requireAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    const notifications = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(userId);

    const unreadCount = db.prepare(`
      SELECT COUNT(*) AS count FROM notifications
      WHERE user_id = ? AND is_read = 0
    `).get(userId).count;

    return res.json({
      success: true,
      unread_count: unreadCount,
      notifications
    });
  } catch (err) {
    console.error('Error getting notifications:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve notifications.' });
  }
});

// PUT /api/notifications/read - Mark all or specific notifications as read
app.put('/api/notifications/read', requireAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    const { id } = req.body;

    if (id) {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, userId);
    } else {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
    }

    return res.json({ success: true, message: 'Notifications marked as read.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update notifications.' });
  }
});

// ============================================================================
// ADMIN ROUTES
// ============================================================================

// GET /api/admin/stats - Admin Dashboard Statistics
app.get('/api/admin/stats', requireRole('admin'), (req, res) => {
  try {
    const totalStudents = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'student'").get().c;
    const newRegistrations = db.prepare(`
      SELECT COUNT(*) AS c FROM users 
      WHERE role = 'student' 
        AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `).get().c;
    const pendingDocVerifications = db.prepare("SELECT COUNT(*) AS c FROM student_profiles WHERE documents_verified = 0").get().c;
    const totalApplications = db.prepare("SELECT COUNT(*) AS c FROM applications").get().c;
    const pendingApplications = db.prepare("SELECT COUNT(*) AS c FROM applications WHERE status IN ('pending', 'under_review')").get().c;
    const verifiedPayments = db.prepare("SELECT COUNT(*) AS c, COALESCE(SUM(payment_amount), 0) AS total FROM applications WHERE payment_status = 'verified'").get();
    const pendingPayments = db.prepare("SELECT COUNT(*) AS c, COALESCE(SUM(payment_amount), 0) AS total FROM applications WHERE payment_status = 'paid'").get();
    const activeUniversities = db.prepare("SELECT COUNT(*) AS c FROM universities WHERE is_active = 1").get().c;

    // Recent 10 applications
    const recentApplications = db.prepare(`
      SELECT 
        a.id, a.application_date, a.status, a.payment_status, a.payment_amount, a.assigned_id,
        u.name AS university_name, u.short_name AS university_short_name,
        p.name AS program_name,
        usr.full_name AS student_name, usr.email AS student_email, usr.phone AS student_phone
      FROM applications a
      JOIN universities u ON a.university_id = u.id
      JOIN programs p ON a.program_id = p.id
      JOIN users usr ON a.student_id = usr.id
      ORDER BY a.application_date DESC
      LIMIT 10
    `).all();

    // Pending Tasks
    const pendingTasks = {
      unverified_documents: db.prepare(`
        SELECT u.id, u.full_name, u.email, sp.ssc_gpa, sp.hsc_gpa, u.created_at, sp.photo_path, sp.signature_path
        FROM users u
        JOIN student_profiles sp ON u.id = sp.user_id
        WHERE sp.documents_verified = 0
        ORDER BY u.created_at DESC
        LIMIT 6
      `).all(),
      unverified_payments: db.prepare(`
        SELECT a.id, a.payment_amount, a.payment_transaction_id, a.payment_date,
               usr.full_name AS student_name, usr.email AS student_email,
               u.short_name AS university_short_name, p.name AS program_name
        FROM applications a
        JOIN users usr ON a.student_id = usr.id
        JOIN universities u ON a.university_id = u.id
        JOIN programs p ON a.program_id = p.id
        WHERE a.payment_status = 'paid'
        ORDER BY a.payment_date DESC
        LIMIT 6
      `).all(),
      pending_applications: db.prepare(`
        SELECT a.id, a.application_date, a.status, a.payment_status,
               usr.full_name AS student_name, usr.email AS student_email,
               u.short_name AS university_short_name, p.name AS program_name
        FROM applications a
        JOIN users usr ON a.student_id = usr.id
        JOIN universities u ON a.university_id = u.id
        JOIN programs p ON a.program_id = p.id
        WHERE a.status IN ('pending', 'under_review')
        ORDER BY a.application_date DESC
        LIMIT 6
      `).all()
    };

    return res.json({
      success: true,
      stats: {
        totalStudents,
        newRegistrations,
        pendingVerifications: pendingDocVerifications,
        totalApplications,
        pendingApplications,
        verifiedPaymentsCount: verifiedPayments.c,
        verifiedPaymentsAmount: verifiedPayments.total,
        pendingPaymentsCount: pendingPayments.c,
        pendingPaymentsAmount: pendingPayments.total,
        activeUniversities
      },
      recentApplications,
      pendingTasks
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve stats.' });
  }
});

// GET /api/admin/activity-log - Admin Activity Log
app.get('/api/admin/activity-log', requireRole('admin'), (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT 
        al.id, al.action, al.details, al.created_at,
        usr.full_name AS user_name, usr.email AS user_email, usr.role AS user_role
      FROM activity_log al
      LEFT JOIN users usr ON al.user_id = usr.id
      ORDER BY al.created_at DESC
      LIMIT 100
    `).all();

    return res.json({ success: true, count: logs.length, logs });
  } catch (err) {
    console.error('Error fetching admin activity log:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve activity log.' });
  }
});

// GET /api/admin/students - List all students
app.get('/api/admin/students', requireRole('admin'), (req, res) => {
  try {
    const { search, verified } = req.query;

    let sql = `
      SELECT 
        u.id, u.email, u.full_name, u.phone, u.profile_completed, u.created_at,
        sp.ssc_gpa, sp.ssc_group, sp.hsc_gpa, sp.hsc_group, sp.documents_verified,
        sp.photo_path, sp.signature_path,
        (SELECT COUNT(*) FROM applications a WHERE a.student_id = u.id) AS total_applications
      FROM users u
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE u.role = 'student'
    `;
    const params = [];

    if (search && search.trim()) {
      sql += ` AND (u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (verified !== undefined && verified !== '') {
      sql += ` AND sp.documents_verified = ?`;
      params.push(verified === '1' || verified === 'true' ? 1 : 0);
    }

    sql += ` ORDER BY u.created_at DESC`;

    const students = db.prepare(sql).all(...params);

    return res.json({
      success: true,
      count: students.length,
      students
    });
  } catch (err) {
    console.error('Admin students list error:', err);
    return res.status(500).json({ success: false, message: 'Error retrieving students.' });
  }
});

// GET /api/admin/students/:id - Student details
app.get('/api/admin/students/:id', requireRole('admin', 'manager'), (req, res) => {
  try {
    const studentId = parseInt(req.params.id, 10);
    const user = db.prepare('SELECT id, email, role, full_name, phone, profile_completed, created_at FROM users WHERE id = ?').get(studentId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const profile = db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(studentId);
    const applications = db.prepare(`
      SELECT a.*, u.name AS university_name, u.short_name AS university_short_name, p.name AS program_name
      FROM applications a
      JOIN universities u ON a.university_id = u.id
      JOIN programs p ON a.program_id = p.id
      WHERE a.student_id = ?
      ORDER BY a.application_date DESC
    `).all(studentId);

    return res.json({
      success: true,
      student: user,
      profile,
      applications
    });
  } catch (err) {
    console.error('Admin student details error:', err);
    return res.status(500).json({ success: false, message: 'Error retrieving student details.' });
  }
});

// PUT /api/admin/students/:id/verify-documents - Verify documents
app.put('/api/admin/students/:id/verify-documents', requireRole('admin'), (req, res) => {
  try {
    const studentId = parseInt(req.params.id, 10);
    const { verified = 1 } = req.body;
    const verifiedInt = verified ? 1 : 0;

    const result = db.prepare(`
      UPDATE student_profiles
      SET documents_verified = ?
      WHERE user_id = ?
    `).run(verifiedInt, studentId);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    createNotification(
      studentId,
      verifiedInt ? 'Documents Verified' : 'Document Verification Notice',
      verifiedInt
        ? 'Your academic documents have been officially verified by UniAdmit Admissions Authority.'
        : 'Your documents require further review. Please check your uploaded files.',
      verifiedInt ? 'success' : 'warning'
    );

    logActivity(
      req.session.user.id,
      'ADMIN_VERIFY_DOCUMENTS',
      `Admin verified documents for student ID ${studentId} (Status: ${verifiedInt ? 'Verified' : 'Unverified'})`
    );

    return res.json({
      success: true,
      message: `Documents successfully ${verifiedInt ? 'verified' : 'unverified'}.`
    });
  } catch (err) {
    console.error('Error verifying documents:', err);
    return res.status(500).json({ success: false, message: 'Failed to update verification status.' });
  }
});

// GET /api/admin/applications - List all applications
app.get('/api/admin/applications', requireRole('admin', 'manager'), (req, res) => {
  try {
    const { status, university_id, payment_status, search } = req.query;

    let sql = `
      SELECT 
        a.*,
        u.name AS university_name,
        u.short_name AS university_short_name,
        p.name AS program_name,
        p.department AS program_department,
        usr.full_name AS student_name,
        usr.email AS student_email,
        usr.phone AS student_phone,
        sp.ssc_gpa,
        sp.hsc_gpa,
        sp.hsc_group,
        sp.documents_verified
      FROM applications a
      JOIN universities u ON a.university_id = u.id
      JOIN programs p ON a.program_id = p.id
      JOIN users usr ON a.student_id = usr.id
      LEFT JOIN student_profiles sp ON sp.user_id = usr.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      sql += ` AND a.status = ?`;
      params.push(status);
    }

    if (university_id && university_id !== 'all') {
      sql += ` AND a.university_id = ?`;
      params.push(parseInt(university_id, 10));
    }

    if (payment_status && payment_status !== 'all') {
      sql += ` AND a.payment_status = ?`;
      params.push(payment_status);
    }

    if (search && search.trim()) {
      sql += ` AND (usr.full_name LIKE ? OR usr.email LIKE ? OR a.assigned_id LIKE ? OR a.payment_transaction_id LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    sql += ` ORDER BY a.application_date DESC`;

    const applications = db.prepare(sql).all(...params);

    return res.json({
      success: true,
      count: applications.length,
      applications
    });
  } catch (err) {
    console.error('Admin applications list error:', err);
    return res.status(500).json({ success: false, message: 'Error retrieving applications.' });
  }
});

// PUT /api/admin/applications/:id/verify - Verify application
app.put('/api/admin/applications/:id/verify', requireRole('admin'), (req, res) => {
  try {
    const applicationId = parseInt(req.params.id, 10);
    const { status = 'approved', remarks } = req.body;

    const validStatuses = ['pending', 'under_review', 'approved', 'rejected', 'waitlisted'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const appRecord = db.prepare(`
      SELECT a.*, u.short_name AS university_short_name, u.name AS university_name, p.name AS program_name
      FROM applications a
      JOIN universities u ON a.university_id = u.id
      JOIN programs p ON a.program_id = p.id
      WHERE a.id = ?
    `).get(applicationId);

    if (!appRecord) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    // Auto-generate assigned_id if approved and doesn't exist
    let assignedId = appRecord.assigned_id;
    let admitCardGen = appRecord.admit_card_generated;
    if (status === 'approved' && !assignedId) {
      assignedId = `${appRecord.university_short_name}-2026-${String(applicationId).padStart(5, '0')}`;
      admitCardGen = 1;
    }

    db.prepare(`
      UPDATE applications
      SET status = ?,
          remarks = COALESCE(?, remarks),
          assigned_id = ?,
          admit_card_generated = ?
      WHERE id = ?
    `).run(status, remarks || null, assignedId, admitCardGen, applicationId);

    createNotification(
      appRecord.student_id,
      `Application Status Update: ${status.toUpperCase()}`,
      `Your application for ${appRecord.program_name} at ${appRecord.university_name} is now ${status}. ${remarks ? 'Remarks: ' + remarks : ''}`,
      status === 'approved' ? 'success' : status === 'rejected' ? 'warning' : 'info'
    );

    logActivity(
      req.session.user.id,
      'ADMIN_VERIFY_APPLICATION',
      `Admin updated application #${applicationId} status to ${status}.`
    );

    return res.json({
      success: true,
      message: `Application status updated to ${status}.`,
      assigned_id: assignedId
    });
  } catch (err) {
    console.error('Error updating application status:', err);
    return res.status(500).json({ success: false, message: 'Failed to verify application.' });
  }
});

// PUT /api/admin/applications/:id/assign-id - Assign student ID
app.put('/api/admin/applications/:id/assign-id', requireRole('admin'), (req, res) => {
  try {
    const applicationId = parseInt(req.params.id, 10);
    let { assigned_id } = req.body;

    const appRecord = db.prepare(`
      SELECT a.*, u.short_name, u.name AS university_name, p.name AS program_name
      FROM applications a
      JOIN universities u ON a.university_id = u.id
      JOIN programs p ON a.program_id = p.id
      WHERE a.id = ?
    `).get(applicationId);

    if (!appRecord) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    if (!assigned_id || !assigned_id.trim()) {
      assigned_id = `${appRecord.short_name}-2026-${String(applicationId).padStart(5, '0')}`;
    }

    db.prepare(`
      UPDATE applications
      SET assigned_id = ?,
          admit_card_generated = 1
      WHERE id = ?
    `).run(assigned_id.trim(), applicationId);

    createNotification(
      appRecord.student_id,
      'Roll Number Assigned & Admit Card Ready',
      `You have been assigned Student Roll ID: ${assigned_id} for ${appRecord.program_name}. You can now view and print your Admit Card.`,
      'success'
    );

    logActivity(
      req.session.user.id,
      'ADMIN_ASSIGN_ID',
      `Assigned Roll ID ${assigned_id} to application #${applicationId}`
    );

    return res.json({
      success: true,
      message: 'Student ID successfully assigned and admit card unlocked!',
      assigned_id: assigned_id.trim()
    });
  } catch (err) {
    console.error('Error assigning student ID:', err);
    return res.status(500).json({ success: false, message: 'Failed to assign ID.' });
  }
});

// GET /api/admin/payments - List payments
app.get('/api/admin/payments', requireRole('admin', 'manager'), (req, res) => {
  try {
    const payments = db.prepare(`
      SELECT 
        a.id AS application_id,
        a.payment_status,
        a.payment_amount,
        a.payment_date,
        a.payment_transaction_id,
        u.name AS university_name,
        u.short_name AS university_short_name,
        p.name AS program_name,
        usr.id AS student_id,
        usr.full_name AS student_name,
        usr.email AS student_email,
        usr.phone AS student_phone
      FROM applications a
      JOIN universities u ON a.university_id = u.id
      JOIN programs p ON a.program_id = p.id
      JOIN users usr ON a.student_id = usr.id
      WHERE a.payment_status IN ('paid', 'verified') OR a.payment_transaction_id IS NOT NULL
      ORDER BY a.payment_date DESC
    `).all();

    return res.json({
      success: true,
      count: payments.length,
      payments
    });
  } catch (err) {
    console.error('Error listing payments:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve payments.' });
  }
});

// PUT /api/admin/payments/:id/verify - Verify payment
app.put('/api/admin/payments/:id/verify', requireRole('admin'), (req, res) => {
  try {
    const applicationId = parseInt(req.params.id, 10);

    const appRecord = db.prepare(`
      SELECT a.*, u.name AS university_name, p.name AS program_name
      FROM applications a
      JOIN universities u ON a.university_id = u.id
      JOIN programs p ON a.program_id = p.id
      WHERE a.id = ?
    `).get(applicationId);

    if (!appRecord) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    db.prepare(`
      UPDATE applications
      SET payment_status = 'verified'
      WHERE id = ?
    `).run(applicationId);

    createNotification(
      appRecord.student_id,
      'Payment Verified Successfully',
      `Your payment of ${appRecord.payment_amount} BDT for ${appRecord.program_name} has been verified by the accounts department.`,
      'success'
    );

    logActivity(
      req.session.user.id,
      'ADMIN_VERIFY_PAYMENT',
      `Verified payment for application #${applicationId} (${appRecord.payment_transaction_id})`
    );

    return res.json({
      success: true,
      message: 'Payment has been verified successfully.'
    });
  } catch (err) {
    console.error('Error verifying payment:', err);
    return res.status(500).json({ success: false, message: 'Failed to verify payment.' });
  }
});

// POST /api/admin/notices - Create admission notice
app.post('/api/admin/notices', requireRole('admin'), (req, res) => {
  try {
    const { title, content, university_id } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required.' });
    }

    const result = db.prepare(`
      INSERT INTO notices (title, content, university_id, created_by)
      VALUES (?, ?, ?, ?)
    `).run(title.trim(), content.trim(), university_id ? parseInt(university_id, 10) : null, req.session.user.id);

    logActivity(req.session.user.id, 'ADMIN_CREATE_NOTICE', `Created notice: ${title.trim()}`);

    return res.status(201).json({
      success: true,
      message: 'Notice created successfully!',
      notice_id: result.lastInsertRowid
    });
  } catch (err) {
    console.error('Error creating notice:', err);
    return res.status(500).json({ success: false, message: 'Failed to create notice.' });
  }
});

// GET /api/admin/notices - List notices
app.get('/api/admin/notices', (req, res) => {
  try {
    const notices = db.prepare(`
      SELECT 
        n.*,
        u.name AS university_name,
        u.short_name AS university_short_name,
        usr.full_name AS created_by_name
      FROM notices n
      LEFT JOIN universities u ON n.university_id = u.id
      LEFT JOIN users usr ON n.created_by = usr.id
      ORDER BY n.created_at DESC
    `).all();

    return res.json({
      success: true,
      count: notices.length,
      notices
    });
  } catch (err) {
    console.error('Error listing notices:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve notices.' });
  }
});

// PUT /api/admin/notices/:id - Update notice
app.put('/api/admin/notices/:id', requireRole('admin'), (req, res) => {
  try {
    const noticeId = parseInt(req.params.id, 10);
    const { title, content, university_id, is_active } = req.body;

    const existing = db.prepare('SELECT id FROM notices WHERE id = ?').get(noticeId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Notice not found.' });
    }

    db.prepare(`
      UPDATE notices
      SET title = COALESCE(?, title),
          content = COALESCE(?, content),
          university_id = ?,
          is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(
      title ? title.trim() : null,
      content ? content.trim() : null,
      university_id === '' || university_id === null || university_id === undefined ? null : parseInt(university_id, 10),
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      noticeId
    );

    logActivity(req.session.user.id, 'ADMIN_UPDATE_NOTICE', `Updated notice #${noticeId}`);

    return res.json({ success: true, message: 'Notice updated successfully.' });
  } catch (err) {
    console.error('Error updating notice:', err);
    return res.status(500).json({ success: false, message: 'Failed to update notice.' });
  }
});

// DELETE /api/admin/notices/:id - Delete notice
app.delete('/api/admin/notices/:id', requireRole('admin'), (req, res) => {
  try {
    const noticeId = parseInt(req.params.id, 10);
    const result = db.prepare('DELETE FROM notices WHERE id = ?').run(noticeId);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Notice not found.' });
    }

    logActivity(req.session.user.id, 'ADMIN_DELETE_NOTICE', `Deleted notice #${noticeId}`);

    return res.json({ success: true, message: 'Notice deleted successfully.' });
  } catch (err) {
    console.error('Error deleting notice:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete notice.' });
  }
});

// GET /api/admin/managers - List managers
app.get('/api/admin/managers', requireRole('admin'), (req, res) => {
  try {
    const managers = db.prepare(`
      SELECT id, email, full_name, phone, created_at, profile_completed AS is_active
      FROM users
      WHERE role = 'manager'
      ORDER BY created_at DESC
    `).all();

    return res.json({
      success: true,
      count: managers.length,
      managers
    });
  } catch (err) {
    console.error('Error listing managers:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve managers.' });
  }
});

// POST /api/admin/managers - Create manager
app.post('/api/admin/managers', requireRole('admin'), (req, res) => {
  try {
    const { email, password, full_name, phone } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ success: false, message: 'Email, password, and full name are required.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (existing) {
      return res.status(400).json({ success: false, message: 'User with this email already exists.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO users (email, password, role, full_name, phone, profile_completed)
      VALUES (?, ?, 'manager', ?, ?, 1)
    `).run(email.trim().toLowerCase(), hashedPassword, full_name.trim(), phone ? phone.trim() : null);

    logActivity(
      req.session.user.id,
      'ADMIN_CREATE_MANAGER',
      `Created manager account: ${email.trim().toLowerCase()}`
    );

    return res.status(201).json({
      success: true,
      message: 'Manager account created successfully!',
      manager: {
        id: result.lastInsertRowid,
        email: email.trim().toLowerCase(),
        full_name: full_name.trim(),
        role: 'manager'
      }
    });
  } catch (err) {
    console.error('Error creating manager:', err);
    return res.status(500).json({ success: false, message: 'Failed to create manager.' });
  }
});

// PUT /api/admin/managers/:id - Update manager (name, phone, password, status)
app.put('/api/admin/managers/:id', requireRole('admin'), (req, res) => {
  try {
    const managerId = parseInt(req.params.id, 10);
    const { full_name, phone, password, is_active } = req.body;

    const existing = db.prepare("SELECT id, email, full_name FROM users WHERE id = ? AND role = 'manager'").get(managerId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Manager not found.' });
    }

    if (password && password.trim()) {
      const hashed = bcrypt.hashSync(password.trim(), 10);
      db.prepare(`
        UPDATE users
        SET full_name = COALESCE(?, full_name),
            phone = COALESCE(?, phone),
            password = ?,
            profile_completed = COALESCE(?, profile_completed)
        WHERE id = ?
      `).run(full_name ? full_name.trim() : null, phone ? phone.trim() : null, hashed, is_active !== undefined ? (is_active ? 1 : 0) : null, managerId);
    } else {
      db.prepare(`
        UPDATE users
        SET full_name = COALESCE(?, full_name),
            phone = COALESCE(?, phone),
            profile_completed = COALESCE(?, profile_completed)
        WHERE id = ?
      `).run(full_name ? full_name.trim() : null, phone ? phone.trim() : null, is_active !== undefined ? (is_active ? 1 : 0) : null, managerId);
    }

    logActivity(
      req.session.user.id,
      'ADMIN_UPDATE_MANAGER',
      `Updated manager #${managerId} (${existing.email})`
    );

    return res.json({ success: true, message: 'Manager updated successfully.' });
  } catch (err) {
    console.error('Error updating manager:', err);
    return res.status(500).json({ success: false, message: 'Failed to update manager.' });
  }
});

// DELETE /api/admin/managers/:id - Deactivate or Delete manager
app.delete('/api/admin/managers/:id', requireRole('admin'), (req, res) => {
  try {
    const managerId = parseInt(req.params.id, 10);
    const existing = db.prepare("SELECT id, email FROM users WHERE id = ? AND role = 'manager'").get(managerId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Manager not found.' });
    }

    // Toggle active status to 0 (deactivate)
    db.prepare("UPDATE users SET profile_completed = 0 WHERE id = ?").run(managerId);

    logActivity(
      req.session.user.id,
      'ADMIN_DEACTIVATE_MANAGER',
      `Deactivated manager #${managerId} (${existing.email})`
    );

    return res.json({ success: true, message: 'Manager deactivated successfully.' });
  } catch (err) {
    console.error('Error deactivating manager:', err);
    return res.status(500).json({ success: false, message: 'Failed to deactivate manager.' });
  }
});

// PUT /api/admin/records/:id - Update records
app.put('/api/admin/records/:id', requireRole('admin'), (req, res) => {
  try {
    const recordId = parseInt(req.params.id, 10);
    const { type = 'application', data } = req.body;

    if (!data) {
      return res.status(400).json({ success: false, message: 'Data payload is required.' });
    }

    if (type === 'application') {
      const { status, remarks, payment_status, assigned_id } = data;
      db.prepare(`
        UPDATE applications
        SET status = COALESCE(?, status),
            remarks = COALESCE(?, remarks),
            payment_status = COALESCE(?, payment_status),
            assigned_id = COALESCE(?, assigned_id)
        WHERE id = ?
      `).run(status || null, remarks || null, payment_status || null, assigned_id || null, recordId);
    } else if (type === 'student') {
      const { full_name, phone, ssc_gpa, hsc_gpa, ssc_board, hsc_board, ssc_roll, hsc_roll, ssc_year, hsc_year, ssc_group, hsc_group, present_address, permanent_address, documents_verified } = data;
      
      db.prepare(`
        UPDATE users
        SET full_name = COALESCE(?, full_name),
            phone = COALESCE(?, phone)
        WHERE id = ?
      `).run(full_name || null, phone || null, recordId);

      const profileExists = db.prepare('SELECT id FROM student_profiles WHERE user_id = ?').get(recordId);
      if (profileExists) {
        db.prepare(`
          UPDATE student_profiles
          SET ssc_gpa = COALESCE(?, ssc_gpa),
              hsc_gpa = COALESCE(?, hsc_gpa),
              ssc_board = COALESCE(?, ssc_board),
              hsc_board = COALESCE(?, hsc_board),
              ssc_roll = COALESCE(?, ssc_roll),
              hsc_roll = COALESCE(?, hsc_roll),
              ssc_year = COALESCE(?, ssc_year),
              hsc_year = COALESCE(?, hsc_year),
              ssc_group = COALESCE(?, ssc_group),
              hsc_group = COALESCE(?, hsc_group),
              present_address = COALESCE(?, present_address),
              permanent_address = COALESCE(?, permanent_address),
              documents_verified = COALESCE(?, documents_verified)
          WHERE user_id = ?
        `).run(
          ssc_gpa !== undefined && ssc_gpa !== '' ? parseFloat(ssc_gpa) : null,
          hsc_gpa !== undefined && hsc_gpa !== '' ? parseFloat(hsc_gpa) : null,
          ssc_board || null,
          hsc_board || null,
          ssc_roll || null,
          hsc_roll || null,
          ssc_year || null,
          hsc_year || null,
          ssc_group || null,
          hsc_group || null,
          present_address || null,
          permanent_address || null,
          documents_verified !== undefined ? (documents_verified ? 1 : 0) : null,
          recordId
        );
      }
    } else if (type === 'university') {
      const { name, short_name, location, type: uniType, application_fee, is_active } = data;
      db.prepare(`
        UPDATE universities
        SET name = COALESCE(?, name),
            short_name = COALESCE(?, short_name),
            location = COALESCE(?, location),
            type = COALESCE(?, type),
            application_fee = COALESCE(?, application_fee),
            is_active = COALESCE(?, is_active)
        WHERE id = ?
      `).run(name || null, short_name || null, location || null, uniType || null, application_fee || null, is_active !== undefined ? is_active : null, recordId);
    } else {
      return res.status(400).json({ success: false, message: 'Unsupported record type.' });
    }

    logActivity(
      req.session.user.id,
      'ADMIN_RECORD_UPDATE',
      `Updated ${type} record #${recordId}`
    );

    return res.json({
      success: true,
      message: `${type} record #${recordId} successfully updated.`
    });
  } catch (err) {
    console.error('Error updating record:', err);
    return res.status(500).json({ success: false, message: 'Failed to update record: ' + err.message });
  }
});

// ============================================================================
// MANAGER ROUTES
// ============================================================================

// GET /api/manager/applications - Review applications
app.get('/api/manager/applications', requireRole('manager', 'admin'), (req, res) => {
  try {
    const { status, university_id, search } = req.query;

    let sql = `
      SELECT 
        a.*,
        u.name AS university_name,
        u.short_name AS university_short_name,
        p.name AS program_name,
        p.department AS program_department,
        p.seats AS program_seats,
        usr.full_name AS student_name,
        usr.email AS student_email,
        usr.phone AS student_phone,
        sp.ssc_gpa,
        sp.ssc_group,
        sp.ssc_board,
        sp.hsc_gpa,
        sp.hsc_group,
        sp.hsc_board,
        sp.documents_verified,
        sp.photo_path
      FROM applications a
      JOIN universities u ON a.university_id = u.id
      JOIN programs p ON a.program_id = p.id
      JOIN users usr ON a.student_id = usr.id
      LEFT JOIN student_profiles sp ON sp.user_id = usr.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      sql += ` AND a.status = ?`;
      params.push(status);
    }

    if (university_id && university_id !== 'all') {
      sql += ` AND a.university_id = ?`;
      params.push(parseInt(university_id, 10));
    }

    if (search && search.trim()) {
      sql += ` AND (usr.full_name LIKE ? OR usr.email LIKE ? OR a.assigned_id LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    sql += ` ORDER BY a.application_date DESC`;

    const applications = db.prepare(sql).all(...params);

    return res.json({
      success: true,
      count: applications.length,
      applications
    });
  } catch (err) {
    console.error('Manager applications review error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve applications.' });
  }
});

// PUT /api/manager/applications/:id/review - Submit review
app.put('/api/manager/applications/:id/review', requireRole('manager', 'admin'), (req, res) => {
  try {
    const applicationId = parseInt(req.params.id, 10);
    const { status, remarks } = req.body;

    const validStatuses = ['under_review', 'approved', 'rejected', 'waitlisted'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Valid status is required (under_review, approved, rejected, waitlisted).' });
    }

    const appRecord = db.prepare(`
      SELECT a.*, u.short_name, u.name AS university_name, p.name AS program_name
      FROM applications a
      JOIN universities u ON a.university_id = u.id
      JOIN programs p ON a.program_id = p.id
      WHERE a.id = ?
    `).get(applicationId);

    if (!appRecord) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    let assignedId = appRecord.assigned_id;
    let admitCardGen = appRecord.admit_card_generated;
    if (status === 'approved' && !assignedId) {
      assignedId = `${appRecord.short_name}-2026-${String(applicationId).padStart(5, '0')}`;
      admitCardGen = 1;
    }

    db.prepare(`
      UPDATE applications
      SET status = ?,
          remarks = COALESCE(?, remarks),
          assigned_id = ?,
          admit_card_generated = ?
      WHERE id = ?
    `).run(status, remarks || null, assignedId, admitCardGen, applicationId);

    createNotification(
      appRecord.student_id,
      `Admission Application Decision: ${status.toUpperCase()}`,
      `Your application for ${appRecord.program_name} at ${appRecord.university_name} has been reviewed and marked as ${status}.${remarks ? ' Note: ' + remarks : ''}`,
      status === 'approved' ? 'success' : status === 'rejected' ? 'warning' : 'info'
    );

    logActivity(
      req.session.user.id,
      'MANAGER_REVIEW_APP',
      `Manager reviewed application #${applicationId} -> ${status}`
    );

    return res.json({
      success: true,
      message: `Application reviewed successfully. New status: ${status}`,
      assigned_id: assignedId
    });
  } catch (err) {
    console.error('Error reviewing application:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit review.' });
  }
});

// GET /api/manager/statistics - Get statistics
app.get('/api/manager/statistics', requireRole('manager', 'admin'), (req, res) => {
  try {
    const totalStudents = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'student'").get().c;
    const totalApplications = db.prepare('SELECT COUNT(*) AS c FROM applications').get().c;
    const pendingApps = db.prepare("SELECT COUNT(*) AS c FROM applications WHERE status = 'pending'").get().c;
    const underReviewApps = db.prepare("SELECT COUNT(*) AS c FROM applications WHERE status = 'under_review'").get().c;
    const approvedApps = db.prepare("SELECT COUNT(*) AS c FROM applications WHERE status = 'approved'").get().c;
    const rejectedApps = db.prepare("SELECT COUNT(*) AS c FROM applications WHERE status = 'rejected'").get().c;
    const waitlistedApps = db.prepare("SELECT COUNT(*) AS c FROM applications WHERE status = 'waitlisted'").get().c;

    const totalPaid = db.prepare("SELECT COUNT(*) AS c, COALESCE(SUM(payment_amount), 0) AS total FROM applications WHERE payment_status IN ('paid', 'verified')").get();
    const verifiedPayments = db.prepare("SELECT COUNT(*) AS c, COALESCE(SUM(payment_amount), 0) AS total FROM applications WHERE payment_status = 'verified'").get();
    const unpaidApps = db.prepare("SELECT COUNT(*) AS c, COALESCE(SUM(payment_amount), 0) AS total FROM applications WHERE payment_status = 'unpaid'").get();

    const totalUniversities = db.prepare('SELECT COUNT(*) AS c FROM universities').get().c;
    const totalPrograms = db.prepare('SELECT COUNT(*) AS c FROM programs').get().c;

    return res.json({
      success: true,
      statistics: {
        total_students: totalStudents,
        total_applications: totalApplications,
        pending_applications: pendingApps,
        under_review_applications: underReviewApps,
        approved_applications: approvedApps,
        rejected_applications: rejectedApps,
        waitlisted_applications: waitlistedApps,
        paid_applications_count: totalPaid.c,
        total_revenue_collected: totalPaid.total,
        verified_revenue: verifiedPayments.total,
        pending_revenue: unpaidApps.total,
        total_universities: totalUniversities,
        total_programs: totalPrograms
      }
    });
  } catch (err) {
    console.error('Error fetching statistics:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve statistics.' });
  }
});

// POST /api/manager/merit-list - Generate/approve merit list
app.post('/api/manager/merit-list', requireRole('manager', 'admin'), (req, res) => {
  try {
    const { university_id, program_id, auto_generate = true, entries } = req.body;

    if (!university_id || !program_id) {
      return res.status(400).json({ success: false, message: 'University ID and Program ID are required.' });
    }

    const program = db.prepare('SELECT * FROM programs WHERE id = ? AND university_id = ?').get(program_id, university_id);
    if (!program) {
      return res.status(404).json({ success: false, message: 'Program not found for this university.' });
    }

    // Remove old merit list for this program
    db.prepare('DELETE FROM merit_list WHERE university_id = ? AND program_id = ?').run(university_id, program_id);

    const insertMerit = db.prepare(`
      INSERT INTO merit_list (university_id, program_id, student_id, merit_position, status, published_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    let count = 0;

    if (auto_generate) {
      // Find all paid/approved applications for this program, ranked by GPA (SSC + HSC)
      const candidates = db.prepare(`
        SELECT 
          a.student_id,
          (COALESCE(sp.ssc_gpa, 0) + COALESCE(sp.hsc_gpa, 0)) AS total_score,
          sp.hsc_gpa,
          sp.ssc_gpa
        FROM applications a
        JOIN student_profiles sp ON sp.user_id = a.student_id
        WHERE a.university_id = ? AND a.program_id = ?
        ORDER BY total_score DESC, sp.hsc_gpa DESC, sp.ssc_gpa DESC
      `).all(university_id, program_id);

      const seats = program.seats || 50;

      for (let i = 0; i < candidates.length; i++) {
        const pos = i + 1;
        const status = pos <= seats ? 'selected' : 'waitlisted';
        insertMerit.run(university_id, program_id, candidates[i].student_id, pos, status);
        count++;

        // Notify candidate
        createNotification(
          candidates[i].student_id,
          `Merit List Published: ${program.name}`,
          `You have been ranked at Merit Position #${pos} (${status.toUpperCase()}) for ${program.name}.`,
          status === 'selected' ? 'success' : 'info'
        );
      }
    } else if (Array.isArray(entries)) {
      for (const entry of entries) {
        insertMerit.run(university_id, program_id, entry.student_id, entry.merit_position, entry.status || 'selected');
        count++;
      }
    }

    logActivity(
      req.session.user.id,
      'MERIT_LIST_PUBLISHED',
      `Published merit list for Program #${program_id} at University #${university_id} (${count} students ranked)`
    );

    return res.status(201).json({
      success: true,
      message: `Merit list generated and published successfully for ${program.name}.`,
      ranked_count: count
    });
  } catch (err) {
    console.error('Error generating merit list:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate merit list: ' + err.message });
  }
});

// POST /api/manager/notify - Send notification
app.post('/api/manager/notify', requireRole('manager', 'admin'), (req, res) => {
  try {
    const { user_id, title, message, type = 'info' } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required.' });
    }

    let recipientsCount = 0;

    if (user_id === 'all' || !user_id) {
      // Broadcast to all students
      const students = db.prepare("SELECT id FROM users WHERE role = 'student'").all();
      const insertNotif = db.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, ?, ?, ?)
      `);
      for (const s of students) {
        insertNotif.run(s.id, title.trim(), message.trim(), type);
        recipientsCount++;
      }
    } else {
      createNotification(parseInt(user_id, 10), title.trim(), message.trim(), type);
      recipientsCount = 1;
    }

    logActivity(
      req.session.user.id,
      'MANAGER_SEND_NOTIFY',
      `Sent notification "${title}" to ${recipientsCount} recipient(s).`
    );

    return res.json({
      success: true,
      message: `Notification dispatched successfully to ${recipientsCount} student(s).`
    });
  } catch (err) {
    console.error('Error sending notification:', err);
    return res.status(500).json({ success: false, message: 'Failed to send notification.' });
  }
});

// GET /api/manager/financial-summary - Financial summary
app.get('/api/manager/financial-summary', requireRole('manager', 'admin'), (req, res) => {
  try {
    const totalCollected = db.prepare(`
      SELECT COALESCE(SUM(payment_amount), 0) AS total
      FROM applications
      WHERE payment_status IN ('paid', 'verified')
    `).get().total;

    const totalVerified = db.prepare(`
      SELECT COALESCE(SUM(payment_amount), 0) AS total
      FROM applications
      WHERE payment_status = 'verified'
    `).get().total;

    const totalPending = db.prepare(`
      SELECT COALESCE(SUM(payment_amount), 0) AS total
      FROM applications
      WHERE payment_status = 'unpaid'
    `).get().total;

    // Breakdown by University
    const byUniversity = db.prepare(`
      SELECT 
        u.id AS university_id,
        u.name AS university_name,
        u.short_name AS university_short_name,
        COUNT(a.id) AS total_applications,
        SUM(CASE WHEN a.payment_status IN ('paid', 'verified') THEN 1 ELSE 0 END) AS paid_count,
        COALESCE(SUM(CASE WHEN a.payment_status IN ('paid', 'verified') THEN a.payment_amount ELSE 0 END), 0) AS total_fee_collected
      FROM universities u
      LEFT JOIN applications a ON a.university_id = u.id
      GROUP BY u.id
      ORDER BY total_fee_collected DESC
    `).all();

    // Recent Transactions
    const recentTransactions = db.prepare(`
      SELECT 
        a.id AS application_id,
        a.payment_transaction_id,
        a.payment_amount,
        a.payment_date,
        a.payment_status,
        u.short_name AS university_short_name,
        usr.full_name AS student_name
      FROM applications a
      JOIN universities u ON a.university_id = u.id
      JOIN users usr ON a.student_id = usr.id
      WHERE a.payment_status IN ('paid', 'verified')
      ORDER BY a.payment_date DESC
      LIMIT 15
    `).all();

    return res.json({
      success: true,
      financial_summary: {
        total_collected: totalCollected,
        total_verified: totalVerified,
        total_pending: totalPending,
        by_university: byUniversity,
        recent_transactions: recentTransactions
      }
    });
  } catch (err) {
    console.error('Error fetching financial summary:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve financial summary.' });
  }
});

// GET /api/manager/reports - Generate reports
app.get('/api/manager/reports', requireRole('manager', 'admin'), (req, res) => {
  try {
    const statusCounts = db.prepare(`
      SELECT status, COUNT(*) AS count
      FROM applications
      GROUP BY status
    `).all();

    const groupCounts = db.prepare(`
      SELECT COALESCE(sp.hsc_group, 'Not Specified') AS hsc_group, COUNT(a.id) AS count
      FROM applications a
      LEFT JOIN student_profiles sp ON sp.user_id = a.student_id
      GROUP BY sp.hsc_group
    `).all();

    const topUniversities = db.prepare(`
      SELECT u.id, u.name, u.short_name, COUNT(a.id) AS total_applications
      FROM universities u
      LEFT JOIN applications a ON a.university_id = u.id
      GROUP BY u.id
      ORDER BY total_applications DESC
      LIMIT 5
    `).all();

    const topPrograms = db.prepare(`
      SELECT p.id, p.name, u.short_name AS university, COUNT(a.id) AS application_count
      FROM programs p
      JOIN universities u ON p.university_id = u.id
      LEFT JOIN applications a ON a.program_id = p.id
      GROUP BY p.id
      ORDER BY application_count DESC
      LIMIT 8
    `).all();

    const totalApps = db.prepare('SELECT COUNT(*) AS c FROM applications').get().c;
    const approvedApps = db.prepare("SELECT COUNT(*) AS c FROM applications WHERE status = 'approved'").get().c;
    const acceptanceRate = totalApps > 0 ? ((approvedApps / totalApps) * 100).toFixed(1) + '%' : '0%';

    return res.json({
      success: true,
      report: {
        total_applications: totalApps,
        acceptance_rate: acceptanceRate,
        applications_by_status: statusCounts,
        applications_by_group: groupCounts,
        top_universities: topUniversities,
        top_programs: topPrograms
      }
    });
  } catch (err) {
    console.error('Error generating reports:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate reports.' });
  }
});

// GET /api/manager/admission-stats - Admission statistics
app.get('/api/manager/admission-stats', requireRole('manager', 'admin'), (req, res) => {
  try {
    const departmentStats = db.prepare(`
      SELECT p.department, COUNT(a.id) AS applications_count, SUM(p.seats) AS total_seats
      FROM programs p
      LEFT JOIN applications a ON a.program_id = p.id
      GROUP BY p.department
      ORDER BY applications_count DESC
    `).all();

    const genderStats = db.prepare(`
      SELECT COALESCE(sp.gender, 'Not Specified') AS gender, COUNT(a.id) AS count
      FROM applications a
      LEFT JOIN student_profiles sp ON sp.user_id = a.student_id
      GROUP BY sp.gender
    `).all();

    const boardStats = db.prepare(`
      SELECT COALESCE(sp.hsc_board, 'Unknown') AS board, COUNT(a.id) AS count
      FROM applications a
      LEFT JOIN student_profiles sp ON sp.user_id = a.student_id
      GROUP BY sp.hsc_board
      ORDER BY count DESC
    `).all();

    const capacityStats = db.prepare(`
      SELECT 
        u.short_name AS university,
        SUM(p.seats) AS total_capacity,
        COUNT(a.id) AS total_applications,
        ROUND((COUNT(a.id) * 1.0 / NULLIF(SUM(p.seats), 0)), 2) AS demand_ratio
      FROM universities u
      JOIN programs p ON p.university_id = u.id
      LEFT JOIN applications a ON a.program_id = p.id
      GROUP BY u.id
      ORDER BY total_applications DESC
    `).all();

    return res.json({
      success: true,
      admission_stats: {
        by_department: departmentStats,
        by_gender: genderStats,
        by_board: boardStats,
        capacity_utilization: capacityStats
      }
    });
  } catch (err) {
    console.error('Error fetching admission stats:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve admission statistics.' });
  }
});

// GET /api/manager/activity-log - System activity log
app.get('/api/manager/activity-log', requireRole('manager', 'admin'), (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT 
        al.id,
        al.action,
        al.details,
        al.created_at,
        usr.full_name AS user_name,
        usr.email AS user_email,
        usr.role AS user_role
      FROM activity_log al
      LEFT JOIN users usr ON al.user_id = usr.id
      ORDER BY al.created_at DESC
      LIMIT 100
    `).all();

    return res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (err) {
    console.error('Error fetching activity log:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve activity log.' });
  }
});

// ============================================================================
// PAGE ROUTES (Serving complete HTML views)
// ============================================================================

// GET / - Login page
app.get('/', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// GET /register - Register page
app.get('/register', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// GET /dashboard - Dashboard (redirects based on role)
app.get('/dashboard', requireAuth, (req, res) => {
  const role = req.session.user.role;
  if (role === 'admin') {
    return res.redirect('/admin/dashboard');
  } else if (role === 'manager') {
    return res.redirect('/manager/dashboard');
  } else {
    if (fs.existsSync(path.join(__dirname, 'public', 'student', 'dashboard.html'))) {
      return res.sendFile(path.join(__dirname, 'public', 'student', 'dashboard.html'));
    }
    return res.sendFile(path.join(__dirname, 'public', 'student-dashboard.html'));
  }
});

// Student App Page Routes
app.get(['/student', '/student/dashboard'], requireRole('student', 'admin'), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'student', 'dashboard.html'));
});
app.get('/student/profile', requireRole('student', 'admin'), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'student', 'profile.html'));
});
app.get('/student/universities', requireRole('student', 'admin'), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'student', 'universities.html'));
});
app.get('/student/applications', requireRole('student', 'admin'), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'student', 'applications.html'));
});
app.get('/student/merit-list', requireRole('student', 'admin'), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'student', 'merit-list.html'));
});
app.get('/student/payments', requireRole('student', 'admin'), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'student', 'payments.html'));
});
app.get('/student/notifications', requireRole('student', 'admin'), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'student', 'notifications.html'));
});

// GET /profile - Profile page
app.get('/profile', requireAuth, (req, res) => {
  if (req.session && req.session.user && req.session.user.role === 'student') {
    return res.sendFile(path.join(__dirname, 'public', 'student', 'profile.html'));
  }
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// Additional App Page Routes
app.get('/universities', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'universities.html'));
});

app.get('/my-applications', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'applications.html'));
});

app.get('/suggestions', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'suggestions.html'));
});

app.get('/merit-list', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'merit-list.html'));
});

app.get(['/admin', '/admin/dashboard', '/admin/dashboard.html'], requireRole('admin'), (req, res) => {
  if (fs.existsSync(path.join(__dirname, 'public', 'admin', 'dashboard.html'))) {
    return res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html'));
  }
  res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

app.get(['/admin/students', '/admin/students.html'], requireRole('admin'), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'students.html'));
});

app.get(['/admin/managers', '/admin/managers.html'], requireRole('admin'), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'managers.html'));
});

app.get(['/admin/applications', '/admin/applications.html'], requireRole('admin'), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'applications.html'));
});

app.get(['/admin/payments', '/admin/payments.html'], requireRole('admin'), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'payments.html'));
});

app.get(['/admin/notices', '/admin/notices.html'], requireRole('admin'), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'notices.html'));
});

app.get(['/admin/records', '/admin/records.html'], requireRole('admin'), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'records.html'));
});

app.get('/manager/dashboard', requireRole('manager', 'admin'), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'manager', 'dashboard.html'));
});

app.get('/manager', requireRole('manager', 'admin'), (req, res) => {
  res.redirect('/manager/dashboard.html');
});

// 404 Handler
app.use((req, res) => {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: `Endpoint not found: ${req.originalUrl}` });
  }
  res.status(404).send(`
    <!DOCTYPE html>
    <html><head><title>404 Not Found - UniAdmit</title></head>
    <body style="font-family:system-ui,sans-serif;text-align:center;padding:50px;">
      <h2>404 - Page Not Found</h2>
      <p>The requested URL was not found on this server.</p>
      <a href="/" style="color:#2563eb;">Return to Home</a>
    </body></html>
  `);
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(` UniAdmit Server running at: http://localhost:${PORT}`);
    console.log(` Environment: Production Ready`);
    console.log(` Database: SQLite (WAL Mode enabled)`);
    console.log(`=========================================`);
  });
}

module.exports = app;

