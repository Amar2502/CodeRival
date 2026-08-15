import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Section,
  Heading,
  Button,
  Hr,
  Link,
  Preview,
} from "@react-email/components";

interface AnnouncementEmailProps {
  title: string;
  message: string;
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeUrl: string;
  username?: string;
}

export default function AnnouncementEmailTemplate({
  title,
  message,
  ctaText,
  ctaUrl,
  unsubscribeUrl,
  username,
}: AnnouncementEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{title}</Preview>
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

          {/* Announcement Badge */}
          <Section style={badgeContainerStyle}>
            <Text style={badgeTextStyle}>📢 ANNOUNCEMENT</Text>
          </Section>

          {/* Heading */}
          <Heading style={headingStyle}>{title}</Heading>
          
          {username && (
            <Text style={textStyle}>
              Hi @{username},
            </Text>
          )}

          {/* Body Content */}
          <Text style={messageTextStyle}>{message}</Text>

          {/* Optional CTA Button */}
          {ctaText && ctaUrl && (
            <Section style={buttonContainerStyle}>
              <Button style={buttonStyle} href={ctaUrl}>
                {ctaText} →
              </Button>
            </Section>
          )}

          <Hr style={dividerStyle} />

          {/* Footer & Unsubscribe */}
          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              © {new Date().getFullYear()} CodeRival. Real-time competitive coding platform.
            </Text>
            <Text style={unsubscribeTextStyle}>
              You received this email because you opted in to CodeRival platform announcements.{" "}
              <Link style={unsubscribeLinkStyle} href={unsubscribeUrl}>
                Unsubscribe
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

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
  maxWidth: "540px",
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

const badgeContainerStyle = {
  marginBottom: "12px",
};

const badgeTextStyle = {
  display: "inline-block",
  backgroundColor: "rgba(56, 189, 248, 0.1)",
  border: "1px solid rgba(56, 189, 248, 0.3)",
  color: "#38bdf8",
  fontSize: "11px",
  fontWeight: "800",
  letterSpacing: "1px",
  padding: "4px 10px",
  borderRadius: "6px",
  margin: "0",
};

const headingStyle = {
  color: "#f9fafb",
  fontSize: "22px",
  fontWeight: "800",
  lineHeight: "30px",
  marginBottom: "16px",
};

const textStyle = {
  color: "#d1d5db",
  fontSize: "14px",
  marginBottom: "12px",
};

const messageTextStyle = {
  color: "#9ca3af",
  fontSize: "14px",
  lineHeight: "24px",
  whiteSpace: "pre-line" as const,
  marginBottom: "24px",
};

const buttonContainerStyle = {
  textAlign: "center" as const,
  margin: "28px 0 16px 0",
};

const buttonStyle = {
  backgroundColor: "#38bdf8",
  color: "#090d16",
  fontSize: "15px",
  fontWeight: "800",
  padding: "14px 28px",
  borderRadius: "10px",
  textDecoration: "none",
  display: "inline-block",
  boxShadow: "0 10px 15px -3px rgba(56, 189, 248, 0.3)",
};

const footerStyle = {
  textAlign: "center" as const,
};

const footerTextStyle = {
  color: "#6b7280",
  fontSize: "12px",
  margin: "0 0 8px 0",
};

const unsubscribeTextStyle = {
  color: "#4b5563",
  fontSize: "11px",
  lineHeight: "16px",
  margin: "0",
};

const unsubscribeLinkStyle = {
  color: "#9ca3af",
  textDecoration: "underline",
};
