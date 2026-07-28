/* eslint-disable @typescript-eslint/no-use-before-define */
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
      <Preview>you&apos;re off the list. done.</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <div style={logo}>
              <Text style={logoText}>ZC</Text>
            </div>
            <Heading as="h1" style={h1}>
              done.
            </Heading>
          </Section>

          <Section style={content}>
            <Text style={p}>you&apos;re off. no more emails from me.</Text>
          </Section>

          <Section style={footer}>
            <Text style={footerLine}>
              changed your mind?{" "}
              <Link href={resubscribeUrl} style={footerLink}>
                resubscribe
              </Link>
              .
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const CREAM = "#f9f9f7";
const WHITE = "#ffffff";
const INK = "#1a1c1b";
const BLACK = "#000000";
const OFFWHITE = "#e2e2e2";
const MUTED = "#777777";
const SUBTLE = "#c6c6c6";
const HAIRLINE = "rgba(0, 0, 0, 0.08)";

const body: React.CSSProperties = {
  backgroundColor: CREAM,
  padding: "56px 20px",
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  WebkitFontSmoothing: "antialiased",
};

const container: React.CSSProperties = {
  maxWidth: "560px",
  margin: "0 auto",
  backgroundColor: WHITE,
};

const header: React.CSSProperties = {
  padding: "64px 48px 32px",
};

const logo: React.CSSProperties = {
  width: "44px",
  height: "44px",
  backgroundColor: BLACK,
  borderRadius: "50%",
  textAlign: "center",
  lineHeight: "44px",
  marginBottom: "40px",
};

const logoText: React.CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: "16px",
  fontWeight: 700,
  color: OFFWHITE,
  letterSpacing: "1px",
  margin: 0,
  lineHeight: "44px",
};

const h1: React.CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: "36px",
  fontWeight: 700,
  color: BLACK,
  letterSpacing: "-0.03em",
  lineHeight: "1.1",
  marginTop: 0,
  marginBottom: 0,
};

const content: React.CSSProperties = {
  padding: "16px 48px 48px",
};

const p: React.CSSProperties = {
  fontSize: "15px",
  color: INK,
  lineHeight: "1.75",
  marginTop: 0,
  marginBottom: 0,
};

const footer: React.CSSProperties = {
  padding: "32px 48px 40px",
  borderTop: `1px solid ${HAIRLINE}`,
};

const footerLine: React.CSSProperties = {
  fontSize: "13px",
  color: MUTED,
  lineHeight: "1.7",
  marginTop: 0,
  marginBottom: 0,
};

const footerLink: React.CSSProperties = {
  color: INK,
  textDecoration: "none",
  borderBottom: `1px solid ${SUBTLE}`,
};
