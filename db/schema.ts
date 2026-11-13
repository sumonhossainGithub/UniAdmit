import { pgTable, text, timestamp, boolean, doublePrecision, integer } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  email: text('email').unique().notNull(),
  password: text('password').notNull(),
  role: text('role').notNull().default('student'), // 'student' | 'admin' | 'manager'
  fullName: text('full_name').notNull(),
  phone: text('phone'),
  profileCompleted: boolean('profile_completed').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const studentProfiles = pgTable('student_profiles', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fatherName: text('father_name'),
  motherName: text('mother_name'),
  dateOfBirth: text('date_of_birth'),
  gender: text('gender'),
  nationality: text('nationality').default('Bangladeshi'),
  nidNumber: text('nid_number'),
  district: text('district'),
  upazila: text('upazila'),
  presentAddress: text('present_address'),
  permanentAddress: text('permanent_address'),
  sscBoard: text('ssc_board'),
  sscRoll: text('ssc_roll'),
  sscYear: text('ssc_year'),
  sscGpa: doublePrecision('ssc_gpa'),
  sscGroup: text('ssc_group'),
  hscBoard: text('hsc_board'),
  hscRoll: text('hsc_roll'),
  hscYear: text('hsc_year'),
  hscGpa: doublePrecision('hsc_gpa'),
  hscGroup: text('hsc_group'),
  photoPath: text('photo_path'),
  signaturePath: text('signature_path'),
  documentsVerified: boolean('documents_verified').default(false),
});

export const universities = pgTable('universities', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  shortName: text('short_name').notNull(),
  location: text('location').notNull(),
  district: text('district').default('Sirajganj'),
  type: text('type').notNull().default('private'), // 'public' | 'private'
  website: text('website'),
  description: text('description'),
  logoUrl: text('logo_url'),
  coverImage: text('cover_image'),
  minGpaSsc: doublePrecision('min_gpa_ssc').default(2.5),
  minGpaHsc: doublePrecision('min_gpa_hsc').default(2.5),
  applicationFee: doublePrecision('application_fee').default(500),
  admissionStart: text('admission_start'),
  admissionEnd: text('admission_end'),
  circularText: text('circular_text'),
  isActive: boolean('is_active').default(true),
});

export const programs = pgTable('programs', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  universityId: text('university_id').notNull().references(() => universities.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  department: text('department').notNull(),
  seats: integer('seats').default(60),
  requiredGroup: text('required_group'), // 'Science' | 'Commerce' | 'Arts' | 'Any'
  minGpa: doublePrecision('min_gpa').default(2.5),
  feePerSemester: doublePrecision('fee_per_semester').default(45000),
});

export const applications = pgTable('applications', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  trackingId: text('tracking_id').unique().notNull(), // e.g. APP-2026-KYAU-1001
  studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  universityId: text('university_id').notNull().references(() => universities.id, { onDelete: 'cascade' }),
  programId: text('program_id').notNull().references(() => programs.id, { onDelete: 'cascade' }),
  applicantName: text('applicant_name').notNull(),
  applicantPhone: text('applicant_phone').notNull(),
  applicantEmail: text('applicant_email'),
  status: text('status').default('pending').notNull(), // 'pending' | 'under_review' | 'approved' | 'rejected' | 'waitlisted'
  paymentStatus: text('payment_status').default('unpaid').notNull(), // 'unpaid' | 'paid' | 'verified'
  paymentAmount: doublePrecision('payment_amount').default(500),
  paymentTransactionId: text('payment_transaction_id'),
  paymentDate: timestamp('payment_date'),
  admitCardGenerated: boolean('admit_card_generated').default(false),
  assignedId: text('assigned_id'),
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notices = pgTable('notices', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  title: text('title').notNull(),
  content: text('content').notNull(),
  category: text('category').default('General'),
  universityId: text('university_id').references(() => universities.id, { onDelete: 'set null' }),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
