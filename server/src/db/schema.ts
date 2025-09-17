import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['administrator', 'moderator', 'student']);
export const contentTypeEnum = pgEnum('content_type', ['text', 'video', 'file', 'test']);
export const questionTypeEnum = pgEnum('question_type', ['multiple_choice', 'true_false', 'short_answer', 'essay']);
export const evaluationTypeEnum = pgEnum('evaluation_type', ['automatic', 'manual']);
export const assignmentStatusEnum = pgEnum('assignment_status', ['pending', 'submitted', 'graded', 'returned']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'expired', 'cancelled', 'pending']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  role: userRoleEnum('role').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Courses table
export const coursesTable = pgTable('courses', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  owner_id: integer('owner_id').notNull().references(() => usersTable.id),
  is_public: boolean('is_public').default(false).notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Lessons table
export const lessonsTable = pgTable('lessons', {
  id: serial('id').primaryKey(),
  course_id: integer('course_id').notNull().references(() => coursesTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  order_index: integer('order_index').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Lesson content table
export const lessonContentTable = pgTable('lesson_content', {
  id: serial('id').primaryKey(),
  lesson_id: integer('lesson_id').notNull().references(() => lessonsTable.id, { onDelete: 'cascade' }),
  content_type: contentTypeEnum('content_type').notNull(),
  title: text('title').notNull(),
  content_data: text('content_data').notNull(), // JSON string for flexible content storage
  order_index: integer('order_index').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Files table for educational material storage
export const filesTable = pgTable('files', {
  id: serial('id').primaryKey(),
  filename: text('filename').notNull(),
  original_filename: text('original_filename').notNull(),
  file_path: text('file_path').notNull(),
  file_size: integer('file_size').notNull(),
  mime_type: text('mime_type').notNull(),
  uploaded_by: integer('uploaded_by').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Tests table
export const testsTable = pgTable('tests', {
  id: serial('id').primaryKey(),
  lesson_content_id: integer('lesson_content_id').notNull().references(() => lessonContentTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  time_limit: integer('time_limit'), // in minutes
  max_attempts: integer('max_attempts'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Test questions table
export const testQuestionsTable = pgTable('test_questions', {
  id: serial('id').primaryKey(),
  test_id: integer('test_id').notNull().references(() => testsTable.id, { onDelete: 'cascade' }),
  question_type: questionTypeEnum('question_type').notNull(),
  question_text: text('question_text').notNull(),
  options: text('options'), // JSON string for multiple choice options
  correct_answer: text('correct_answer').notNull(),
  points: integer('points').notNull(),
  order_index: integer('order_index').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Assignments table
export const assignmentsTable = pgTable('assignments', {
  id: serial('id').primaryKey(),
  lesson_id: integer('lesson_id').notNull().references(() => lessonsTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  evaluation_type: evaluationTypeEnum('evaluation_type').notNull(),
  due_date: timestamp('due_date'),
  max_points: integer('max_points').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Assignment submissions table
export const assignmentSubmissionsTable = pgTable('assignment_submissions', {
  id: serial('id').primaryKey(),
  assignment_id: integer('assignment_id').notNull().references(() => assignmentsTable.id, { onDelete: 'cascade' }),
  student_id: integer('student_id').notNull().references(() => usersTable.id),
  submission_data: text('submission_data').notNull(), // JSON string for flexible submission data
  status: assignmentStatusEnum('status').default('pending').notNull(),
  score: integer('score'),
  feedback: text('feedback'),
  submitted_at: timestamp('submitted_at').defaultNow().notNull(),
  graded_at: timestamp('graded_at'),
  graded_by: integer('graded_by').references(() => usersTable.id),
});

// Student progress table
export const studentProgressTable = pgTable('student_progress', {
  id: serial('id').primaryKey(),
  student_id: integer('student_id').notNull().references(() => usersTable.id),
  lesson_id: integer('lesson_id').notNull().references(() => lessonsTable.id, { onDelete: 'cascade' }),
  completed: boolean('completed').default(false).notNull(),
  completion_date: timestamp('completion_date'),
  time_spent: integer('time_spent').default(0).notNull(), // in minutes
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Course enrollments table
export const courseEnrollmentsTable = pgTable('course_enrollments', {
  id: serial('id').primaryKey(),
  course_id: integer('course_id').notNull().references(() => coursesTable.id, { onDelete: 'cascade' }),
  student_id: integer('student_id').notNull().references(() => usersTable.id),
  enrolled_at: timestamp('enrolled_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at'),
  progress_percentage: integer('progress_percentage').default(0).notNull(),
});

// Subscriptions table
export const subscriptionsTable = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  course_id: integer('course_id').notNull().references(() => coursesTable.id),
  status: subscriptionStatusEnum('status').default('pending').notNull(),
  start_date: timestamp('start_date').notNull(),
  end_date: timestamp('end_date').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  ownedCourses: many(coursesTable),
  enrollments: many(courseEnrollmentsTable),
  progress: many(studentProgressTable),
  submissions: many(assignmentSubmissionsTable),
  subscriptions: many(subscriptionsTable),
  uploadedFiles: many(filesTable),
}));

export const coursesRelations = relations(coursesTable, ({ one, many }) => ({
  owner: one(usersTable, {
    fields: [coursesTable.owner_id],
    references: [usersTable.id],
  }),
  lessons: many(lessonsTable),
  enrollments: many(courseEnrollmentsTable),
  subscriptions: many(subscriptionsTable),
}));

export const lessonsRelations = relations(lessonsTable, ({ one, many }) => ({
  course: one(coursesTable, {
    fields: [lessonsTable.course_id],
    references: [coursesTable.id],
  }),
  content: many(lessonContentTable),
  assignments: many(assignmentsTable),
  progress: many(studentProgressTable),
}));

export const lessonContentRelations = relations(lessonContentTable, ({ one, many }) => ({
  lesson: one(lessonsTable, {
    fields: [lessonContentTable.lesson_id],
    references: [lessonsTable.id],
  }),
  tests: many(testsTable),
}));

export const testsRelations = relations(testsTable, ({ one, many }) => ({
  lessonContent: one(lessonContentTable, {
    fields: [testsTable.lesson_content_id],
    references: [lessonContentTable.id],
  }),
  questions: many(testQuestionsTable),
}));

export const testQuestionsRelations = relations(testQuestionsTable, ({ one }) => ({
  test: one(testsTable, {
    fields: [testQuestionsTable.test_id],
    references: [testsTable.id],
  }),
}));

export const assignmentsRelations = relations(assignmentsTable, ({ one, many }) => ({
  lesson: one(lessonsTable, {
    fields: [assignmentsTable.lesson_id],
    references: [lessonsTable.id],
  }),
  submissions: many(assignmentSubmissionsTable),
}));

export const assignmentSubmissionsRelations = relations(assignmentSubmissionsTable, ({ one }) => ({
  assignment: one(assignmentsTable, {
    fields: [assignmentSubmissionsTable.assignment_id],
    references: [assignmentsTable.id],
  }),
  student: one(usersTable, {
    fields: [assignmentSubmissionsTable.student_id],
    references: [usersTable.id],
  }),
  gradedBy: one(usersTable, {
    fields: [assignmentSubmissionsTable.graded_by],
    references: [usersTable.id],
  }),
}));

export const studentProgressRelations = relations(studentProgressTable, ({ one }) => ({
  student: one(usersTable, {
    fields: [studentProgressTable.student_id],
    references: [usersTable.id],
  }),
  lesson: one(lessonsTable, {
    fields: [studentProgressTable.lesson_id],
    references: [lessonsTable.id],
  }),
}));

export const courseEnrollmentsRelations = relations(courseEnrollmentsTable, ({ one }) => ({
  course: one(coursesTable, {
    fields: [courseEnrollmentsTable.course_id],
    references: [coursesTable.id],
  }),
  student: one(usersTable, {
    fields: [courseEnrollmentsTable.student_id],
    references: [usersTable.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [subscriptionsTable.user_id],
    references: [usersTable.id],
  }),
  course: one(coursesTable, {
    fields: [subscriptionsTable.course_id],
    references: [coursesTable.id],
  }),
}));

export const filesRelations = relations(filesTable, ({ one }) => ({
  uploadedBy: one(usersTable, {
    fields: [filesTable.uploaded_by],
    references: [usersTable.id],
  }),
}));

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  courses: coursesTable,
  lessons: lessonsTable,
  lessonContent: lessonContentTable,
  files: filesTable,
  tests: testsTable,
  testQuestions: testQuestionsTable,
  assignments: assignmentsTable,
  assignmentSubmissions: assignmentSubmissionsTable,
  studentProgress: studentProgressTable,
  courseEnrollments: courseEnrollmentsTable,
  subscriptions: subscriptionsTable,
};

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Course = typeof coursesTable.$inferSelect;
export type NewCourse = typeof coursesTable.$inferInsert;

export type Lesson = typeof lessonsTable.$inferSelect;
export type NewLesson = typeof lessonsTable.$inferInsert;

export type LessonContent = typeof lessonContentTable.$inferSelect;
export type NewLessonContent = typeof lessonContentTable.$inferInsert;

export type File = typeof filesTable.$inferSelect;
export type NewFile = typeof filesTable.$inferInsert;

export type Test = typeof testsTable.$inferSelect;
export type NewTest = typeof testsTable.$inferInsert;

export type TestQuestion = typeof testQuestionsTable.$inferSelect;
export type NewTestQuestion = typeof testQuestionsTable.$inferInsert;

export type Assignment = typeof assignmentsTable.$inferSelect;
export type NewAssignment = typeof assignmentsTable.$inferInsert;

export type AssignmentSubmission = typeof assignmentSubmissionsTable.$inferSelect;
export type NewAssignmentSubmission = typeof assignmentSubmissionsTable.$inferInsert;

export type StudentProgress = typeof studentProgressTable.$inferSelect;
export type NewStudentProgress = typeof studentProgressTable.$inferInsert;

export type CourseEnrollment = typeof courseEnrollmentsTable.$inferSelect;
export type NewCourseEnrollment = typeof courseEnrollmentsTable.$inferInsert;

export type Subscription = typeof subscriptionsTable.$inferSelect;
export type NewSubscription = typeof subscriptionsTable.$inferInsert;