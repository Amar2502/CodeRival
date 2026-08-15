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
  Preview,
} from "@react-email/components";

interface WelcomeEmailProps {
  username?: string;
  actionUrl: string;
}

export default function WelcomeEmailTemplate({ username, actionUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to CodeRival! Ready to Duel?</Preview>
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

          {/* Main Banner */}
          <Heading style={headingStyle}>Welcome to the Arena ⚔️</Heading>
          
          <Text style={textStyle}>
            {username ? `Hey @${username},` : "Hey Programmer,"}
          </Text>
          
          <Text style={textStyle}>
            Your CodeRival account is fully verified and ready. Prepare yourself for intense, real-time 1v1 competitive coding battles, tournaments, and rank upgrades!
          </Text>

          {/* Feature Highlights */}
          <Section style={featureBoxStyle}>
            <Text style={featureTitleStyle}>⚡ What you can do on CodeRival:</Text>
            <Text style={featureItemStyle}>
              • <strong>1v1 Live Battle Arena</strong>: Duel developers in real time under anti-cheat protection.
            </Text>
            <Text style={featureItemStyle}>
              • <strong>ELO Rating & Rank Badges</strong>: Climb from Apprentice to Grandmaster status.
            </Text>
            <Text style={featureItemStyle}>
              • <strong>Single-Elimination Tournaments</strong>: Compete in 4-player & 8-player bracket championships.
            </Text>
          </Section>

          {/* Action Button */}
          <Section style={buttonContainerStyle}>
            <Button style={buttonStyle} href={actionUrl}>
              Enter Battle Arena →
            </Button>
          </Section>

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
  fontSize: "22px",
  fontWeight: "800",
  textAlign: "left" as const,
  marginBottom: "16px",
};

const textStyle = {
  color: "#9ca3af",
  fontSize: "14px",
  lineHeight: "22px",
  marginBottom: "14px",
};

const featureBoxStyle = {
  backgroundColor: "#030712",
  border: "1px solid #1f2937",
  borderRadius: "12px",
  padding: "20px",
  margin: "20px 0",
};

const featureTitleStyle = {
  color: "#38bdf8",
  fontSize: "14px",
  fontWeight: "700",
  marginBottom: "12px",
};

const featureItemStyle = {
  color: "#d1d5db",
  fontSize: "13px",
  lineHeight: "20px",
  marginBottom: "8px",
};

const buttonContainerStyle = {
  textAlign: "center" as const,
  margin: "28px 0 16px 0",
};

const buttonStyle = {
  backgroundColor: "#f43f5e",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "800",
  padding: "14px 28px",
  borderRadius: "10px",
  textDecoration: "none",
  display: "inline-block",
  boxShadow: "0 10px 15px -3px rgba(244, 63, 94, 0.3)",
};

const footerStyle = {
  textAlign: "center" as const,
};

const footerTextStyle = {
  color: "#4b5563",
  fontSize: "12px",
  margin: "0",
};
