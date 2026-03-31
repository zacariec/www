import { groq } from "next-sanity";

export const allPostsQuery = groq`
  *[_type == "blogPost" && publishedAt <= now()] | order(publishedAt desc) {
    title,
    "slug": slug.current,
    subtitle,
    "date": publishedAt,
    readingTime,
    excerpt,
    "commentCount": count(*[_type == "comment" && references(^._id)])
  }
`;

export const postBySlugQuery = groq`
  *[_type == "blogPost" && slug.current == $slug][0] {
    title,
    "slug": slug.current,
    subtitle,
    "date": publishedAt,
    readingTime,
    excerpt,
    content,
    sideNote,
    featuredImage { asset, "url": asset->url, alt },
    "comments": *[_type == "comment" && references(^._id)] | order(publishedAt asc) {
      _id,
      author,
      authorImage,
      "date": publishedAt,
      text,
      likes,
      "parentCommentId": parentComment._ref
    }
  }
`;

export const allTimelineEntriesQuery = groq`
  *[_type == "timelineEntry"] | order(publishedAt desc) {
    _id,
    text,
    "date": publishedAt,
    type,
    likes,
    comments,
    url
  }
`;

export const latestPostsQuery = groq`
  *[_type == "blogPost" && publishedAt <= now()] | order(publishedAt desc) [0..2] {
    title,
    "slug": slug.current,
    subtitle,
    "date": publishedAt,
    readingTime,
    excerpt,
    "commentCount": count(*[_type == "comment" && references(^._id)])
  }
`;

export const latestTimelineQuery = groq`
  *[_type == "timelineEntry"] | order(publishedAt desc) [0..3] {
    _id,
    text,
    "date": publishedAt,
    type,
    likes,
    comments
  }
`;

export const allPostSlugsQuery = groq`
  *[_type == "blogPost" && publishedAt <= now()] { "slug": slug.current }
`;

export const siteConfigQuery = groq`
  *[_type == "siteConfig"][0] {
    navItems[] { label, href },
    heroSubtitle,
    heroHeading,
    heroDescription,
    heroImage { "url": asset->url, alt, caption },
    marqueeText,
    footerHeading,
    footerSubtitle,
    siteName,
    siteDescription,
    siteUrl,
    ogImage { "url": asset->url, alt },
    author,
    linkedIn,
    github,
    twitter,
    timezone
  }
`;
