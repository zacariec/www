import { HEADLINE_PRESETS } from "../constants";

export const COMMENT_PROJECTION = `
  _id, "session": session._ref,
  "anchorIndex": select(
    *[_id == "readerPreferences." + ^.readerId][0].showAnchors == false => null,
    coalesce(anchorIndex, null)
  ),
  "parent": coalesce(parent._ref, null), body,
  author { provider, providerId, handle, avatarSeed, isAuthor },
  status, "likes": coalesce(likes, 0), createdAt
`;

// Body-derived values are finalized by deriveSession, shared with Studio and mail.
// Number is projected against the complete chronology, never a paginated subset.
export const SESSION_PROJECTION = `
  _id, title, "slug": slug.current, subtitle, "date": publishedAt,
  "dateModified": coalesce(dateModified, publishedAt), excerpt, content, sideNote,
  "number": count(*[_type == "sessionTape" && !(_id in path("drafts.**")) &&
    (publishedAt < ^.publishedAt || (publishedAt == ^.publishedAt && _id < ^._id))]) + 1,
  kind, state, coverSeed, toneOverride, readTimeOverride,
  "tags": coalesce(tags, []), "relatedIds": coalesce(related[]._ref, []),
  writtenTo { track, artist, spotifyUrl },
  featuredImage { asset, "url": asset->url, alt },
  "commentCount": count(*[_type == "comment" && session._ref == ^._id && status == "approved"])
`;
const published = `_type == "sessionTape" && !(_id in path("drafts.**")) && publishedAt <= now()`;
export const allSessionsQuery = `*[${published}] | order(publishedAt desc, _id desc) { ${SESSION_PROJECTION} }`;
export const latestSessionsQuery = `*[${published}] | order(publishedAt desc, _id desc)[0...3] { ${SESSION_PROJECTION} }`;
export const sessionBySlugQuery = `*[${published} && slug.current == $slug][0] {
  ${SESSION_PROJECTION},
  "comments": *[_type == "comment" && session._ref == ^._id && status == "approved"] | order(createdAt asc, _id asc) { ${COMMENT_PROJECTION} }
}`;
export const sessionByIdQuery = `*[${published} && _id == $id][0] { ${SESSION_PROJECTION} }`;
export const sessionBySlugPreviewQuery = `*[_type == "sessionTape" && slug.current == $slug][0] { ${SESSION_PROJECTION} }`;
export const allSessionSlugsQuery = `*[${published}] { "slug": slug.current }`;
export const allSessionsPreviewQuery = `*[_type == "sessionTape"] | order(publishedAt desc, _id desc) { ${SESSION_PROJECTION} }`;
export const sessionChronologyQuery = `*[${published}] | order(publishedAt asc, _id asc) { _id, "date": publishedAt }`;

const timelineProjection = `_id, text, "date": publishedAt, type, "likes": coalesce(likes, 0), "comments": coalesce(comments, 0), url, board { visible, x, y, rotation, z }`;
export const allTimelineEntriesQuery = `*[_type == "timelineEntry" && publishedAt <= now()] | order(publishedAt desc, _id desc) { ${timelineProjection} }`;
export const latestTimelineQuery = `*[_type == "timelineEntry" && publishedAt <= now() && board.visible == true] | order(board.z asc, publishedAt desc)[0...4] { ${timelineProjection} }`;
export const allTimelineEntriesPreviewQuery = `*[_type == "timelineEntry"] | order(publishedAt desc, _id desc) { ${timelineProjection} }`;

export const siteConfigQuery = `*[_type == "siteConfig"][0] {
  navItems[] { label, href },
  "headline": select(headlinePreset == "custom" => headlineCustom, ${Object.entries(
    HEADLINE_PRESETS,
  )
    .map(([key, lines]) => `headlinePreset == ${JSON.stringify(key)} => ${JSON.stringify(lines)}`)
    .join(", ")}, ["Getting it", "out there."]),
  readme, tickerEnabled, socials[] { label, url }, toneShift, displayVersion, moderationDefault, authorSanityId,
  newsletter { footerHeading, footerDescription, inlineHeading, inlineDescription, buttonLabel, placeholder, successMessage, alreadySubscribedMessage, unsubscribeLabel, unsubscribeConfirmedMessage, errorMessage },
  siteName, siteDescription, siteUrl, author, twitterHandle, timezone
}`;
