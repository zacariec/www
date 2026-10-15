import { createImageUrlBuilder } from "@sanity/image-url";
import { useEffect, useMemo, useRef, useState } from "react";
import { insert, PatchEvent, set, setIfMissing, unset, useClient, useFormValue } from "sanity";
import type { DragEvent } from "react";
import type {
  ArrayOfObjectsInputProps,
  NumberInputProps,
  ObjectInputProps,
  StringInputProps,
} from "sanity";
import { deriveRolls, rollId } from "../lib/roll";
import type { RollSource } from "../lib/roll";
import { droppedRollFiles, frameExif, isRollImage, sortRollFiles } from "./roll-files";
import type { FrameExif, RollUploadFile } from "./roll-files";
import "./roll-inputs.css";

type StudioFrame = {
  _key: string;
  _type: "rollFrame";
  image?: { _type?: "image"; asset?: { _type?: "reference"; _ref: string } };
  alt?: string;
  caption?: string;
  size?: string;
  aspect?: string;
  exif?: FrameExif;
};
type StudioGroup = {
  _key: string;
  _type: "rollGroup";
  title?: string;
  date?: string;
  frames?: StudioFrame[];
};
type FrameLocation = { group: string; frame: string };
const FRAME_DRAG_TYPE = "application/x-zc-roll-frame";
const EMPTY_GROUPS: StudioGroup[] = [];

function VisualPicker({ props, mode }: { props: StringInputProps; mode: "size" | "aspect" }) {
  const choices =
    mode === "size"
      ? [
          { value: "full", width: 100 },
          { value: "wide", width: 67 },
          { value: "half", width: 50 },
          { value: "third", width: 33 },
        ]
      : [
          { value: "21:9", width: 100 },
          { value: "3:2", width: 100 },
          { value: "4:5", width: 100 },
          { value: "auto", width: 100 },
        ];
  return (
    <div className="zc-roll-picker" role="radiogroup" aria-label={props.schemaType.title}>
      {choices.map((choice, index) => (
        <label key={choice.value} className={props.value === choice.value ? "is-selected" : ""}>
          <input
            {...props.elementProps}
            ref={index === 0 ? props.elementProps.ref : undefined}
            id={`${props.id}-${choice.value.replace(":", "-")}`}
            type="radio"
            name={props.id}
            value={choice.value}
            checked={props.value === choice.value}
            disabled={props.readOnly}
            onChange={() => props.onChange(set(choice.value))}
          />
          <span className={`zc-roll-picker-visual is-${mode}`} aria-hidden="true">
            <span
              style={{
                width: `${choice.width}%`,
                aspectRatio:
                  mode === "aspect" && choice.value !== "auto"
                    ? choice.value.replace(":", "/")
                    : undefined,
              }}
            />
          </span>
          <span>{choice.value === "auto" ? "Original" : choice.value}</span>
        </label>
      ))}
    </div>
  );
}

export function RollSizeInput(props: StringInputProps) {
  return <VisualPicker props={props} mode="size" />;
}

export function RollAspectInput(props: StringInputProps) {
  return <VisualPicker props={props} mode="aspect" />;
}

