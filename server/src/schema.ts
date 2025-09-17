import { z } from 'zod';

// User access levels enum
export const userRoleSchema = z.enum(['administrator', 'moderator', 'student']);
export type UserRole = z.infer<typeof userRoleSchema>;

// Content types for lessons
export const contentTypeSchema = z.enum(['text', 'video', 'file', 'test']);
export type ContentType = z.infer<typeof contentTypeSchema>;

// Test question types
export const questionTypeSchema = z.enum(['multiple_choice', 'true_false', 'short_answer', 'essay']);
export type QuestionType = z.infer<typeof questionTypeSchema>;

// Assignment evaluation types
export const evaluationTypeSchema = z.enum(['automatic', 'manual']);
export type EvaluationType = z.infer<typeof evaluationTypeSchema>;

// Assignment status
export const assignmentStatusSchema = z.enum(['pending', 'submitted', 'graded', 'returned']);
export type AssignmentStatus = z.infer<typeof assignmentStatusSchema>;

// Subscription status
export const subscriptionStatusSchema = z.enum(['active', 'expired', 'cancelled', 'pending']);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  role: userRoleSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Course schema
export const courseSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  owner_id: z.number(),
  is_public: z.boolean(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Course = z.infer<typeof courseSchema>;

// Lesson schema
export const lessonSchema = z.object({
  id: z.number(),
  course_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  order_index: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Lesson = z.infer<typeof lessonSchema>;

// Lesson content schema
export const lessonContentSchema = z.object({
  id: z.number(),
  lesson_id: z.number(),
  content_type: contentTypeSchema,
  title: z.string(),
  content_data: z.string(), // JSON string for flexible content storage
  order_index: z.number().int(),
  created_at: z.coerce.date()
});

export type LessonContent = z.infer<typeof lessonContentSchema>;

// File storage schema
export const fileSchema = z.object({
  id: z.number(),
  filename: z.string(),
  original_filename: z.string(),
  file_path: z.string(),
  file_size: z.number().int(),
  mime_type: z.string(),
  uploaded_by: z.number(),
  created_at: z.coerce.date()
});

export type File = z.infer<typeof fileSchema>;

// Test schema
export const testSchema = z.object({
  id: z.number(),
  lesson_content_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  time_limit: z.number().int().nullable(), // in minutes
  max_attempts: z.number().int().nullable(),
  created_at: z.coerce.date()
});

export type Test = z.infer<typeof testSchema>;

// Test question schema
export const testQuestionSchema = z.object({
  id: z.number(),
  test_id: z.number(),
  question_type: questionTypeSchema,
  question_text: z.string(),
  options: z.string().nullable(), // JSON string for multiple choice options
  correct_answer: z.string(),
  points: z.number().int(),
  order_index: z.number().int(),
  created_at: z.coerce.date()
});

export type TestQuestion = z.infer<typeof testQuestionSchema>;

// Assignment schema
export const assignmentSchema = z.object({
  id: z.number(),
  lesson_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  evaluation_type: evaluationTypeSchema,
  due_date: z.coerce.date().nullable(),
  max_points: z.number().int(),
  created_at: z.coerce.date()
});

export type Assignment = z.infer<typeof assignmentSchema>;

// Student assignment submission schema
export const assignmentSubmissionSchema = z.object({
  id: z.number(),
  assignment_id: z.number(),
  student_id: z.number(),
  submission_data: z.string(), // JSON string for flexible submission data
  status: assignmentStatusSchema,
  score: z.number().int().nullable(),
  feedback: z.string().nullable(),
  submitted_at: z.coerce.date(),
  graded_at: z.coerce.date().nullable(),
  graded_by: z.number().nullable()
});

export type AssignmentSubmission = z.infer<typeof assignmentSubmissionSchema>;

// Student progress schema
export const studentProgressSchema = z.object({
  id: z.number(),
  student_id: z.number(),
  lesson_id: z.number(),
  completed: z.boolean(),
  completion_date: z.coerce.date().nullable(),
  time_spent: z.number().int(), // in minutes
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type StudentProgress = z.infer<typeof studentProgressSchema>;

// Course enrollment schema
export const courseEnrollmentSchema = z.object({
  id: z.number(),
  course_id: z.number(),
  student_id: z.number(),
  enrolled_at: z.coerce.date(),
  completed_at: z.coerce.date().nullable(),
  progress_percentage: z.number().int()
});

export type CourseEnrollment = z.infer<typeof courseEnrollmentSchema>;

// Subscription schema
export const subscriptionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  course_id: z.number(),
  status: subscriptionStatusSchema,
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  amount: z.number(), // Using number for monetary values
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Subscription = z.infer<typeof subscriptionSchema>;

// Input schemas for creating entities

export const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  first_name: z.string(),
  last_name: z.string(),
  role: userRoleSchema
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createCourseInputSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  owner_id: z.number(),
  is_public: z.boolean().optional(),
  is_active: z.boolean().optional()
});

export type CreateCourseInput = z.infer<typeof createCourseInputSchema>;

export const createLessonInputSchema = z.object({
  course_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  order_index: z.number().int()
});

export type CreateLessonInput = z.infer<typeof createLessonInputSchema>;

export const createLessonContentInputSchema = z.object({
  lesson_id: z.number(),
  content_type: contentTypeSchema,
  title: z.string(),
  content_data: z.string(),
  order_index: z.number().int()
});

export type CreateLessonContentInput = z.infer<typeof createLessonContentInputSchema>;

export const createTestInputSchema = z.object({
  lesson_content_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  time_limit: z.number().int().nullable(),
  max_attempts: z.number().int().nullable()
});

export type CreateTestInput = z.infer<typeof createTestInputSchema>;

export const createTestQuestionInputSchema = z.object({
  test_id: z.number(),
  question_type: questionTypeSchema,
  question_text: z.string(),
  options: z.string().nullable(),
  correct_answer: z.string(),
  points: z.number().int(),
  order_index: z.number().int()
});

export type CreateTestQuestionInput = z.infer<typeof createTestQuestionInputSchema>;

export const createAssignmentInputSchema = z.object({
  lesson_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  evaluation_type: evaluationTypeSchema,
  due_date: z.coerce.date().nullable(),
  max_points: z.number().int()
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentInputSchema>;

export const createAssignmentSubmissionInputSchema = z.object({
  assignment_id: z.number(),
  student_id: z.number(),
  submission_data: z.string()
});

export type CreateAssignmentSubmissionInput = z.infer<typeof createAssignmentSubmissionInputSchema>;

export const createSubscriptionInputSchema = z.object({
  user_id: z.number(),
  course_id: z.number(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  amount: z.number().positive()
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionInputSchema>;

// Update schemas

export const updateLessonInputSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  order_index: z.number().int().optional()
});

export type UpdateLessonInput = z.infer<typeof updateLessonInputSchema>;

export const updateLessonContentInputSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  content_data: z.string().optional(),
  order_index: z.number().int().optional()
});

export type UpdateLessonContentInput = z.infer<typeof updateLessonContentInputSchema>;

export const updateCourseInputSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  is_public: z.boolean().optional(),
  is_active: z.boolean().optional()
});

export type UpdateCourseInput = z.infer<typeof updateCourseInputSchema>;

export const gradeAssignmentInputSchema = z.object({
  submission_id: z.number(),
  score: z.number().int(),
  feedback: z.string().nullable(),
  graded_by: z.number()
});

export type GradeAssignmentInput = z.infer<typeof gradeAssignmentInputSchema>;

// Dashboard statistics schema
export const dashboardStatsSchema = z.object({
  total_students: z.number().int(),
  total_courses: z.number().int(),
  total_lessons: z.number().int(),
  active_subscriptions: z.number().int(),
  recent_activities: z.array(z.object({
    id: z.number(),
    type: z.string(),
    description: z.string(),
    created_at: z.coerce.date(),
    user_name: z.string()
  }))
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;