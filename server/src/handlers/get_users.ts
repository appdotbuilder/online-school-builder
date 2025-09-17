import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function getUsers(role?: string): Promise<User[]> {
  try {
    // Apply role filter if provided
    if (role) {
      const results = await db.select()
        .from(usersTable)
        .where(eq(usersTable.role, role as any))
        .execute();
      return results;
    } else {
      const results = await db.select()
        .from(usersTable)
        .execute();
      return results;
    }
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
}

export async function getUserById(id: number): Promise<User | null> {
  try {
    const results = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to fetch user by ID:', error);
    throw error;
  }
}