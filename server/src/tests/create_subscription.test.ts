import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { subscriptionsTable, usersTable, coursesTable } from '../db/schema';
import { type CreateSubscriptionInput } from '../schema';
import { createSubscription } from '../handlers/create_subscription';
import { eq, and, or } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'student@example.com',
  password_hash: 'hashedpassword',
  first_name: 'John',
  last_name: 'Doe',
  role: 'student' as const
};

const testCourse = {
  title: 'Test Course',
  description: 'A course for testing',
  owner_id: 1, // Will be set after creating owner
  is_public: true,
  is_active: true
};

const testOwner = {
  email: 'owner@example.com',
  password_hash: 'hashedpassword',
  first_name: 'Jane',
  last_name: 'Smith',
  role: 'administrator' as const
};

describe('createSubscription', () => {
  let userId: number;
  let courseId: number;
  let ownerId: number;

  beforeEach(async () => {
    await createDB();

    // Create owner user first
    const ownerResult = await db.insert(usersTable)
      .values(testOwner)
      .returning()
      .execute();
    ownerId = ownerResult[0].id;

    // Create student user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create course with the owner
    const courseResult = await db.insert(coursesTable)
      .values({ ...testCourse, owner_id: ownerId })
      .returning()
      .execute();
    courseId = courseResult[0].id;
  });

  afterEach(resetDB);

  it('should create a subscription successfully', async () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-12-31');
    
    const input: CreateSubscriptionInput = {
      user_id: userId,
      course_id: courseId,
      start_date: startDate,
      end_date: endDate,
      amount: 99.99
    };

    const result = await createSubscription(input);

    // Verify basic fields
    expect(result.user_id).toEqual(userId);
    expect(result.course_id).toEqual(courseId);
    expect(result.status).toEqual('pending');
    expect(result.start_date).toEqual(startDate);
    expect(result.end_date).toEqual(endDate);
    expect(result.amount).toEqual(99.99);
    expect(typeof result.amount).toEqual('number');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save subscription to database', async () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-12-31');
    
    const input: CreateSubscriptionInput = {
      user_id: userId,
      course_id: courseId,
      start_date: startDate,
      end_date: endDate,
      amount: 149.99
    };

    const result = await createSubscription(input);

    // Query database to verify subscription was saved
    const subscriptions = await db.select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.id, result.id))
      .execute();

    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0].user_id).toEqual(userId);
    expect(subscriptions[0].course_id).toEqual(courseId);
    expect(subscriptions[0].status).toEqual('pending');
    expect(parseFloat(subscriptions[0].amount)).toEqual(149.99);
  });

  it('should handle different amount values correctly', async () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-12-31');
    
    const input: CreateSubscriptionInput = {
      user_id: userId,
      course_id: courseId,
      start_date: startDate,
      end_date: endDate,
      amount: 25.50
    };

    const result = await createSubscription(input);

    expect(result.amount).toEqual(25.50);
    expect(typeof result.amount).toEqual('number');

    // Verify in database
    const subscriptions = await db.select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.id, result.id))
      .execute();

    expect(parseFloat(subscriptions[0].amount)).toEqual(25.50);
  });

  it('should throw error for non-existent user', async () => {
    const input: CreateSubscriptionInput = {
      user_id: 99999, // Non-existent user
      course_id: courseId,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31'),
      amount: 99.99
    };

    await expect(createSubscription(input)).rejects.toThrow(/User with ID 99999 does not exist/i);
  });

  it('should throw error for non-existent course', async () => {
    const input: CreateSubscriptionInput = {
      user_id: userId,
      course_id: 99999, // Non-existent course
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31'),
      amount: 99.99
    };

    await expect(createSubscription(input)).rejects.toThrow(/Course with ID 99999 does not exist/i);
  });

  it('should throw error when start date is after end date', async () => {
    const input: CreateSubscriptionInput = {
      user_id: userId,
      course_id: courseId,
      start_date: new Date('2024-12-31'),
      end_date: new Date('2024-01-01'), // End date before start date
      amount: 99.99
    };

    await expect(createSubscription(input)).rejects.toThrow(/Start date must be before end date/i);
  });

  it('should throw error when start date equals end date', async () => {
    const sameDate = new Date('2024-06-15');
    
    const input: CreateSubscriptionInput = {
      user_id: userId,
      course_id: courseId,
      start_date: sameDate,
      end_date: sameDate, // Same date
      amount: 99.99
    };

    await expect(createSubscription(input)).rejects.toThrow(/Start date must be before end date/i);
  });

  it('should prevent duplicate active subscriptions', async () => {
    // Create first subscription
    const input1: CreateSubscriptionInput = {
      user_id: userId,
      course_id: courseId,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31'),
      amount: 99.99
    };

    await createSubscription(input1);

    // Try to create second subscription for same user and course
    const input2: CreateSubscriptionInput = {
      user_id: userId,
      course_id: courseId,
      start_date: new Date('2024-06-01'),
      end_date: new Date('2025-06-01'),
      amount: 149.99
    };

    await expect(createSubscription(input2)).rejects.toThrow(/User already has an active subscription for this course/i);
  });

  it('should prevent duplicate pending subscriptions', async () => {
    // Create a subscription (defaults to pending status)
    const input1: CreateSubscriptionInput = {
      user_id: userId,
      course_id: courseId,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31'),
      amount: 99.99
    };

    await createSubscription(input1);

    // Try to create another subscription for same user and course
    const input2: CreateSubscriptionInput = {
      user_id: userId,
      course_id: courseId,
      start_date: new Date('2025-01-01'),
      end_date: new Date('2025-12-31'),
      amount: 149.99
    };

    await expect(createSubscription(input2)).rejects.toThrow(/User already has an active subscription for this course/i);
  });

  it('should allow subscription after previous one is cancelled', async () => {
    // Create first subscription
    const input1: CreateSubscriptionInput = {
      user_id: userId,
      course_id: courseId,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31'),
      amount: 99.99
    };

    const firstSubscription = await createSubscription(input1);

    // Cancel the first subscription
    await db.update(subscriptionsTable)
      .set({ status: 'cancelled' })
      .where(eq(subscriptionsTable.id, firstSubscription.id))
      .execute();

    // Now should be able to create a new subscription
    const input2: CreateSubscriptionInput = {
      user_id: userId,
      course_id: courseId,
      start_date: new Date('2025-01-01'),
      end_date: new Date('2025-12-31'),
      amount: 149.99
    };

    const result = await createSubscription(input2);

    expect(result.user_id).toEqual(userId);
    expect(result.course_id).toEqual(courseId);
    expect(result.amount).toEqual(149.99);
    expect(result.status).toEqual('pending');
  });

  it('should allow subscription after previous one is expired', async () => {
    // Create first subscription
    const input1: CreateSubscriptionInput = {
      user_id: userId,
      course_id: courseId,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31'),
      amount: 99.99
    };

    const firstSubscription = await createSubscription(input1);

    // Expire the first subscription
    await db.update(subscriptionsTable)
      .set({ status: 'expired' })
      .where(eq(subscriptionsTable.id, firstSubscription.id))
      .execute();

    // Now should be able to create a new subscription
    const input2: CreateSubscriptionInput = {
      user_id: userId,
      course_id: courseId,
      start_date: new Date('2025-01-01'),
      end_date: new Date('2025-12-31'),
      amount: 149.99
    };

    const result = await createSubscription(input2);

    expect(result.user_id).toEqual(userId);
    expect(result.course_id).toEqual(courseId);
    expect(result.amount).toEqual(149.99);
    expect(result.status).toEqual('pending');
  });

  it('should allow different users to subscribe to the same course', async () => {
    // Create second user
    const secondUser = await db.insert(usersTable)
      .values({
        email: 'student2@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Alice',
        last_name: 'Johnson',
        role: 'student'
      })
      .returning()
      .execute();
    
    const secondUserId = secondUser[0].id;

    // Create subscription for first user
    const input1: CreateSubscriptionInput = {
      user_id: userId,
      course_id: courseId,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31'),
      amount: 99.99
    };

    await createSubscription(input1);

    // Create subscription for second user (should work)
    const input2: CreateSubscriptionInput = {
      user_id: secondUserId,
      course_id: courseId,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31'),
      amount: 99.99
    };

    const result = await createSubscription(input2);

    expect(result.user_id).toEqual(secondUserId);
    expect(result.course_id).toEqual(courseId);
    expect(result.amount).toEqual(99.99);
  });
});