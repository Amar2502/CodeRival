import { z } from "zod";

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters.")
  .max(20, "Username cannot exceed 20 characters.")
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "Username can only contain letters, numbers and underscores."
  );

const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters.")
  .max(50, "Name cannot exceed 50 characters.");

const countrySchema = z
  .string()
  .trim()
  .max(60, "Country name cannot exceed 60 characters.")
  .optional();

export const checkUsernameSchema = z.object({
  query: z.object({
    username: usernameSchema,
  }),
});

export const updateUserProfileSchema = z.object({
  body: z
    .object({
      name: nameSchema.optional(),
      username: usernameSchema.optional(),
      country: countrySchema,
    })
    .refine(
      (data) =>
        data.name !== undefined ||
        data.username !== undefined ||
        data.country !== undefined,
      {
        message: "Provide at least one field to update.",
      }
    ),
});

export type CheckUsernameInput = z.infer<
  typeof checkUsernameSchema
>;

export type UpdateUserProfileInput = z.infer<
  typeof updateUserProfileSchema
>;