export function RollNumberInput(props: NumberInputProps) {
  const client = useClient({ apiVersion: "2026-03-26" });
  const document = useFormValue([]) as RollSource;
  const [sources, setSources] = useState<RollSource[]>([]);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    let request = 0;
    async function load() {
      const generation = ++request;
      try {
        const result = await client.fetch<RollSource[]>(
          '*[_type == "roll"]{_id,publishedAt}',
          {},
          { perspective: "raw" },
        );
        if (!active || generation !== request) return;
        setSources(result);
        setError("");
        setLoaded(true);
      } catch (cause) {
        if (active)
          setError(cause instanceof Error ? cause.message : "Roll numbering is unavailable.");
      }
    }
    void load();
    const subscription = client
      .listen('*[_type == "roll"]', {}, { includeResult: false })
      .subscribe({ next: () => void load(), error: (cause: Error) => setError(cause.message) });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [client]);
  const current = deriveRolls([
    ...sources.filter((source) => source._id !== document._id),
    { _id: document._id, publishedAt: document.publishedAt },
  ]).at(-1);
  return (
    <div className="zc-roll-number">
      <output id={props.id}>
        {loaded && current ? rollId(current.number) : "Loading sequence…"}
      </output>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

export function RollFrameInput(props: ObjectInputProps) {
  const client = useClient({ apiVersion: "2026-03-26" });
  const assetRef = (props.value as StudioFrame | undefined)?.image?.asset?._ref;
  const previous = useRef(assetRef);
  const current = useRef(props);
  current.current = props;
  const [error, setError] = useState("");
  useEffect(() => {
    if (props.readOnly) return;
    const changed = previous.current !== assetRef;
    previous.current = assetRef;
    if (!changed && current.current.value?.exif) return;
    setError("");
    if (changed) current.current.onChange(unset(["exif"]));
    if (!assetRef) return;
    let active = true;
    async function extract() {
      try {
        const url = await client.fetch<string | null>("*[_id == $id][0].url", { id: assetRef });
        if (!url) return;
        const exif = await frameExif(url);
        if (active && exif) current.current.onChange(set({ _type: "exif", ...exif }, ["exif"]));
      } catch {
        if (active)
          setError(
            "Capture metadata could not be read from this image. The image can still be published.",
          );
      }
    }
    void extract();
    return () => {
      active = false;
    };
  }, [assetRef, client, props.readOnly]);
  return (
    <>
      {props.renderDefault(props)}
      {error && (
        <p className="zc-studio-meta" role="status">
          {error}
        </p>
      )}
    </>
  );
}

export function RollGroupsInput(props: ArrayOfObjectsInputProps) {
  const { readOnly, onChange } = props;
  const value = (props.value as StudioGroup[] | undefined) ?? EMPTY_GROUPS;
  const client = useClient({ apiVersion: "2026-03-26" });
  const imageBuilder = useMemo(() => createImageUrlBuilder(client), [client]);
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);
  const mounted = useRef(true);
  const busy = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const movedFocus = useRef<string | null>(null);
  const filesInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const drag = useRef<FrameLocation | null>(null);
  const [target, setTarget] = useState("");
  const [uploading, setUploading] = useState(false);
  const [over, setOver] = useState(false);
  const [status, setStatus] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const destination = value.some((group) => group._key === target)
    ? target
    : (value[0]?._key ?? "");
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!movedFocus.current) return;
    const control = root.current?.querySelector<HTMLSelectElement>(
      `[data-roll-frame="${CSS.escape(movedFocus.current)}"] select`,
    );
    if (control) {
      control.focus();
      movedFocus.current = null;
    }
  }, [value]);

  function addGroup(): string {
    const group: StudioGroup = { _key: crypto.randomUUID(), _type: "rollGroup", frames: [] };
    onChange(PatchEvent.from([setIfMissing([]), insert([group], "after", [-1])]));
    latest.current = [...latest.current, group];
    setTarget(group._key);
    return group._key;
  }

  async function uploadFiles(items: RollUploadFile[]) {
    if (busy.current || readOnly || !mounted.current) return;
    busy.current = true;
    setUploading(true);
    setErrors([]);
    const accepted = items.filter(({ file }) => isRollImage(file));
    const skipped = items.length - accepted.length;
    if (accepted.length === 0) {
      setStatus("No images found. Choose image files or a folder containing images.");
      busy.current = false;
      setUploading(false);
      return;
    }
    const groupKey = destination || addGroup();
    let completed = 0;
    const failures: string[] = [];
    for (const [index, { file, path }] of accepted.entries()) {
      if (!mounted.current) break;
      if (!latest.current.some((group) => group._key === groupKey)) {
        failures.push("The destination group was removed. Remaining files were not uploaded.");
        break;
      }
      setStatus(`Uploading ${index + 1} of ${accepted.length}: ${path}`);
      try {
        let exif: FrameExif | undefined;
        try {
          exif = await frameExif(file);
        } catch {
          failures.push(
            `${path}: capture metadata could not be read; the image is still being uploaded.`,
          );
        }
        if (!mounted.current) break;
        const asset = await client.assets.upload("image", file, { filename: file.name });
        if (!mounted.current) break;
        if (!latest.current.some((group) => group._key === groupKey)) {
          failures.push(
            `${path}: the group was removed during upload. The image is available in the asset library.`,
          );
          break;
        }
        const frame: StudioFrame = {
          _key: crypto.randomUUID(),
          _type: "rollFrame",
          image: { _type: "image", asset: { _type: "reference", _ref: asset._id } },
          alt: "",
          size: "half",
          aspect: "3:2",
          ...(exif ? { exif } : {}),
        };
        const pathToFrames = [{ _key: groupKey }, "frames"];
        onChange(
          PatchEvent.from([
            setIfMissing([], pathToFrames),
            insert([frame], "after", [...pathToFrames, -1]),
          ]),
        );
        latest.current = latest.current.map((group) =>
          group._key === groupKey ? { ...group, frames: [...(group.frames ?? []), frame] } : group,
        );
        completed += 1;
      } catch (cause) {
        failures.push(`${path}: ${cause instanceof Error ? cause.message : "Upload failed."}`);
      }
    }
    busy.current = false;
    if (mounted.current) {
      setUploading(false);
      setErrors(failures);
      setStatus(
        `${completed} of ${accepted.length} images added.${skipped ? ` ${skipped} non-image files skipped.` : ""} Add alt text to every frame before publishing.`,
      );
    }
  }

  async function dropFiles(event: DragEvent<HTMLDivElement>) {
    if (!Array.from(event.dataTransfer.types).includes("Files")) return;
    event.preventDefault();
    event.stopPropagation();
    setOver(false);
    if (busy.current || readOnly) return;
    setStatus("Reading folder contents…");
    try {
      await uploadFiles(await droppedRollFiles(event.dataTransfer));
    } catch (cause) {
      setErrors([
        cause instanceof Error
          ? cause.message
          : "The folder could not be read. Try Choose folder instead.",
      ]);
    }
  }

  function moveFrame(source: FrameLocation, groupKey: string, before?: string) {
    if (readOnly || busy.current) return;
    if (source.group === groupKey && source.frame === before) return;
    const from = latest.current.find((group) => group._key === source.group);
    const to = latest.current.find((group) => group._key === groupKey);
    const frame = from?.frames?.find((item) => item._key === source.frame);
    if (!frame || !to || (before && !to.frames?.some((item) => item._key === before))) return;
    onChange(
      PatchEvent.from([
        unset([{ _key: source.group }, "frames", { _key: source.frame }]),
        setIfMissing([], [{ _key: groupKey }, "frames"]),
        insert([frame], before ? "before" : "after", [
          { _key: groupKey },
          "frames",
          before ? { _key: before } : -1,
        ]),
      ]),
    );
    const next = latest.current.map((group) => {
      const frames = (group.frames ?? []).filter(
        (item) => group._key !== source.group || item._key !== source.frame,
      );
      if (group._key === groupKey) {
        const position = before ? frames.findIndex((item) => item._key === before) : frames.length;
        frames.splice(position, 0, frame);
      }
      return { ...group, frames };
    });
    latest.current = next;
    setStatus(
      `Frame moved to ${to.title || `group ${next.findIndex((group) => group._key === groupKey) + 1}`}. Empty groups must be removed or filled before publishing.`,
    );
  }

  function dropFrame(event: DragEvent<HTMLElement>, groupKey: string, before?: string) {
    if (!event.dataTransfer.types.includes(FRAME_DRAG_TYPE)) return;
    event.preventDefault();
    event.stopPropagation();
    if (drag.current) moveFrame(drag.current, groupKey, before);
    drag.current = null;
  }
  let frameNumber = 0;

  return (
    <div ref={root} className="zc-roll-authoring">
      <div
        className={`zc-roll-upload${over ? " is-over" : ""}`}
        onDragOver={(event) => {
          if (event.dataTransfer.types.includes("Files")) {
            event.preventDefault();
            setOver(true);
          }
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false);
        }}
        onDrop={(event) => void dropFiles(event)}
        aria-busy={uploading}
      >
        <strong>Drop images or a folder here</strong>
        <p>
          One frame per image, including nested folders. Files are ordered by name; each starts at
          half width, 3:2. Alt text is required before publishing.
        </p>
        <div className="zc-roll-tools">
          <label>
            Upload into
            <select
              value={destination}
              disabled={readOnly || uploading || value.length === 0}
              onChange={(event) => setTarget(event.currentTarget.value)}
            >
              {value.length === 0 && <option value="">New untitled group</option>}
              {value.map((group, index) => (
                <option key={group._key} value={group._key}>
                  {index + 1}. {group.title || "Untitled group"}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={readOnly || uploading}
            onClick={() => filesInput.current?.click()}
          >
            Choose images
          </button>
          <button
            type="button"
            disabled={readOnly || uploading}
            onClick={() => folderInput.current?.click()}
          >
            Choose folder
          </button>
          <button
            type="button"
            disabled={readOnly || uploading}
            onClick={() => {
              const key = addGroup();
              props.onPathFocus([{ _key: key }, "title"]);
            }}
          >
            Add group
          </button>
        </div>
        <input
          ref={filesInput}
          hidden
          type="file"
          accept="image/*"
          multiple
          disabled={readOnly || uploading}
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files ?? []).map((file) => ({
              file,
              path: file.name,
            }));
            event.currentTarget.value = "";
            void uploadFiles(sortRollFiles(files));
          }}
        />
        <input
          ref={(element) => {
            folderInput.current = element;
            element?.setAttribute("webkitdirectory", "");
          }}
          hidden
          type="file"
          multiple
          disabled={readOnly || uploading}
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files ?? []).map((file) => ({
              file,
              path: file.webkitRelativePath || file.name,
            }));
            event.currentTarget.value = "";
            void uploadFiles(sortRollFiles(files));
          }}
        />
      </div>
      <p className="zc-studio-meta" role="status" aria-live="polite">
        {status}
      </p>
      {errors.length > 0 && (
        <ul className="zc-roll-errors" role="alert">
          {errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      )}
      {value.length > 0 && (
        <details className="zc-roll-organizer" open>
          <summary>Arrange frames</summary>
          <p className="zc-studio-meta">
            Drag a frame onto another to insert before it, or onto a group footer to append.
            Keyboard: use Earlier / Later and Move to group. Edit opens the frame’s image, alt text,
            caption and visual controls.
          </p>
          {value.map((group, groupIndex) => (
            <section
              key={group._key}
              className="zc-roll-group"
              aria-label={group.title || `Group ${groupIndex + 1}`}
            >
              <header>
                <strong>
                  {String(groupIndex + 1).padStart(2, "0")} · {group.title || "Untitled group"}
                </strong>
                <div className="zc-roll-tools">
                  <button
                    type="button"
                    disabled={readOnly || uploading || groupIndex === 0}
                    onClick={() =>
                      props.onItemMove({ fromIndex: groupIndex, toIndex: groupIndex - 1 })
                    }
                  >
                    Group earlier
                  </button>
                  <button
                    type="button"
                    disabled={readOnly || uploading || groupIndex === value.length - 1}
                    onClick={() =>
                      props.onItemMove({ fromIndex: groupIndex, toIndex: groupIndex + 1 })
                    }
                  >
                    Group later
                  </button>
                  <button
                    type="button"
                    disabled={readOnly || uploading}
                    onClick={() => props.onPathFocus([{ _key: group._key }, "title"])}
                  >
                    Edit group
                  </button>
                </div>
              </header>
              <ol className="zc-roll-frames">
                {(group.frames ?? []).map((frame, index, frames) => {
                  const source = { group: group._key, frame: frame._key };
                  const number = ++frameNumber;
                  const label = `Frame ${String(number).padStart(2, "0")}`;
                  return (
                    <li
                      key={frame._key}
                      data-roll-frame={frame._key}
                      draggable={!readOnly && !uploading}
                      onDragStart={(event) => {
                        drag.current = source;
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData(FRAME_DRAG_TYPE, frame._key);
                      }}
                      onDragEnd={() => {
                        drag.current = null;
                      }}
                      onDragOver={(event) => {
                        if (event.dataTransfer.types.includes(FRAME_DRAG_TYPE)) {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                        }
                      }}
                      onDrop={(event) => dropFrame(event, group._key, frame._key)}
                    >
                      {frame.image?.asset?._ref && (
                        <img
                          src={imageBuilder
                            .image({ asset: { _ref: frame.image.asset._ref } })
                            .width(240)
                            .height(160)
                            .fit("crop")
                            .auto("format")
                            .url()}
                          alt=""
                          width="240"
                          height="160"
                          loading="lazy"
                          draggable={false}
                        />
                      )}
                      <strong>{label}</strong>
                      <span className={frame.alt?.trim() ? "zc-studio-meta" : "zc-roll-required"}>
                        {frame.alt?.trim() || "Alt text required"}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          props.onPathFocus([
                            { _key: group._key },
                            "frames",
                            { _key: frame._key },
                            "alt",
                          ])
                        }
                      >
                        Edit {label.toLowerCase()}
                      </button>
                      <div className="zc-roll-tools">
                        <button
                          type="button"
                          aria-label={`Move ${label.toLowerCase()} earlier`}
                          disabled={readOnly || uploading || index === 0}
                          onClick={() => moveFrame(source, group._key, frames[index - 1]._key)}
                        >
                          Earlier
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${label.toLowerCase()} later`}
                          disabled={readOnly || uploading || index === frames.length - 1}
                          onClick={() => moveFrame(source, group._key, frames[index + 2]?._key)}
                        >
                          Later
                        </button>
                      </div>
                      <label className="zc-studio-meta">
                        Move to group
                        <select
                          value={group._key}
                          disabled={readOnly || uploading || value.length < 2}
                          onChange={(event) => {
                            movedFocus.current = frame._key;
                            moveFrame(source, event.currentTarget.value);
                          }}
                        >
                          {value.map((option, optionIndex) => (
                            <option key={option._key} value={option._key}>
                              {optionIndex + 1}. {option.title || "Untitled group"}
                            </option>
                          ))}
                        </select>
                      </label>
                    </li>
                  );
                })}
              </ol>
              <div
                className="zc-roll-drop-end"
                onDragOver={(event) => {
                  if (event.dataTransfer.types.includes(FRAME_DRAG_TYPE)) event.preventDefault();
                }}
                onDrop={(event) => dropFrame(event, group._key)}
              >
                Drop a frame here to place it at the end of this group
              </div>
            </section>
          ))}
        </details>
      )}
      <div className="zc-roll-fields">{props.renderDefault(props)}</div>
    </div>
  );
}
