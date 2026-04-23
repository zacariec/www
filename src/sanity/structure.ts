import { SessionPreviewPane } from "./preview-pane";

import type { StructureResolver } from "sanity/structure";

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Content")
    .items([
      S.listItem()
        .title("Session Tapes")
        .schemaType("sessionTape")
        .child(
          S.documentTypeList("sessionTape")
            .title("Session Tapes")
            .child((id) =>
              S.document()
                .documentId(id)
                .schemaType("sessionTape")
                .views([
                  S.view.form(),
                  S.view.component(SessionPreviewPane).title("Preview"),
                ]),
            ),
        ),
      S.divider(),
      ...S.documentTypeListItems().filter((item) => item.getId() !== "sessionTape"),
    ]);
