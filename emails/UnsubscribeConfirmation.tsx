import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface Props {
  resubscribeUrl: string;
}

export default function UnsubscribeConfirmationEmail({
  resubscribeUrl = "https://zcarr.dev/?subscribe=",
}: Props) {
  return (
    <Html lang="en">
      <Head />
      <Preview>You're off the list.</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <div style={logo}>
              <Text style={logoText}>ZC</Text>
            </div>
            <Heading as="h1" style={h1}>
              Done
            </Heading>
          </Section>

          <Section style={content}>
            <Text style={p}>
              You're off the list. No more emails.
            </Text>

            <Section style={resubscribeBox}>
              <Link href={resubscribeUrl} style={resubscribeLink}>
                Resubscribe →
              </Link>
            </Section>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              You unsubscribed from zcarr.dev.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: "#f9f9f7",
  padding: "40px 20px",
  fontFamily:
    "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  WebkitFontSmoothing: "antialiased",
};

const container: React.CSSProperties = {
  maxWidth: "560px",
  margin: "0 auto",
  backgroundColor: "#ffffff",
  border: "1px solid rgba(0, 0, 0, 0.06)",
};

const header: React.CSSProperties = {
  padding: "48px 40px 32px",
  borderBottom: "1px solid rgba(0, 0, 0, 0.04)",
};

const logo: React.CSSProperties = {
  width: "48px",
  height: "48px",
  backgroundColor: "#000000",
  borderRadius: "50%",
  textAlign: "center",
  lineHeight: "48px",
  marginBottom: "32px",
};

const logoText: React.CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: "18px",
  fontWeight: 700,
  color: "#e2e2e2",
  letterSpacing: "1px",
  margin: 0,
  lineHeight: "48px",
};

const h1: React.CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: "28px",
  fontWeight: 700,
  color: "#000000",
  letterSpacing: "-0.02em",
  lineHeight: "1.2",
  marginBottom: "16px",
  marginTop: 0,
};

const content: React.CSSProperties = {
  padding: "40px",
};

const p: React.CSSProperties = {
  fontSize: "15px",
  color: "#1a1c1b",
  lineHeight: "1.9",
  marginBottom: "24px",
  marginTop: 0,
};

const resubscribeBox: React.CSSProperties = {
  backgroundColor: "#fcfcfb",
  border: "1px solid rgba(0, 0, 0, 0.06)",
  padding: "28px",
  margin: "32px 0",
  textAlign: "center" as const,
};

const resubscribeLink: React.CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: "11px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "2px",
  color: "#000000",
  textDecoration: "none",
  borderBottom: "2px solid #000000",
  paddingBottom: "4px",
};

const footer: React.CSSProperties = {
  padding: "32px 40px",
  backgroundColor: "#fcfcfb",
  borderTop: "1px solid rgba(0, 0, 0, 0.04)",
};

const footerText: React.CSSProperties = {
  fontSize: "12px",
  color: "#777777",
  lineHeight: "1.7",
  margin: 0,
};
