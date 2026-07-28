import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import NewPostNotification from "/home/employee_00/github.com/zacariec/www/emails/NewPostNotification.tsx";
import SubscriptionConfirmed from "/home/employee_00/github.com/zacariec/www/emails/SubscriptionConfirmed.tsx";
import UnsubscribeConfirmation from "/home/employee_00/github.com/zacariec/www/emails/UnsubscribeConfirmation.tsx";

const specs = [
  {
    name: "new-post",
    element: NewPostNotification({
      postTitle: "There Is No Plan B",
      postSubtitle:
        "every merchant story at summit had the same thing underneath it; if you want it bad enough it's plan a.",
      postUrl: "https://zcarr.dev/sessions/there-is-no-plan-b",
      postDate: "July 28, 2026",
      readingTime: "3 min read",
      postExcerpt:
        "just got back from shopify summit and the merchant stories have been sitting with me since. every one of them, underneath the specifics, was the same belief i've held for years — there's never a plan b, if you want it bad enough it's plan a.",
      unsubscribeUrl: "https://zcarr.dev/unsubscribe",
    }),
  },
  {
    name: "welcome",
    element: SubscriptionConfirmed({ unsubscribeUrl: "https://zcarr.dev/unsubscribe" }),
  },
  {
    name: "unsub",
    element: UnsubscribeConfirmation({
      resubscribeUrl: "https://zcarr.dev/?subscribe=you@example.com",
    }),
  },
];

for (const { name, element } of specs) {
  const inner = renderToStaticMarkup(element);
  const wrapped = `<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet"></head><body style="margin:0;background:#f9f9f7">${inner}</body></html>`;
  writeFileSync(`/tmp/email-${name}.html`, wrapped);
  console.log(`wrote /tmp/email-${name}.html`);
}
