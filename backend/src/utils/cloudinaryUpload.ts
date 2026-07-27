import cloudinary from "../config/cloudinary";
import { Readable } from "stream";

export interface CloudinaryUploadResult {
  avatar_url: string;
  avatar_id: string;
}

/**
 * Uploads a file buffer or base64 string to Cloudinary with fallback for invalid credentials
 */
export const uploadAvatarToCloudinary = async (
  fileBuffer: Buffer | string,
  oldAvatarId?: string | null
): Promise<CloudinaryUploadResult> => {
  // If old avatar was stored on Cloudinary, attempt deletion
  if (oldAvatarId && !oldAvatarId.startsWith("local_")) {
    try {
      await cloudinary.uploader.destroy(oldAvatarId);
    } catch (err) {
      console.warn("Could not delete old avatar from Cloudinary:", err);
    }
  }

  // Attempt Cloudinary upload
  try {
    if (typeof fileBuffer === "string") {
      const result = await cloudinary.uploader.upload(fileBuffer, {
        folder: "coderival_avatars",
        resource_type: "image",
      });
      return {
        avatar_url: result.secure_url,
        avatar_id: result.public_id,
      };
    } else {
      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "coderival_avatars",
            resource_type: "image",
          },
          (error, res) => {
            if (error || !res) return reject(error || new Error("Cloudinary upload failed"));
            resolve(res);
          }
        );

        const stream = new Readable();
        stream.push(fileBuffer);
        stream.push(null);
        stream.pipe(uploadStream);
      });

      return {
        avatar_url: result.secure_url,
        avatar_id: result.public_id,
      };
    }
  } catch (error: any) {
    console.warn("Cloudinary API Upload Error (falling back to Data URI avatar):", error?.message || error);

    // Fallback: convert fileBuffer to Data URI string if Cloudinary fails or returns 403
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
 * Deletes an avatar from Cloudinary
 */
export const deleteAvatarFromCloudinary = async (avatarId: string): Promise<void> => {
  if (!avatarId || avatarId.startsWith("local_")) return;
  try {
    await cloudinary.uploader.destroy(avatarId);
  } catch (err) {
    console.warn("Failed to delete avatar from Cloudinary:", err);
  }
};
