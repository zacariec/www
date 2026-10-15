import { parse } from "exifr";

export type RollUploadFile = { file: File; path: string };
export type FrameExif = {
  camera?: string;
  lens?: string;
  iso?: number;
  dateTaken?: string;
};

export function isRollImage(file: File): boolean {
  return (
    file.type.startsWith("image/") ||
    /\.(avif|bmp|gif|heic|heif|jpe?g|png|svg|tiff?|webp)$/i.test(file.name)
  );
}

export function sortRollFiles(files: RollUploadFile[]): RollUploadFile[] {
  return files.sort((a, b) => a.path.localeCompare(b.path, "en", { numeric: true }));
}

async function readEntry(entry: FileSystemEntry): Promise<RollUploadFile[]> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) =>
      (entry as FileSystemFileEntry).file(resolve, reject),
    );
    return [{ file, path: entry.fullPath }];
  }
  if (!entry.isDirectory) return [];
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  const files: RollUploadFile[] = [];
  // Chromium returns at most 100 entries per read; drain every directory reader.
  for (;;) {
    const entries = await new Promise<FileSystemEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject),
    );
    if (entries.length === 0) break;
    for (const child of entries) files.push(...(await readEntry(child)));
  }
  return files;
}

export async function droppedRollFiles(data: DataTransfer): Promise<RollUploadFile[]> {
  // Capture entries and fallback Files synchronously, before the drop event expires.
  const items = Array.from(data.items ?? [])
    .filter((item) => item.kind === "file")
    .map((item) => ({ entry: item.webkitGetAsEntry?.(), file: item.getAsFile() }));
  const fallback = Array.from(data.files).map((file) => ({
    file,
    path: file.webkitRelativePath || file.name,
  }));
  if (items.length === 0) return sortRollFiles(fallback);
  const files: RollUploadFile[] = [];
  for (const item of items) {
    if (item.entry) files.push(...(await readEntry(item.entry)));
    else if (item.file) files.push({ file: item.file, path: item.file.name });
  }
  return sortRollFiles(files);
}

export async function frameExif(file: File | string): Promise<FrameExif | undefined> {
  const tags = (await parse(file, {
    pick: ["Make", "Model", "LensModel", "ISO", "DateTimeOriginal", "OffsetTimeOriginal"],
    reviveValues: false,
    gps: false,
    makerNote: false,
    userComment: false,
  })) as Record<string, unknown> | undefined;
  if (!tags) return undefined;
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const make = text(tags.Make);
  const model = text(tags.Model);
  const camera = model.toLowerCase().startsWith(make.toLowerCase())
    ? model
    : [make, model].filter(Boolean).join(" ");
  const lens = text(tags.LensModel);
  const iso = Number(tags.ISO);
  const taken = text(tags.DateTimeOriginal);
  const offset = text(tags.OffsetTimeOriginal);
  const dateTaken = taken.replace(/^(\d{4}):(\d{2}):(\d{2})[ T]/, "$1-$2-$3T");
  const exif: FrameExif = {};
  if (camera) exif.camera = camera;
  if (lens) exif.lens = lens;
  if (Number.isFinite(iso) && iso > 0) exif.iso = iso;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateTaken))
    exif.dateTaken = dateTaken + (/^[+-]\d{2}:\d{2}$/.test(offset) ? offset : "");
  return Object.keys(exif).length > 0 ? exif : undefined;
}
