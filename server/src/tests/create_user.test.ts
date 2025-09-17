import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123',
  first_name: 'John',
  last_name: 'Doe',
  role: 'student'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with valid input', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.role).toEqual('student');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('password123'); // Should be hashed
  });

  it('should hash the password correctly', async () => {
    const result = await createUser(testInput);

    // Password should be hashed using Bun's password hashing
    expect(result.password_hash).not.toEqual(testInput.password);
    expect(result.password_hash.length).toBeGreaterThan(10);
    
    // Verify the hash can be verified
    const isValid = await Bun.password.verify(testInput.password, result.password_hash);
    expect(isValid).toBe(true);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].first_name).toEqual('John');
    expect(users[0].last_name).toEqual('Doe');
    expect(users[0].role).toEqual('student');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create administrator user', async () => {
    const adminInput: CreateUserInput = {
      email: 'admin@example.com',
      password: 'adminpass123',
      first_name: 'Admin',
      last_name: 'User',
      role: 'administrator'
    };

    const result = await createUser(adminInput);

    expect(result.role).toEqual('administrator');
    expect(result.email).toEqual('admin@example.com');
  });

  it('should create moderator user', async () => {
    const modInput: CreateUserInput = {
      email: 'mod@example.com',
      password: 'modpass123',
      first_name: 'Mod',
      last_name: 'User',
      role: 'moderator'
    };

    const result = await createUser(modInput);

    expect(result.role).toEqual('moderator');
    expect(result.email).toEqual('mod@example.com');
  });

  it('should handle unique email constraint', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create second user with same email
    const duplicateInput: CreateUserInput = {
      ...testInput,
      first_name: 'Jane',
      last_name: 'Smith'
    };

    // Should throw an error due to unique email constraint
    await expect(createUser(duplicateInput)).rejects.toThrow();
  });

  it('should create multiple users with different emails', async () => {
    const user1 = await createUser(testInput);
    
    const secondInput: CreateUserInput = {
      email: 'user2@example.com',
      password: 'password456',
      first_name: 'Jane',
      last_name: 'Smith',
      role: 'moderator'
    };
    
    const user2 = await createUser(secondInput);

    expect(user1.id).not.toEqual(user2.id);
    expect(user1.email).toEqual('test@example.com');
    expect(user2.email).toEqual('user2@example.com');
    expect(user1.role).toEqual('student');
    expect(user2.role).toEqual('moderator');

    // Verify both users exist in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(2);
  });

  it('should set timestamps correctly', async () => {
    const beforeCreate = new Date();
    const result = await createUser(testInput);
    const afterCreate = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
  });
});