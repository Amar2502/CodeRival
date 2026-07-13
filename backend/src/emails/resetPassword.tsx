import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Section,
  Heading,
} from "@react-email/components";

interface resetPasswordEmailProps {
  otp: string;
}

export default function resetPasswordEmail({ otp }: resetPasswordEmailProps) {
  return (
    <Html>
      <Head />

      <Body
        style={{
          backgroundColor: "#f6f9fc",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            padding: "30px",
            borderRadius: "10px",
          }}
        >
          <Heading>
            CodeRival Verification
          </Heading>

          <Section>
            <Text>
              Your OTP for CodeRival account verification is:
            </Text>

            <Text
              style={{
                fontSize: "32px",
                fontWeight: "bold",
                letterSpacing: "8px",
              }}
            >
              {otp}
            </Text>

            <Text>
              This OTP expires in 5 minutes.
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}