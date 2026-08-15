import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Section,
  Heading,
  Hr,
  Link,
  Preview,
} from "@react-email/components";

interface ResetPasswordEmailProps {
  otp: string;
  username?: string;
}

export default function ResetPasswordEmail({ otp, username }: ResetPasswordEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your CodeRival Password Reset Verification Code</Preview>
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          {/* Header Branding */}
          <Section style={headerStyle}>
            <Text style={logoTextStyle}>
              <span style={{ color: "#ec4899" }}>Code</span>
              <span style={{ color: "#38bdf8" }}>Rival</span>
            </Text>
          </Section>

          <Hr style={dividerStyle} />

          {/* Main Content */}
          <Heading style={headingStyle}>Reset Password Verification</Heading>
          
          <Text style={textStyle}>
            {username ? `Hi @${username},` : "Hi there,"}
          </Text>
          
          <Text style={textStyle}>
            We received a request to reset your password for your CodeRival account. Use the code below to complete your password reset:
          </Text>

          {/* OTP Box */}
          <Section style={otpContainerStyle}>
            <Text style={otpTextStyle}>{otp}</Text>
          </Section>

          <Text style={noteTextStyle}>
            ⏱️ This verification code is valid for <strong>5 minutes</strong>.
          </Text>

          <Text style={warningTextStyle}>
            If you did not request a password reset, please ignore this email or reach out to support if you have concerns.
          </Text>

          <Hr style={dividerStyle} />

          {/* Footer */}
          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              © {new Date().getFullYear()} CodeRival. Real-time competitive coding platform.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styling Tokens
const mainStyle = {
  backgroundColor: "#090d16",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  padding: "40px 10px",
};

const containerStyle = {
  backgroundColor: "#111827",
  border: "1px solid #1f2937",
  borderRadius: "16px",
  padding: "32px",
  maxWidth: "520px",
  margin: "0 auto",
  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
};

const headerStyle = {
  textAlign: "center" as const,
  marginBottom: "16px",
};

const logoTextStyle = {
  fontSize: "28px",
  fontWeight: "900",
  letterSpacing: "-0.5px",
  margin: "0",
};

const dividerStyle = {
  borderColor: "#1f2937",
  margin: "20px 0",
};

const headingStyle = {
  color: "#f9fafb",
  fontSize: "20px",
  fontWeight: "700",
  textAlign: "left" as const,
  marginBottom: "16px",
};

const textStyle = {
  color: "#9ca3af",
  fontSize: "14px",
  lineHeight: "22px",
  marginBottom: "12px",
};

const otpContainerStyle = {
  backgroundColor: "#030712",
  border: "1px solid #374151",
  borderRadius: "12px",
  padding: "20px",
  textAlign: "center" as const,
  margin: "24px 0",
};

const otpTextStyle = {
  color: "#38bdf8",
  fontSize: "36px",
  fontWeight: "800",
  letterSpacing: "10px",
  margin: "0",
  fontFamily: "monospace",
};

const noteTextStyle = {
  color: "#f3f4f6",
  fontSize: "13px",
  textAlign: "center" as const,
  marginBottom: "16px",
};

const warningTextStyle = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "18px",
  fontStyle: "italic",
};

const footerStyle = {
  textAlign: "center" as const,
};

const footerTextStyle = {
  color: "#4b5563",
  fontSize: "12px",
  margin: "0",
};