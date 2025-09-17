import { db } from '../db';
import { subscriptionsTable, usersTable, coursesTable } from '../db/schema';
import { type CreateSubscriptionInput, type Subscription } from '../schema';
import { eq, and, or } from 'drizzle-orm';

export async function createSubscription(input: CreateSubscriptionInput): Promise<Subscription> {
  try {
    // Validate that user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with ID ${input.user_id} does not exist`);
    }

    // Validate that course exists
    const course = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, input.course_id))
      .execute();

    if (course.length === 0) {
      throw new Error(`Course with ID ${input.course_id} does not exist`);
    }

    // Validate date range - start_date should be before end_date
    if (input.start_date >= input.end_date) {
      throw new Error('Start date must be before end date');
    }

    // Check for duplicate active subscriptions for the same user and course
    // An active subscription is one with status 'active' or 'pending'
    const existingActiveSubscriptions = await db.select()
      .from(subscriptionsTable)
      .where(
        and(
          eq(subscriptionsTable.user_id, input.user_id),
          eq(subscriptionsTable.course_id, input.course_id),
          or(
            eq(subscriptionsTable.status, 'active'),
            eq(subscriptionsTable.status, 'pending')
          )
        )
      )
      .execute();

    if (existingActiveSubscriptions.length > 0) {
      throw new Error('User already has an active subscription for this course');
    }

    // Insert the subscription record
    const result = await db.insert(subscriptionsTable)
      .values({
        user_id: input.user_id,
        course_id: input.course_id,
        status: 'pending', // Default status for new subscriptions
        start_date: input.start_date,
        end_date: input.end_date,
        amount: input.amount.toString() // Convert number to string for numeric column
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const subscription = result[0];
    return {
      ...subscription,
      amount: parseFloat(subscription.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Subscription creation failed:', error);
    throw error;
  }
}