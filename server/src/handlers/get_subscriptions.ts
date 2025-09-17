import { db } from '../db';
import { subscriptionsTable } from '../db/schema';
import { type Subscription } from '../schema';
import { eq } from 'drizzle-orm';

export async function getUserSubscriptions(userId: number): Promise<Subscription[]> {
  try {
    const results = await db.select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.user_id, userId))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(subscription => ({
      ...subscription,
      amount: parseFloat(subscription.amount) // Convert string to number for numeric field
    }));
  } catch (error) {
    console.error('Failed to fetch user subscriptions:', error);
    throw error;
  }
}

export async function getCourseSubscriptions(courseId: number): Promise<Subscription[]> {
  try {
    const results = await db.select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.course_id, courseId))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(subscription => ({
      ...subscription,
      amount: parseFloat(subscription.amount) // Convert string to number for numeric field
    }));
  } catch (error) {
    console.error('Failed to fetch course subscriptions:', error);
    throw error;
  }
}