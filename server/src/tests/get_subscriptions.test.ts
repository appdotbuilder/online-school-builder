import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, subscriptionsTable } from '../db/schema';
import { getUserSubscriptions, getCourseSubscriptions } from '../handlers/get_subscriptions';
import { eq } from 'drizzle-orm';

describe('getUserSubscriptions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should fetch all subscriptions for a user', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hash123',
        first_name: 'John',
        last_name: 'Doe',
        role: 'student'
      })
      .returning()
      .execute();

    // Create test course owner
    const [owner] = await db.insert(usersTable)
      .values({
        email: 'owner@example.com',
        password_hash: 'hash456',
        first_name: 'Course',
        last_name: 'Owner',
        role: 'administrator'
      })
      .returning()
      .execute();

    // Create test course
    const [course] = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        owner_id: owner.id
      })
      .returning()
      .execute();

    // Create subscriptions for the user
    const subscription1Data = {
      user_id: user.id,
      course_id: course.id,
      status: 'active' as const,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31'),
      amount: '99.99' // Insert as string for numeric column
    };

    const subscription2Data = {
      user_id: user.id,
      course_id: course.id,
      status: 'expired' as const,
      start_date: new Date('2023-01-01'),
      end_date: new Date('2023-12-31'),
      amount: '79.99' // Insert as string for numeric column
    };

    await db.insert(subscriptionsTable)
      .values([subscription1Data, subscription2Data])
      .execute();

    // Fetch user subscriptions
    const subscriptions = await getUserSubscriptions(user.id);

    // Verify results
    expect(subscriptions).toHaveLength(2);
    
    // Verify numeric conversion
    subscriptions.forEach(subscription => {
      expect(typeof subscription.amount).toBe('number');
      expect(subscription.user_id).toBe(user.id);
      expect(subscription.course_id).toBe(course.id);
      expect(subscription.id).toBeDefined();
      expect(subscription.created_at).toBeInstanceOf(Date);
      expect(subscription.updated_at).toBeInstanceOf(Date);
    });

    // Verify specific amounts
    const amounts = subscriptions.map(s => s.amount).sort();
    expect(amounts).toEqual([79.99, 99.99]);
  });

  it('should return empty array for user with no subscriptions', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hash123',
        first_name: 'John',
        last_name: 'Doe',
        role: 'student'
      })
      .returning()
      .execute();

    const subscriptions = await getUserSubscriptions(user.id);
    
    expect(subscriptions).toHaveLength(0);
    expect(Array.isArray(subscriptions)).toBe(true);
  });

  it('should only return subscriptions for the specified user', async () => {
    // Create two users
    const [user1] = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hash123',
        first_name: 'User',
        last_name: 'One',
        role: 'student'
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hash456',
        first_name: 'User',
        last_name: 'Two',
        role: 'student'
      })
      .returning()
      .execute();

    // Create course owner
    const [owner] = await db.insert(usersTable)
      .values({
        email: 'owner@example.com',
        password_hash: 'hash789',
        first_name: 'Course',
        last_name: 'Owner',
        role: 'administrator'
      })
      .returning()
      .execute();

    // Create test course
    const [course] = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        owner_id: owner.id
      })
      .returning()
      .execute();

    // Create subscriptions for both users
    await db.insert(subscriptionsTable)
      .values([
        {
          user_id: user1.id,
          course_id: course.id,
          status: 'active' as const,
          start_date: new Date(),
          end_date: new Date(),
          amount: '99.99'
        },
        {
          user_id: user2.id,
          course_id: course.id,
          status: 'active' as const,
          start_date: new Date(),
          end_date: new Date(),
          amount: '149.99'
        }
      ])
      .execute();

    // Get subscriptions for user1 only
    const subscriptions = await getUserSubscriptions(user1.id);

    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0].user_id).toBe(user1.id);
    expect(subscriptions[0].amount).toBe(99.99);
  });
});

