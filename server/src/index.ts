import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  createCourseInputSchema,
  updateCourseInputSchema,
  createLessonInputSchema,
  updateLessonInputSchema,
  createLessonContentInputSchema,
  updateLessonContentInputSchema,
  createTestInputSchema,
  createTestQuestionInputSchema,
  createAssignmentInputSchema,
  createAssignmentSubmissionInputSchema,
  gradeAssignmentInputSchema,
  createSubscriptionInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUsers, getUserById } from './handlers/get_users';
import { createCourse } from './handlers/create_course';
import { getCourses } from './handlers/get_courses';
import { updateCourse } from './handlers/update_course';
import { createLesson } from './handlers/create_lesson';
import { getLessonsByCourse } from './handlers/get_lessons';
import { updateLesson } from './handlers/update_lesson';
import { createLessonContent } from './handlers/create_lesson_content';
import { getLessonContent } from './handlers/get_lesson_content';
import { updateLessonContent } from './handlers/update_lesson_content';
import { createTest } from './handlers/create_test';
import { createTestQuestion } from './handlers/create_test_question';
import { getTestQuestions } from './handlers/get_test_questions';
import { createAssignment } from './handlers/create_assignment';
import { submitAssignment } from './handlers/submit_assignment';
import { gradeAssignment } from './handlers/grade_assignment';
import { getAssignmentSubmissions, getStudentSubmissions } from './handlers/get_assignment_submissions';
import { enrollStudent } from './handlers/enroll_student';
import { getStudentProgress, updateStudentProgress } from './handlers/get_student_progress';
import { createSubscription } from './handlers/create_subscription';
import { getUserSubscriptions, getCourseSubscriptions } from './handlers/get_subscriptions';
import { uploadFile, getFilesByUser } from './handlers/upload_file';
import { getDashboardStats } from './handlers/get_dashboard_stats';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  getUsers: publicProcedure
    .input(z.object({ role: z.string().optional() }))
    .query(({ input }) => getUsers(input.role)),

  getUserById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getUserById(input.id)),

  // Course management
  createCourse: publicProcedure
    .input(createCourseInputSchema)
    .mutation(({ input }) => createCourse(input)),

  getCourses: publicProcedure
    .query(() => getCourses()),

  updateCourse: publicProcedure
    .input(updateCourseInputSchema)
    .mutation(({ input }) => updateCourse(input)),

  // Lesson management
  createLesson: publicProcedure
    .input(createLessonInputSchema)
    .mutation(({ input }) => createLesson(input)),

  getLessonsByCourse: publicProcedure
    .input(z.object({ courseId: z.number() }))
    .query(({ input }) => getLessonsByCourse(input.courseId)),

  updateLesson: publicProcedure
    .input(updateLessonInputSchema)
    .mutation(({ input }) => updateLesson(input)),

  // Lesson content management
  createLessonContent: publicProcedure
    .input(createLessonContentInputSchema)
    .mutation(({ input }) => createLessonContent(input)),

  getLessonContent: publicProcedure
    .input(z.object({ lessonId: z.number() }))
    .query(({ input }) => getLessonContent(input.lessonId)),

  updateLessonContent: publicProcedure
    .input(updateLessonContentInputSchema)
    .mutation(({ input }) => updateLessonContent(input)),

  // Test management
  createTest: publicProcedure
    .input(createTestInputSchema)
    .mutation(({ input }) => createTest(input)),

  createTestQuestion: publicProcedure
    .input(createTestQuestionInputSchema)
    .mutation(({ input }) => createTestQuestion(input)),

  getTestQuestions: publicProcedure
    .input(z.object({ testId: z.number() }))
    .query(({ input }) => getTestQuestions(input.testId)),

  // Assignment management
  createAssignment: publicProcedure
    .input(createAssignmentInputSchema)
    .mutation(({ input }) => createAssignment(input)),

  submitAssignment: publicProcedure
    .input(createAssignmentSubmissionInputSchema)
    .mutation(({ input }) => submitAssignment(input)),

  gradeAssignment: publicProcedure
    .input(gradeAssignmentInputSchema)
    .mutation(({ input }) => gradeAssignment(input)),

  getAssignmentSubmissions: publicProcedure
    .input(z.object({ assignmentId: z.number() }))
    .query(({ input }) => getAssignmentSubmissions(input.assignmentId)),

  getStudentSubmissions: publicProcedure
    .input(z.object({ studentId: z.number() }))
    .query(({ input }) => getStudentSubmissions(input.studentId)),

  // Student enrollment and progress
  enrollStudent: publicProcedure
    .input(z.object({ courseId: z.number(), studentId: z.number() }))
    .mutation(({ input }) => enrollStudent(input.courseId, input.studentId)),

  getStudentProgress: publicProcedure
    .input(z.object({ studentId: z.number(), courseId: z.number().optional() }))
    .query(({ input }) => getStudentProgress(input.studentId, input.courseId)),

  updateStudentProgress: publicProcedure
    .input(z.object({
      studentId: z.number(),
      lessonId: z.number(),
      timeSpent: z.number(),
      completed: z.boolean().optional()
    }))
    .mutation(({ input }) => updateStudentProgress(input.studentId, input.lessonId, input.timeSpent, input.completed)),

  // Subscription management
  createSubscription: publicProcedure
    .input(createSubscriptionInputSchema)
    .mutation(({ input }) => createSubscription(input)),

  getUserSubscriptions: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserSubscriptions(input.userId)),

  getCourseSubscriptions: publicProcedure
    .input(z.object({ courseId: z.number() }))
    .query(({ input }) => getCourseSubscriptions(input.courseId)),

  // File management
  uploadFile: publicProcedure
    .input(z.object({
      filename: z.string(),
      originalFilename: z.string(),
      filePath: z.string(),
      fileSize: z.number(),
      mimeType: z.string(),
      uploadedBy: z.number()
    }))
    .mutation(({ input }) => uploadFile(
      input.filename,
      input.originalFilename,
      input.filePath,
      input.fileSize,
      input.mimeType,
      input.uploadedBy
    )),

  getFilesByUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getFilesByUser(input.userId)),

  // Dashboard and analytics
  getDashboardStats: publicProcedure
    .input(z.object({ userId: z.number(), userRole: z.string() }))
    .query(({ input }) => getDashboardStats(input.userId, input.userRole)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();