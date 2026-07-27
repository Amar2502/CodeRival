import imagekit from "../config/imagekit";

export interface ImageKitUploadResult {
  avatar_url: string;
  avatar_id: string;
}

/**
 * Uploads a file buffer or base64 string to ImageKit with fallback for invalid credentials or failures
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
    console.warn("ImageKit API Upload Error (falling back to Data URI avatar):", error?.message || error);

    // Fallback: convert fileBuffer to Data URI string if ImageKit fails
    let dataUri = "";
    if (typeof fileBuffer === "string") {
      dataUri = fileBuffer;
    } else {
      dataUri = `data:image/png;base64,${fileBuffer.toString("base64")}`;
    }

    return {
      avatar_url: dataUri,
      avatar_id: `local_${Date.now()}`,
    };
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
