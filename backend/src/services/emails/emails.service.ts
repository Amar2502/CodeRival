import { resend } from "../../config/resend";
import { render } from "@react-email/render";
import resetPasswordEmail from "./emails.templates/resetPassword";

export async function renderForgotPasswordEmail(otp: string) {
  return render(resetPasswordEmail({ otp }));
}

export async function sendEmail(email: string, html: string, subject: string = "Your CodeRival OTP") {

  const response = await resend.emails.send({
    from: "CodeRival <onboarding@resend.dev>",
    to: email,
    subject: subject,
    html,
  });

}

export const emailService = {
    sendEmail
};
