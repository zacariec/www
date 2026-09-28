import { createElement } from "react";
import { Observable } from "rxjs";
import { ColourCoverPane, SessionListPane, SessionSeoPane } from "./studio-components";
import { SessionThreadPane } from "./comments-tool";
import { canonicalId } from "./studio-data";
import type {
  DefaultDocumentNodeResolver,
  StructureBuilder,
  StructureResolver,
} from "sanity/structure";

const sessionDocument = (S: StructureBuilder) =>
  S.document()
    .schemaType("sessionTape")
    .views([
      S.view.form().title("Content"),
      S.view.component(ColourCoverPane).title("Colour & cover"),
      S.view.component(SessionThreadPane).title("Thread"),
      S.view.component(SessionSeoPane).title("SEO"),
    ]);

export const defaultDocumentNode: DefaultDocumentNodeResolver = (S, { schemaType }) =>
  schemaType === "sessionTape" ? sessionDocument(S) : S.document().views([S.view.form()]);

const types = [
  { name: "sessionTape", title: "Sessions", tone: "sand" },
  { name: "timelineEntry", title: "Timeline", tone: "blue" },
  { name: "comment", title: "Comments", tone: "pink" },
  { name: "siteConfig", title: "Site Config", tone: "paper" },
];

export const structure: StructureResolver = (S, context) =>
  new Observable((subscriber) => {
    const client = context.getClient({ apiVersion: "2026-03-26" });
    let timer: number | undefined;
    let active = true;
    let generation = 0;
    async function update() {
      const request = ++generation;
      try {
        const documents = await client.fetch<Array<{ _id: string; _type: string }>>(
          "*[_type in $types]{_id,_type}",
          { types: types.map((type) => type.name) },
          { perspective: "raw" },
        );
        if (!active || request !== generation) return;
        const ids = new Set<string>();
        const counts: Record<string, number> = {};
        for (const document of documents) {
          const id = canonicalId(document._id);
          if (ids.has(id)) continue;
          ids.add(id);
          counts[document._type] = (counts[document._type] ?? 0) + 1;
        }
        subscriber.next(
          S.list()
            .title("Content")
            .items(
              types.map((type) =>
                S.listItem()
                  .id(type.name)
                  .title(`${type.title} · ${counts[type.name] ?? 0}`)
                  .schemaType(type.name)
                  .icon(() =>
                    createElement("span", {
                      className: "zc-swatch",
                      style: { background: `var(--${type.tone})` },
                    }),
                  )
                  .child(
                    type.name === "siteConfig"
                      ? S.document()
                          .documentId(
                            canonicalId(
                              documents.find((document) => document._type === "siteConfig")?._id ??
                                "siteConfig",
                            ),
                          )
                          .schemaType("siteConfig")
                          .title("Site Config")
                      : type.name === "sessionTape"
                        ? S.component(SessionListPane)
                            .id("sessions")
                            .title("Sessions")
                            .child((id) => sessionDocument(S).documentId(id))
                        : S.documentTypeList(type.name).title(type.title),
                  ),
              ),
            ),
        );
      } catch (error) {
        if (active) subscriber.error(error);
      }
    }
    void update();
    const listener = client
      .listen(
        "*[_type in $types]",
        { types: types.map((type) => type.name) },
        { includeResult: false },
      )
      .subscribe({
        next: () => {
          window.clearTimeout(timer);
          timer = window.setTimeout(() => void update(), 200);
        },
        error: (error: Error) => subscriber.error(error),
      });
    return () => {
      active = false;
      window.clearTimeout(timer);
      listener.unsubscribe();
    };
  });
