import * as fs from 'fs/promises';

export async function deleteImage(filename: string) {
  try {
    await fs.unlink(`./${filename}`);
    return { message: 'Image deleted successfully' };
  } catch (error) {
    return { error: 'Error deleting image' };
  }
}
