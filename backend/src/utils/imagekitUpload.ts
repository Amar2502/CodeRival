import imagekit from "../config/imagekit";

export interface ImageKitUploadResult {
  avatar_url: string;
  avatar_id: string;
}

/**
 * Uploads a file buffer or base64 string to ImageKit
 */
export const uploadAvatarToImageKit = async (
  fileBuffer: Buffer | string,
  oldAvatarId?: string | null
): Promise<ImageKitUploadResult> => {
  // If old avatar was stored on ImageKit, attempt deletion
  if (oldAvatarId && !oldAvatarId.startsWith("local_")) {
    try {
      await imagekit.deleteFile(oldAvatarId);
    } catch (err) {
      console.warn("Could not delete old avatar from ImageKit:", err);
    }
  }

  // Attempt ImageKit upload
  try {
    const fileName = `avatar_${Date.now()}`;
    const result = await imagekit.upload({
      file: fileBuffer,
      fileName,
      folder: "/coderival_avatars",
      useUniqueFileName: true,
    });

    return {
      avatar_url: result.url,
      avatar_id: result.fileId,
    };
  } catch (error: any) {
    console.error("ImageKit avatar upload failed:", error?.message || error);
    throw new Error("Failed to upload avatar to cloud storage. Please try again later.");
  }
};

/**
 * Deletes an avatar from ImageKit
 */
export const deleteAvatarFromImageKit = async (avatarId: string): Promise<void> => {
  if (!avatarId || avatarId.startsWith("local_")) return;
  try {
    await imagekit.deleteFile(avatarId);
  } catch (err) {
    console.warn("Failed to delete avatar from ImageKit:", err);
  }
};
