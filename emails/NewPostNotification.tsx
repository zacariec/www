/* eslint-disable @typescript-eslint/no-use-before-define */
import {
  Body,
  Container,
  Font,
  Head,
  Heading,
  Hr,
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
  postUrl = "https://zcarr.dev/sessions/example",
  postDate = "April 9, 2026",
  readingTime = "5 min read",
  postExcerpt,
  unsubscribeUrl = "https://zcarr.dev/unsubscribe",
}: Props) {
  return (
    <Html lang="en">
      <Head>
        <Font
          fontFamily="Space Grotesk"
          fallbackFontFamily="sans-serif"
          webFont={{
            url: "https://fonts.gstatic.com/s/spacegrotesk/v16/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj7ZjF.woff2",
            format: "woff2",
          }}
          fontWeight="700"
          fontStyle="normal"
        />
      </Head>
      <Preview>{`${postTitle} — a new session on zcarr.dev`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={metaRow}>
              SESSIONS&nbsp;&nbsp;·&nbsp;&nbsp;{postDate.toUpperCase()}&nbsp;&nbsp;·&nbsp;&nbsp;
              {readingTime.toUpperCase()}
            </Text>
            <Heading as="h1" style={h1}>
              {postTitle}
            </Heading>
            <Text style={subtitle}>{postSubtitle}</Text>
          </Section>

          <Hr style={divider} />

          {postExcerpt != null && postExcerpt !== "" ? (
            <Section style={excerptSection}>
              <Text style={excerptLabel}>EXCERPT</Text>
              <Text style={excerptText}>{postExcerpt}</Text>
            </Section>
          ) : null}

          <Section style={ctaSection}>
            <Link href={postUrl} style={ctaLink}>
              read the session →
            </Link>
          </Section>

          <Section style={footer}>
            <Text style={footerLine}>direct from zc.</Text>
            <Text style={footerLine}>
              not for you?{" "}
              <Link href={unsubscribeUrl} style={footerLink}>
                unsubscribe
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
  maxWidth: "600px",
  margin: "0 auto",
  backgroundColor: WHITE,
};

const header: React.CSSProperties = {
  padding: "64px 48px 40px",
};

const metaRow: React.CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: "10px",
  fontWeight: 600,
  letterSpacing: "3px",
  color: SUBTLE,
  marginTop: 0,
  marginBottom: "40px",
};

const h1: React.CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: "40px",
  fontWeight: 700,
  color: BLACK,
  letterSpacing: "-0.035em",
  lineHeight: "1.05",
  marginTop: 0,
  marginBottom: "20px",
};

const subtitle: React.CSSProperties = {
  fontSize: "17px",
  color: MUTED,
  lineHeight: "1.55",
  fontWeight: 300,
  marginTop: 0,
  marginBottom: 0,
};

const divider: React.CSSProperties = {
  borderColor: HAIRLINE,
  borderTop: `1px solid ${HAIRLINE}`,
  margin: "0 48px",
  width: "auto",
};

const excerptSection: React.CSSProperties = {
  padding: "40px 48px 24px",
};

const excerptLabel: React.CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: "10px",
  fontWeight: 600,
  letterSpacing: "3px",
  color: SUBTLE,
  marginTop: 0,
  marginBottom: "16px",
};

const excerptText: React.CSSProperties = {
  fontSize: "16px",
  color: INK,
  lineHeight: "1.7",
  fontWeight: 300,
  fontStyle: "italic",
  marginTop: 0,
  marginBottom: 0,
};

const ctaSection: React.CSSProperties = {
  padding: "32px 48px 56px",
};

const ctaLink: React.CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: "11px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "3px",
  color: BLACK,
  textDecoration: "none",
  borderBottom: `2px solid ${BLACK}`,
  paddingBottom: "6px",
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
  marginBottom: "4px",
};

const footerLink: React.CSSProperties = {
  color: INK,
  textDecoration: "none",
  borderBottom: `1px solid ${SUBTLE}`,
};
