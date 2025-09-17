import { db } from '../db';
import { usersTable, coursesTable, lessonsTable, subscriptionsTable, assignmentSubmissionsTable, assignmentsTable, courseEnrollmentsTable } from '../db/schema';
import { type DashboardStats } from '../schema';
import { eq, count, and, desc, sql, inArray } from 'drizzle-orm';

export async function getDashboardStats(userId: number, userRole: string): Promise<DashboardStats> {
  try {
    // For administrators: get platform-wide statistics
    if (userRole === 'administrator') {
      return await getAdministratorStats();
    }
    
    // For moderators: get statistics for courses they own
    if (userRole === 'moderator') {
      return await getModeratorStats(userId);
    }
    
    // For students: return empty stats (they shouldn't access dashboard stats)
    return {
      total_students: 0,
      total_courses: 0,
      total_lessons: 0,
      active_subscriptions: 0,
      recent_activities: []
    };
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
    throw error;
  }
}

async function getAdministratorStats(): Promise<DashboardStats> {
  // Get total counts
  const [studentsResult] = await db.select({ count: count() })
    .from(usersTable)
    .where(eq(usersTable.role, 'student'))
    .execute();

  const [coursesResult] = await db.select({ count: count() })
    .from(coursesTable)
    .execute();

  const [lessonsResult] = await db.select({ count: count() })
    .from(lessonsTable)
    .execute();

  const [subscriptionsResult] = await db.select({ count: count() })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.status, 'active'))
    .execute();

  // Get recent activities (recent assignment submissions)
  const recentActivities = await db.select({
    id: assignmentSubmissionsTable.id,
    type: sql<string>`'assignment_submission'`,
    description: sql<string>`concat('Assignment submission for: ', ${assignmentsTable.title})`,
    created_at: assignmentSubmissionsTable.submitted_at,
    user_name: sql<string>`concat(${usersTable.first_name}, ' ', ${usersTable.last_name})`
  })
    .from(assignmentSubmissionsTable)
    .innerJoin(usersTable, eq(assignmentSubmissionsTable.student_id, usersTable.id))
    .innerJoin(assignmentsTable, eq(assignmentSubmissionsTable.assignment_id, assignmentsTable.id))
    .orderBy(desc(assignmentSubmissionsTable.submitted_at))
    .limit(10)
    .execute();

  return {
    total_students: studentsResult.count,
    total_courses: coursesResult.count,
    total_lessons: lessonsResult.count,
    active_subscriptions: subscriptionsResult.count,
    recent_activities: recentActivities.map(activity => ({
      id: activity.id,
      type: activity.type,
      description: activity.description,
      created_at: activity.created_at,
      user_name: activity.user_name
    }))
  };
}

async function getModeratorStats(userId: number): Promise<DashboardStats> {
  // Get courses owned by the moderator
  const ownedCourses = await db.select({ id: coursesTable.id })
    .from(coursesTable)
    .where(eq(coursesTable.owner_id, userId))
    .execute();

  const courseIds = ownedCourses.map(course => course.id);

  if (courseIds.length === 0) {
    return {
      total_students: 0,
      total_courses: 0,
      total_lessons: 0,
      active_subscriptions: 0,
      recent_activities: []
    };
  }

  // Get unique students enrolled in moderator's courses
  const enrolledStudents = await db.selectDistinct({ student_id: courseEnrollmentsTable.student_id })
    .from(courseEnrollmentsTable)
    .innerJoin(usersTable, eq(courseEnrollmentsTable.student_id, usersTable.id))
    .where(
      and(
        inArray(courseEnrollmentsTable.course_id, courseIds),
        eq(usersTable.role, 'student')
      )
    )
    .execute();

  // Get total courses owned by moderator
  const [coursesResult] = await db.select({ count: count() })
    .from(coursesTable)
    .where(eq(coursesTable.owner_id, userId))
    .execute();

  // Get lessons in moderator's courses
  const [lessonsResult] = await db.select({ count: count() })
    .from(lessonsTable)
    .where(inArray(lessonsTable.course_id, courseIds))
    .execute();

  // Get active subscriptions for moderator's courses
  const [subscriptionsResult] = await db.select({ count: count() })
    .from(subscriptionsTable)
    .where(
      and(
        eq(subscriptionsTable.status, 'active'),
        inArray(subscriptionsTable.course_id, courseIds)
      )
    )
    .execute();

  // Get recent activities for moderator's courses
  const recentActivities = await db.select({
    id: assignmentSubmissionsTable.id,
    type: sql<string>`'assignment_submission'`,
    description: sql<string>`concat('Assignment submission for: ', ${assignmentsTable.title})`,
    created_at: assignmentSubmissionsTable.submitted_at,
    user_name: sql<string>`concat(${usersTable.first_name}, ' ', ${usersTable.last_name})`
  })
    .from(assignmentSubmissionsTable)
    .innerJoin(usersTable, eq(assignmentSubmissionsTable.student_id, usersTable.id))
    .innerJoin(assignmentsTable, eq(assignmentSubmissionsTable.assignment_id, assignmentsTable.id))
    .innerJoin(lessonsTable, eq(assignmentsTable.lesson_id, lessonsTable.id))
    .where(inArray(lessonsTable.course_id, courseIds))
    .orderBy(desc(assignmentSubmissionsTable.submitted_at))
    .limit(10)
    .execute();

  return {
    total_students: enrolledStudents.length,
    total_courses: coursesResult.count,
    total_lessons: lessonsResult.count,
    active_subscriptions: subscriptionsResult.count,
    recent_activities: recentActivities.map(activity => ({
      id: activity.id,
      type: activity.type,
      description: activity.description,
      created_at: activity.created_at,
      user_name: activity.user_name
    }))
  };
}