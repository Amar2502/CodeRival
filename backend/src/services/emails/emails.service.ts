import { resend } from "../../config/resend";
import { render } from "@react-email/render";
import { config } from "../../config/config";
import ResetPasswordEmail from "./emails.templates/resetPassword";
import VerifyEmailTemplate from "./emails.templates/verifyEmail";
import WelcomeEmailTemplate from "./emails.templates/welcomeEmail";
import AnnouncementEmailTemplate from "./emails.templates/announcementEmail";

export async function sendRawEmail(to: string, subject: string, html: string) {
  try {
    const response = await resend.emails.send({
      from: "CodeRival <onboarding@resend.dev>",
      to,
      subject,
      html,
    });
    return response;
  } catch (error) {
    console.error("sendRawEmail error:", error);
    throw error;
  }
}

export async function sendVerifyEmailOTP(email: string, otp: string, username?: string) {
  const html = await render(VerifyEmailTemplate({ otp, username }));
  return sendRawEmail(email, "Verify Your CodeRival Account", html);
}

export async function sendResetPasswordOTP(email: string, otp: string, username?: string) {
  const html = await render(ResetPasswordEmail({ otp, username }));
  return sendRawEmail(email, "Reset Your CodeRival Password", html);
}

export async function sendWelcomeEmail(email: string, username?: string) {
  const actionUrl = `${config.FRONTEND_URL}/dashboard`;
  const html = await render(WelcomeEmailTemplate({ username, actionUrl }));
  return sendRawEmail(email, "Welcome to CodeRival! ⚔️", html);
}

export async function sendAnnouncementEmail(
  email: string,
  title: string,
  message: string,
  ctaText?: string,
  ctaUrl?: string,
  username?: string
) {
  const unsubscribeUrl = `${config.FRONTEND_URL}/settings?tab=notification&unsubscribe=true`;
  const html = await render(
    AnnouncementEmailTemplate({
      title,
      message,
      ctaText,
      ctaUrl,
      unsubscribeUrl,
      username,
    })
  );
  return sendRawEmail(email, title, html);
}

export const emailService = {
  sendRawEmail,
  sendEmail: sendRawEmail,
  sendVerifyEmailOTP,
  sendResetPasswordOTP,
  sendWelcomeEmail,
  sendAnnouncementEmail,
};