describe('getCourseSubscriptions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should fetch all subscriptions for a course', async () => {
    // Create test users
    const [user1] = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hash123',
        first_name: 'User',
        last_name: 'One',
        role: 'student'
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hash456',
        first_name: 'User',
        last_name: 'Two',
        role: 'student'
      })
      .returning()
      .execute();

    // Create course owner
    const [owner] = await db.insert(usersTable)
      .values({
        email: 'owner@example.com',
        password_hash: 'hash789',
        first_name: 'Course',
        last_name: 'Owner',
        role: 'administrator'
      })
      .returning()
      .execute();

    // Create test course
    const [course] = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        owner_id: owner.id
      })
      .returning()
      .execute();

    // Create subscriptions for the course
    const subscriptionsData = [
      {
        user_id: user1.id,
        course_id: course.id,
        status: 'active' as const,
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-12-31'),
        amount: '99.99'
      },
      {
        user_id: user2.id,
        course_id: course.id,
        status: 'pending' as const,
        start_date: new Date('2024-02-01'),
        end_date: new Date('2024-12-31'),
        amount: '149.99'
      }
    ];

    await db.insert(subscriptionsTable)
      .values(subscriptionsData)
      .execute();

    // Fetch course subscriptions
    const subscriptions = await getCourseSubscriptions(course.id);

    // Verify results
    expect(subscriptions).toHaveLength(2);
    
    // Verify all subscriptions belong to the course
    subscriptions.forEach(subscription => {
      expect(subscription.course_id).toBe(course.id);
      expect(typeof subscription.amount).toBe('number');
      expect(subscription.id).toBeDefined();
      expect(subscription.created_at).toBeInstanceOf(Date);
      expect(subscription.updated_at).toBeInstanceOf(Date);
    });

    // Verify different users and amounts
    const userIds = subscriptions.map(s => s.user_id).sort();
    const amounts = subscriptions.map(s => s.amount).sort((a, b) => a - b);
    expect(userIds).toEqual([user1.id, user2.id].sort());
    expect(amounts).toEqual([99.99, 149.99]);
  });

  it('should return empty array for course with no subscriptions', async () => {
    // Create course owner
    const [owner] = await db.insert(usersTable)
      .values({
        email: 'owner@example.com',
        password_hash: 'hash123',
        first_name: 'Course',
        last_name: 'Owner',
        role: 'administrator'
      })
      .returning()
      .execute();

    // Create test course with no subscriptions
    const [course] = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        owner_id: owner.id
      })
      .returning()
      .execute();

    const subscriptions = await getCourseSubscriptions(course.id);
    
    expect(subscriptions).toHaveLength(0);
    expect(Array.isArray(subscriptions)).toBe(true);
  });

  it('should only return subscriptions for the specified course', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        password_hash: 'hash123',
        first_name: 'Test',
        last_name: 'User',
        role: 'student'
      })
      .returning()
      .execute();

    // Create course owner
    const [owner] = await db.insert(usersTable)
      .values({
        email: 'owner@example.com',
        password_hash: 'hash456',
        first_name: 'Course',
        last_name: 'Owner',
        role: 'administrator'
      })
      .returning()
      .execute();

    // Create two courses
    const [course1] = await db.insert(coursesTable)
      .values({
        title: 'Course One',
        description: 'First course',
        owner_id: owner.id
      })
      .returning()
      .execute();

    const [course2] = await db.insert(coursesTable)
      .values({
        title: 'Course Two',
        description: 'Second course',
        owner_id: owner.id
      })
      .returning()
      .execute();

    // Create subscriptions for both courses
    await db.insert(subscriptionsTable)
      .values([
        {
          user_id: user.id,
          course_id: course1.id,
          status: 'active' as const,
          start_date: new Date(),
          end_date: new Date(),
          amount: '99.99'
        },
        {
          user_id: user.id,
          course_id: course2.id,
          status: 'active' as const,
          start_date: new Date(),
          end_date: new Date(),
          amount: '149.99'
        }
      ])
      .execute();

    // Get subscriptions for course1 only
    const subscriptions = await getCourseSubscriptions(course1.id);

    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0].course_id).toBe(course1.id);
    expect(subscriptions[0].amount).toBe(99.99);
  });

  it('should handle multiple subscription statuses correctly', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          password_hash: 'hash1',
          first_name: 'User',
          last_name: 'One',
          role: 'student' as const
        },
        {
          email: 'user2@example.com',
          password_hash: 'hash2',
          first_name: 'User',
          last_name: 'Two',
          role: 'student' as const
        },
        {
          email: 'owner@example.com',
          password_hash: 'hash3',
          first_name: 'Course',
          last_name: 'Owner',
          role: 'administrator' as const
        }
      ])
      .returning()
      .execute();

    const [user1, user2, owner] = users;

    // Create test course
    const [course] = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        owner_id: owner.id
      })
      .returning()
      .execute();

    // Create subscriptions with different statuses
    await db.insert(subscriptionsTable)
      .values([
        {
          user_id: user1.id,
          course_id: course.id,
          status: 'active' as const,
          start_date: new Date(),
          end_date: new Date(),
          amount: '99.99'
        },
        {
          user_id: user2.id,
          course_id: course.id,
          status: 'expired' as const,
          start_date: new Date(),
          end_date: new Date(),
          amount: '79.99'
        }
      ])
      .execute();

    const subscriptions = await getCourseSubscriptions(course.id);

    expect(subscriptions).toHaveLength(2);
    
    const statuses = subscriptions.map(s => s.status).sort();
    expect(statuses).toEqual(['active', 'expired']);

    const amounts = subscriptions.map(s => s.amount).sort();
    expect(amounts).toEqual([79.99, 99.99]);
  });
});