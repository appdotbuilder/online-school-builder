import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getUsers, getUserById } from '../handlers/get_users';
import { eq } from 'drizzle-orm';

// Test data for users
const createTestUsers = async () => {
  const passwordHash = 'hashed_password_123';
  
  const users = await db.insert(usersTable)
    .values([
      {
        email: 'admin@example.com',
        password_hash: passwordHash,
        first_name: 'Admin',
        last_name: 'User',
        role: 'administrator'
      },
      {
        email: 'moderator@example.com',
        password_hash: passwordHash,
        first_name: 'Moderator',
        last_name: 'User',
        role: 'moderator'
      },
      {
        email: 'student1@example.com',
        password_hash: passwordHash,
        first_name: 'John',
        last_name: 'Student',
        role: 'student'
      },
      {
        email: 'student2@example.com',
        password_hash: passwordHash,
        first_name: 'Jane',
        last_name: 'Student',
        role: 'student'
      }
    ])
    .returning()
    .execute();

  return users;
};

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all users when no role filter is provided', async () => {
    const testUsers = await createTestUsers();

    const result = await getUsers();

    expect(result).toHaveLength(4);
    expect(result.map(u => u.email).sort()).toEqual([
      'admin@example.com',
      'moderator@example.com',
      'student1@example.com',
      'student2@example.com'
    ]);

    // Verify all user fields are present
    const firstUser = result[0];
    expect(firstUser.id).toBeDefined();
    expect(firstUser.email).toBeDefined();
    expect(firstUser.password_hash).toBeDefined();
    expect(firstUser.first_name).toBeDefined();
    expect(firstUser.last_name).toBeDefined();
    expect(firstUser.role).toBeDefined();
    expect(firstUser.created_at).toBeInstanceOf(Date);
    expect(firstUser.updated_at).toBeInstanceOf(Date);
  });

  it('should filter users by role when role is provided', async () => {
    await createTestUsers();

    const studentResult = await getUsers('student');
    expect(studentResult).toHaveLength(2);
    expect(studentResult.every(u => u.role === 'student')).toBe(true);
    expect(studentResult.map(u => u.email).sort()).toEqual([
      'student1@example.com',
      'student2@example.com'
    ]);

    const adminResult = await getUsers('administrator');
    expect(adminResult).toHaveLength(1);
    expect(adminResult[0].role).toBe('administrator');
    expect(adminResult[0].email).toBe('admin@example.com');

    const moderatorResult = await getUsers('moderator');
    expect(moderatorResult).toHaveLength(1);
    expect(moderatorResult[0].role).toBe('moderator');
    expect(moderatorResult[0].email).toBe('moderator@example.com');
  });

  it('should handle invalid role filter gracefully', async () => {
    await createTestUsers();

    // Invalid role should throw an error due to enum constraint
    await expect(getUsers('invalid_role' as any)).rejects.toThrow(/invalid input value for enum/i);
  });

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();
    expect(result).toHaveLength(0);
  });

  it('should return empty array when filtering with no matching role', async () => {
    await createTestUsers();

    // Use a valid role but no users have it after we delete them
    await db.delete(usersTable).where(eq(usersTable.role, 'student')).execute();
    
    const result = await getUsers('student');
    expect(result).toHaveLength(0);
  });
});

describe('getUserById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when user exists', async () => {
    const testUsers = await createTestUsers();
    const targetUser = testUsers[0];

    const result = await getUserById(targetUser.id);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(targetUser.id);
    expect(result!.email).toBe(targetUser.email);
    expect(result!.first_name).toBe(targetUser.first_name);
    expect(result!.last_name).toBe(targetUser.last_name);
    expect(result!.role).toBe(targetUser.role);
    expect(result!.password_hash).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when user does not exist', async () => {
    await createTestUsers();

    const result = await getUserById(99999);
    expect(result).toBeNull();
  });

  it('should return null when no users exist in database', async () => {
    const result = await getUserById(1);
    expect(result).toBeNull();
  });

  it('should handle different user roles correctly', async () => {
    const testUsers = await createTestUsers();
    
    for (const testUser of testUsers) {
      const result = await getUserById(testUser.id);
      expect(result).not.toBeNull();
      expect(result!.role).toBe(testUser.role);
      expect(['administrator', 'moderator', 'student']).toContain(result!.role);
    }
  });
});