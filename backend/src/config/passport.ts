import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { config } from "./config";
import { db } from "./db";

// Helper to generate unique username from base string
async function generateUniqueUsername(baseName: string): Promise<string> {
  let username = baseName.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (username.length < 3) {
    username = `${username}user${Math.floor(1000 + Math.random() * 9000)}`;
  }

  let existing = await db.user.findUnique({ where: { username } });
  if (!existing) return username;

  let counter = 1;
  while (existing) {
    const candidate = `${username}${counter}`;
    existing = await db.user.findUnique({ where: { username: candidate } });
    if (!existing) return candidate;
    counter++;
  }
  return username;
}

// 1. Google OAuth Strategy
if (config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        callbackURL: `${config.BACKEND_URL}/api/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error("No email returned from Google profile"));
          }

          const normalizedEmail = email.toLowerCase().trim();

          // Check if user exists by googleId OR email
          let user = await db.user.findFirst({
            where: {
              OR: [{ googleId: profile.id }, { email: normalizedEmail }],
            },
          });

          if (user) {
            // Link googleId if missing, update avatar if missing
            if (!user.googleId || !user.emailVerified || (!user.avatar_url && profile.photos?.[0]?.value)) {
              user = await db.user.update({
                where: { id: user.id },
                data: {
                  googleId: user.googleId || profile.id,
                  avatar_url: user.avatar_url || profile.photos?.[0]?.value,
                  emailVerified: true,
                },
              });
            }
            return done(null, { ...user, userId: user.id });
          }

          // Create new user if not found
          const baseUsername = normalizedEmail.split("@")[0];
          const username = await generateUniqueUsername(baseUsername);

          user = await db.user.create({
            data: {
              name: profile.displayName || baseUsername,
              email: normalizedEmail,
              username,
              googleId: profile.id,
              avatar_url: profile.photos?.[0]?.value || null,
              emailVerified: true,
            },
          });

          return done(null, { ...user, userId: user.id });
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

// 2. GitHub OAuth Strategy
if (config.GITHUB_CLIENT_ID && config.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: config.GITHUB_CLIENT_ID,
        clientSecret: config.GITHUB_CLIENT_SECRET,
        callbackURL: `${config.BACKEND_URL}/api/auth/github/callback`,
        scope: ["user:email"],
      },
      async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          const email =
            profile.emails?.[0]?.value || `${profile.username}@github.noreply.com`;
          const normalizedEmail = email.toLowerCase();

          // Check if user exists by githubId OR email
          let user = await db.user.findFirst({
            where: {
              OR: [{ githubId: profile.id }, { email: normalizedEmail }],
            },
          });

          if (user) {
            // Link githubId if missing, update avatar if missing
            if (!user.githubId || !user.emailVerified || (!user.avatar_url && profile.photos?.[0]?.value)) {
              user = await db.user.update({
                where: { id: user.id },
                data: {
                  githubId: user.githubId || profile.id,
                  avatar_url: user.avatar_url || profile.photos?.[0]?.value,
                  emailVerified: true,
                },
              });
            }
            return done(null, { ...user, userId: user.id });
          }

          // Create new user if not found
          const baseUsername = profile.username || normalizedEmail.split("@")[0];
          const username = await generateUniqueUsername(baseUsername);

          user = await db.user.create({
            data: {
              name: profile.displayName || profile.username || baseUsername,
              email: normalizedEmail,
              username,
              githubId: profile.id,
              avatar_url: profile.photos?.[0]?.value || null,
              emailVerified: true,
            },
          });

          return done(null, { ...user, userId: user.id });
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

export default passport;
