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
  postTitle: string;
  postSubtitle: string;
  postUrl: string;
  postDate: string;
  readingTime: string;
  postExcerpt?: string;
  unsubscribeUrl: string;
}

export default function NewPostNotificationEmail({
  postTitle = "New Post Title",
  postSubtitle = "A compelling subtitle",
  postUrl = "https://zcarr.dev/blog/example",
  postDate = "April 9, 2026",
  readingTime = "5 min read",
  postExcerpt,
  unsubscribeUrl = "https://zcarr.dev/unsubscribe",
}: Props) {
  return (
    <Html lang="en">
      <Head />
      <Preview>New: {postTitle}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <div style={logo}>
              <Text style={logoText}>ZC</Text>
            </div>
            <Text style={badge}>New Post</Text>
            <Heading as="h1" style={h1}>
              {postTitle}
            </Heading>
            <Text style={subtitle}>{postSubtitle}</Text>
            <Hr style={metaDivider} />
            <table cellPadding="0" cellSpacing="0" style={{ border: 0 }}>
              <tr>
                <td style={metaItem}>{postDate}</td>
                <td style={{ width: "16px" }} />
                <td style={metaItem}>{readingTime}</td>
              </tr>
            </table>
          </Section>

          <Section style={content}>
            <Text style={p}>New one's up.</Text>

            {postExcerpt && (
              <Section style={excerptBox}>
                <Text style={excerptText}>{postExcerpt}</Text>
              </Section>
            )}

            <Section style={ctaContainer}>
              <Link href={postUrl} style={ctaLink}>
                Read it →
              </Link>
            </Section>
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
  maxWidth: "600px",
  margin: "0 auto",
  backgroundColor: "#ffffff",
  border: "1px solid rgba(0, 0, 0, 0.06)",
};

const header: React.CSSProperties = {
  padding: "48px 40px 40px",
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

const badge: React.CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: "9px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "2px",
  color: "#c6c6c6",
  marginBottom: "20px",
  marginTop: 0,
};

const h1: React.CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: "32px",
  fontWeight: 700,
  color: "#000000",
  letterSpacing: "-0.03em",
  lineHeight: "1.15",
  marginBottom: "20px",
  marginTop: 0,
};

const subtitle: React.CSSProperties = {
  fontSize: "17px",
  color: "#777777",
  lineHeight: "1.6",
  fontWeight: 300,
  marginBottom: "24px",
  marginTop: 0,
};

const metaDivider: React.CSSProperties = {
  borderColor: "rgba(0, 0, 0, 0.04)",
  borderTop: "1px solid rgba(0, 0, 0, 0.04)",
  margin: "0 0 16px 0",
};

const metaItem: React.CSSProperties = {
  fontSize: "11px",
  color: "#c6c6c6",
  textTransform: "uppercase",
  letterSpacing: "1px",
  fontFamily: "'Space Grotesk', sans-serif",
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

const excerptBox: React.CSSProperties = {
  backgroundColor: "#fcfcfb",
  borderLeft: "3px solid rgba(0, 0, 0, 0.1)",
  padding: "28px 32px",
  margin: "32px 0",
};

const excerptText: React.CSSProperties = {
  fontSize: "16px",
  color: "#1a1c1b",
  lineHeight: "1.8",
  fontWeight: 300,
  margin: 0,
};

const ctaContainer: React.CSSProperties = {
  margin: "40px 0 32px",
  textAlign: "left" as const,
};

const ctaLink: React.CSSProperties = {
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
