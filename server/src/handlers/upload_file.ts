import { db } from '../db';
import { filesTable, usersTable } from '../db/schema';
import { type File } from '../schema';
import { eq } from 'drizzle-orm';

export async function uploadFile(
    filename: string,
    originalFilename: string,
    filePath: string,
    fileSize: number,
    mimeType: string,
    uploadedBy: number
): Promise<File> {
  try {
    // Verify that the user exists before creating the file record
    const userExists = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, uploadedBy))
      .execute();

    if (userExists.length === 0) {
      throw new Error(`User with ID ${uploadedBy} not found`);
    }

    // Insert file record
    const result = await db.insert(filesTable)
      .values({
        filename,
        original_filename: originalFilename,
        file_path: filePath,
        file_size: fileSize,
        mime_type: mimeType,
        uploaded_by: uploadedBy
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('File upload failed:', error);
    throw error;
  }
}

export async function getFilesByUser(userId: number): Promise<File[]> {
  try {
    // Verify that the user exists
    const userExists = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (userExists.length === 0) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // Get all files uploaded by the user
    const files = await db.select()
      .from(filesTable)
      .where(eq(filesTable.uploaded_by, userId))
      .execute();

    return files;
  } catch (error) {
    console.error('Get files by user failed:', error);
    throw error;
  }
}