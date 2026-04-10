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
  unsubscribeUrl: string;
}

export default function SubscriptionConfirmedEmail({
  unsubscribeUrl = "https://zcarr.dev/unsubscribe",
}: Props) {
  return (
    <Html lang="en">
      <Head />
      <Preview>You're in.</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <div style={logo}>
              <Text style={logoText}>ZC</Text>
            </div>
            <Heading as="h1" style={h1}>
              You're In
            </Heading>
          </Section>

          <Section style={content}>
            <Text style={p}>
              I'll send you an email when I publish something new. That's it. No
              spam, no cadence, no newsletter voice. Just a heads up when there's
              something worth reading.
            </Text>
            <Text style={p}>Appreciate it.</Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              You subscribed to zcarr.dev.
            </Text>
            <Link href={unsubscribeUrl} style={footerLink}>
              Unsubscribe
            </Link>
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

const footer: React.CSSProperties = {
  padding: "32px 40px",
  backgroundColor: "#fcfcfb",
  borderTop: "1px solid rgba(0, 0, 0, 0.04)",
};

const footerText: React.CSSProperties = {
  fontSize: "12px",
  color: "#777777",
  lineHeight: "1.7",
  marginBottom: "16px",
  marginTop: 0,
};

const footerLink: React.CSSProperties = {
  fontSize: "11px",
  color: "#777777",
  textDecoration: "none",
  borderBottom: "1px solid rgba(0, 0, 0, 0.2)",
  textTransform: "uppercase",
  letterSpacing: "1px",
};
