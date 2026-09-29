import { getPreferences, subscribePreferences } from "./preferences";
import { mountHeat } from "./zc-heat";

import type { Heatmap } from "./zc-heat";

export interface CortexSession {
  number: number;
  readTime: number;
  kind: "session" | "tape";
}

type Kind = "cover" | "blot" | "cortex" | "lava";
type RGB = [number, number, number];
interface Branch {
  points: Float32Array;
  depth: number;
  index: number;
  tape: boolean;
}
interface Parameters {
  blobs: Float32Array;
  phases: Float32Array;
  waves: Float32Array;
  drops: Float32Array;
  moving: Float32Array;
  movingDrops: Float32Array;
}
interface CanvasState {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  buffer: HTMLCanvasElement;
  bufferContext: CanvasRenderingContext2D;
  observer: ResizeObserver;
  kind: Kind;
  seed: number;
  sessionData: string;
  parameters: Parameters;
  branches: Branch[];
  count: number;
  started: number;
  dirty: boolean;
  visible: boolean;
  animated: boolean;
  drift: boolean;
  highlight: number;
  origin: number;
  scale: number;
  fade: number;
  fadeBottom: number;
  leftGradient: CanvasGradient | null;
  bottomGradient: CanvasGradient | null;
  fg: RGB;
  bg: RGB;
  clear: boolean;
  palette: Float32Array;
  image: ImageData | null;
  source: string | undefined;
  artwork: HTMLImageElement | null;
  artworkPixels: Uint8ClampedArray | null;
  artworkWidth: number;
  artworkHeight: number;
  artworkTime: number;
  artworkMotion: boolean;
  texture: WebGLTexture | null;
  textureGeneration: number;
}
const CELL = 3;
const INTERVAL = 1000 / 30;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const branchStroke = [
  "rgba(255,255,255,0.399)",
  "rgba(255,255,255,0.95)",
  "rgba(255,255,255,0.21)",
  "rgba(255,255,255,0.5)",
];
const branchShadow = [
  "rgba(255,255,255,0.2394)",
  "rgba(255,255,255,0.57)",
  "rgba(255,255,255,0.126)",
  "rgba(255,255,255,0.3)",
];
const modes: Record<Kind, number> = { cover: 0, blot: 1, cortex: 2, lava: 3 };
const attributes = [
  "data-zc",
  "data-seed",
  "data-fg",
  "data-bg",
  "data-colors",
  "data-anim",
  "data-sessions",
  "data-ox",
  "data-scale",
  "data-fade",
  "data-fadeb",
  "data-drift",
  "data-highlight",
  "data-src",
  "data-days",
  "data-weeks",
  "data-legend",
];
const states = new Map<HTMLCanvasElement, CanvasState>();
const heatmaps = new Map<HTMLCanvasElement, Heatmap>();
let initialized = false;
let suspended = false;
let reduced = false;
let raf = 0;
let last = 0;
let elapsed = 0;
let frame = 0;
let checkVisibility = true;
let mutationObserver: MutationObserver;
let pulse: HTMLCanvasElement;
let gpu: Graphics | null = null;
let graphicsAttempted = false;

function random(seed: number): () => number {
  let valueSeed = seed;
  return () => {
    valueSeed = (valueSeed + 0x6d2b79f5) | 0;
    let value = Math.imul(valueSeed ^ (valueSeed >>> 15), 1 | valueSeed);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function numeric(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return value !== undefined && value !== "" && Number.isFinite(parsed) ? parsed : fallback;
}

function color(style: CSSStyleDeclaration, value: string | undefined, fallback: string): RGB {
  let resolved =
    (value?.startsWith("--") ? style.getPropertyValue(value) : value)?.trim() ||
    style.getPropertyValue(fallback).trim();
  if (resolved.startsWith("#")) {
    resolved = resolved.slice(1);
    if (resolved.length === 3)
      resolved = resolved
        .split("")
        .map((digit) => digit + digit)
        .join("");
    return [
      parseInt(resolved.slice(0, 2), 16) || 0,
      parseInt(resolved.slice(2, 4), 16) || 0,
      parseInt(resolved.slice(4, 6), 16) || 0,
    ];
  }
  const channels = resolved.match(/[\d.]+/g);
  return channels && channels.length >= 3
    ? [Number(channels[0]), Number(channels[1]), Number(channels[2])]
    : [0, 0, 0];
}

function parameters(kind: Kind, seed: number): Parameters {
  const blobs = new Float32Array(24);
  const phases = new Float32Array(6);
  const waves = new Float32Array(4);
  const drops = new Float32Array(102);
  let multiplier = 131;
  if (kind === "lava") multiplier = 313;
  else if (kind === "cover") multiplier = 977;
  const rng = random(seed * multiplier);
  const count = kind === "cover" ? 4 : 6;
  for (let i = 0; i < count; i++) {
    const j = i * 4;
    if (kind === "lava") {
      blobs[j] = 0.12 + rng() * 0.76;
      blobs[j + 1] = 0.18 + rng() * 0.64;
      blobs[j + 2] = 0.075 + rng() * 0.06;
      blobs[j + 3] = 0.6 + rng() * 0.9;
    } else if (kind === "cover") {
      blobs[j] = rng();
      blobs[j + 1] = rng();
      blobs[j + 2] = 0.15 + rng() * 0.35;
      blobs[j + 3] = 0.5 + rng() * 0.6;
    } else {
      blobs[j] = 0.5 + (rng() - 0.5) * 0.5;
      blobs[j + 1] = 0.5 + (rng() - 0.5) * 0.45;
      blobs[j + 2] = i ? 0.1 + rng() * 0.16 : 0.26;
      blobs[j + 3] = 0.6 + rng() * 0.5;
    }
    phases[i] = rng() * 6.28;
  }
  if (kind === "cover") {
    blobs[18] = 1;
    blobs[22] = 1;
    waves[0] = rng() * Math.PI;
    waves[1] = 6 + rng() * 18;
  } else if (kind === "blot") {
    for (let i = 0; i < 34; i++) {
      const angle = rng() * 6.28;
      const distance = 0.3 + rng() * 0.2;
      drops[i * 3] = 0.5 + Math.cos(angle) * distance;
      drops[i * 3 + 1] = 0.5 + Math.sin(angle) * distance * 0.9;
      drops[i * 3 + 2] = 0.006 + rng() * 0.022;
    }
    waves.set([5 + rng() * 6, 9 + rng() * 9, rng() * 6, rng() * 6]);
  }
  return {
    blobs,
    phases,
    waves,
    drops,
    moving: new Float32Array(24),
    movingDrops: new Float32Array(102),
  };
}

function cortex(sessions: CortexSession[]): Branch[] {
  const rng = random(7);
  const branches: Branch[] = [];
  function grow(
    startX: number,
    startY: number,
    initialAngle: number,
    length: number,
    depth: number,
    index: number,
    tape: boolean,
  ): void {
    let x = startX;
    let y = startY;
    let angle = initialAngle;
    const points = new Float32Array((Math.ceil(length) + 1) * 2);
    points[0] = x;
    points[1] = y;
    const step = depth ? 0.009 : 0.011;
    for (let k = 0; k < length; k++) {
      angle += (rng() - 0.5) * 0.75 + Math.sin(k * 0.33 + index) * 0.09;
      x += Math.cos(angle) * step;
      y += Math.sin(angle) * step;
      points[(k + 1) * 2] = x;
      points[(k + 1) * 2 + 1] = y;
      if (depth < 3 && k > 2 && rng() < (depth ? 0.1 : 0.16)) {
        grow(
          x,
          y,
          angle + (rng() < 0.5 ? -1 : 1) * (0.5 + rng() * 0.7),
          Math.max(4, (length - k) * 0.55),
          depth + 1,
          index,
          tape,
        );
      }
    }
    branches.push({ points, depth, index, tape });
  }
  sessions.forEach((session, index) => {
    const angle = (index / sessions.length) * Math.PI * 2 + rng() * 0.5;
    grow(
      0.5 + Math.cos(angle) * 0.015,
      0.5 + Math.sin(angle) * 0.015,
      angle,
      Math.min(72, 16 + session.readTime * 2.2),
      0,
      index,
      session.kind === "tape",
    );
  });
  return branches;
}

function configure(state: CanvasState): void {
  const data = state.canvas.dataset;
  const kind = data.zc as Kind;
  const seed = numeric(data.seed, 1);
  if (state.kind !== kind || state.seed !== seed) state.parameters = parameters(kind, seed);
  state.kind = kind;
  state.seed = seed;
  state.animated = data.anim === "true";
  state.drift = data.drift === "true";
  state.highlight = numeric(data.highlight, -1);
  state.origin = numeric(data.ox, 0.62);
  state.scale = numeric(data.scale, 1);
  state.fade = Math.max(0, Math.min(1, numeric(data.fade, 0)));
  state.fadeBottom = Math.max(0, Math.min(1, numeric(data.fadeb, 0)));
  if (state.kind === "cover" && state.source !== data.src) loadArtwork(state, data.src);
  if (state.kind === "cortex" && state.sessionData !== (data.sessions || "[]")) {
    state.sessionData = data.sessions || "[]";
    let sessions: CortexSession[] = [];
    try {
      const parsed: unknown = JSON.parse(state.sessionData);
      if (Array.isArray(parsed))
        sessions = parsed
          .filter(
            (item: unknown): item is CortexSession =>
              typeof item === "object" &&
              item !== null &&
              "number" in item &&
              Number.isFinite(item.number) &&
              "readTime" in item &&
              typeof item.readTime === "number" &&
              Number.isFinite(item.readTime) &&
              item.readTime >= 0 &&
              "kind" in item &&
              (item.kind === "session" || item.kind === "tape"),
          )
          .sort((a, b) => a.number - b.number);
    } catch {
      /* A temporarily incomplete Studio update has no branches. */
    }
    state.count = sessions.length;
    state.branches = cortex(sessions);
  } else if (state.kind !== "cortex" && state.branches.length) {
    state.sessionData = "";
    state.branches = [];
    state.count = 0;
  }
  refreshColors(state);
  resize(state, true);
  state.dirty = true;
}

function loadArtwork(state: CanvasState, source: string | undefined): void {
  state.source = source;
  state.artwork = null;
  state.artworkPixels = null;
  state.artworkTime = 0;
  state.artworkMotion = false;
  if (state.texture && gpu) gpu.gl.deleteTexture(state.texture);
  state.texture = null;
  delete state.canvas.dataset.imageReady;
  const fallback = state.canvas.closest("[data-image-cover]")?.querySelector("img");
  if (fallback) {
    if (source) fallback.src = source;
    else fallback.removeAttribute("src");
  }
  if (!source) return;
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.decoding = "async";
  image.onload = () => {
    if (state.source !== source || !state.canvas.isConnected) return;
    // Read once, after a CORS-approved load. Reuse these real pixels on the CPU
    // when WebGL is unavailable/lost, rather than substituting a procedural seed.
    const sample = document.createElement("canvas");
    const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
    sample.width = Math.max(1, Math.round(image.naturalWidth * scale));
    sample.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = sample.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    try {
      context.drawImage(image, 0, 0, sample.width, sample.height);
      state.artworkPixels = context.getImageData(0, 0, sample.width, sample.height).data;
    } catch {
      // A denied/tainted source leaves the ordinary image visible.
      return;
    }
    state.artworkWidth = sample.width;
    state.artworkHeight = sample.height;
    state.artwork = image;
    state.dirty = true;
    schedule();
  };
  image.src = source;
}

function refreshColors(state: CanvasState): void {
  const style = getComputedStyle(state.canvas);
  state.fg = color(style, state.canvas.dataset.fg, "--ink");
  state.clear = state.canvas.dataset.bg === "transparent";
  state.bg = state.clear ? [0, 0, 0] : color(style, state.canvas.dataset.bg, "--paper");
  const colors = (state.canvas.dataset.colors || "--pink,--sand,--sage")
    .split(",")
    .map((value) => color(style, value.trim(), "--pink"));
  for (let i = 0; i < 6; i++) {
    const entry = colors[i % colors.length];
    state.palette[i * 3] = entry[0] / 255;
    state.palette[i * 3 + 1] = entry[1] / 255;
    state.palette[i * 3 + 2] = entry[2] / 255;
  }
}

function resize(state: CanvasState, force = false): void {
  const bounds = state.canvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.max(1, Math.ceil(bounds.width / CELL));
  const height = Math.max(1, Math.ceil(bounds.height / CELL));
  const outputWidth = Math.max(1, Math.round(bounds.width * ratio));
  const outputHeight = Math.max(1, Math.round(bounds.height * ratio));
  if (
    !force &&
    state.canvas.width === outputWidth &&
    state.canvas.height === outputHeight &&
    state.buffer.width === width &&
    state.buffer.height === height
  )
    return;
  if (state.canvas.width !== outputWidth) state.canvas.width = outputWidth;
  if (state.canvas.height !== outputHeight) state.canvas.height = outputHeight;
  if (state.buffer.width !== width || state.buffer.height !== height) {
    state.buffer.width = width;
    state.buffer.height = height;
    state.image = null;
  }
  // Size the shared GPU surface before painting any canvas. Growing it mid-frame
  // changes pixelated source-crop rounding, making the first static frame differ.
  if (gpu && (gpu.canvas.width < width || gpu.canvas.height < height)) {
    if (gpu.canvas.width < width) gpu.canvas.width = width;
    if (gpu.canvas.height < height) gpu.canvas.height = height;
    for (const mounted of states.values()) mounted.dirty = true;
  }
  const context = state.bufferContext;
  state.leftGradient = null;
  state.bottomGradient = null;
  if (state.fade) {
    state.leftGradient = context.createLinearGradient(0, 0, width * state.fade, 0);
    state.leftGradient.addColorStop(0, "rgba(0,0,0,0.8)");
    state.leftGradient.addColorStop(1, "rgba(0,0,0,0)");
  }
  if (state.fadeBottom) {
    state.bottomGradient = context.createLinearGradient(
      0,
      height * (1 - state.fadeBottom),
      0,
      height,
    );
    state.bottomGradient.addColorStop(0, "rgba(0,0,0,0)");
    state.bottomGradient.addColorStop(1, "rgba(0,0,0,1)");
  }
  state.context.imageSmoothingEnabled = false;
  state.dirty = true;
  checkVisibility = true;
  schedule();
}

const fragment = `precision highp float;
uniform vec2 uRes; uniform float uT,uKind,uAnim,uClear,uAsp,uImage,uImageAsp;
uniform vec3 uFg,uBg; uniform sampler2D uTex;
uniform vec4 uB[6]; uniform float uPh[6]; uniform vec4 uP;
uniform vec3 uD[34]; uniform vec3 uC[6];
float b2(vec2 a){return a.x*2.+a.y*3.-4.*a.x*a.y;}
float bayer(vec2 p){p=mod(p,4.);return (4.*b2(mod(p,2.))+b2(floor(p/2.))+.5)/16.;}
void main(){
  vec2 px=vec2(floor(gl_FragCoord.x),uRes.y-1.-floor(gl_FragCoord.y));
  float x=(px.x+.5)/uRes.x,y=(px.y+.5)/uRes.y,v=0.;
  if(uKind<.5){
    if(uImage>.5){
      vec2 uv=vec2(x,y);
      if(uAnim>.5)uv+=vec2(sin(y*8.+uT*.7)*.012,cos(x*7.+uT*.5)*.01);
      if(uImageAsp>uAsp)uv.x=(uv.x-.5)*uAsp/uImageAsp+.5;
      else uv.y=(uv.y-.5)*uImageAsp/uAsp+.5;
      v=1.-dot(texture2D(uTex,clamp(uv,0.,1.)).rgb,vec3(.2126,.7152,.0722));
      if(uAnim>.5&&abs(y-fract(uT*.18))<.012)v=1.-v*.4;
    }else{
    v=.12+y*.12;
    for(int i=0;i<4;i++){vec4 b=uB[i];float dx=(x-b.x-sin(uT*.7+uPh[i])*.14)*uAsp;float dy=y-b.y-cos(uT*.5+uPh[i])*.1;v+=b.w*exp(-(dx*dx+dy*dy)/(b.z*b.z));}
    v+=.14*sin((x*uAsp*cos(uP.x)+y*sin(uP.x))*uP.y-uT*2.2);
    if(uAnim>.5){float hd=fract(uT*.18);if(abs(y-hd)<.012)v=1.-v*.4;}
    v=clamp(v*.62,0.,1.);
    }
  }else if(uKind<1.5){
    float m=min(uAsp,1.6);
    for(int i=0;i<6;i++){vec4 b=uB[i];float dx=(x-b.x-sin(uT*.31+uPh[i])*.07)*m;float dy=y-b.y-cos(uT*.23+uPh[i]*1.3)*.06;v+=b.w*exp(-(dx*dx+dy*dy)/(b.z*b.z*(1.+.12*sin(uT*.4+uPh[i]))));}
    v+=.16*sin(x*uP.x+uP.z+uT*.4)*sin(y*uP.y+uP.w)+.08*sin((x+y)*uP.y*1.7+uP.z);
    for(int i=0;i<34;i++){vec3 d=uD[i];float fi=float(i);float dx=(x-d.x-sin(uT*.35+fi)*.018)*m;float dy=y-d.y-cos(uT*.28+fi*1.7)*.018;if(dx*dx+dy*dy<d.z*d.z)v=1.;}
    float e=clamp(min(min(x,1.-x),min(y,1.-y))*8.,0.,1.);
    v=clamp((v-.32)*2.4,0.,1.)*e;
  }else if(uKind>2.5){
    float total=0.,best=0.,second=0.;vec3 cb=uC[0],cs=uC[0];
    for(int i=0;i<6;i++){vec4 b=uB[i];float ph=uPh[i];vec2 c=vec2(b.x+sin(uT*.23*b.w+ph)*.26,b.y+cos(uT*.19*b.w+ph*1.7)*.3);float dx=(x-c.x)*uAsp,dy=y-c.y;float f=b.z*b.z/(dx*dx+dy*dy+1e-4);total+=f;if(f>best){second=best;cs=cb;best=f;cb=uC[i];}else if(f>second){second=f;cs=uC[i];}}
    float inside=step(bayer(px),clamp((total-.8)*2.3,0.,1.));
    vec3 col=bayer(px+vec2(2.,1.))<second/(best+second+1e-4)*1.15?cs:cb;
    gl_FragColor=vec4(col*inside,inside);return;
  }else{v=texture2D(uTex,vec2(x,y)).r;}
  float on=step(bayer(px),v),alpha=max(on,1.-uClear);
  gl_FragColor=vec4(mix(uBg,uFg,on)*alpha,alpha);
}`;
type Uniform =
  | "uRes"
  | "uT"
  | "uKind"
  | "uAnim"
  | "uClear"
  | "uAsp"
  | "uFg"
  | "uBg"
  | "uTex"
  | "uImage"
  | "uImageAsp"
  | "uP"
  | "uB"
  | "uPh"
  | "uD"
  | "uC";
interface Graphics {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  uniforms: Record<Uniform, WebGLUniformLocation | null>;
  ready: boolean;
  texture: WebGLTexture | null;
  generation: number;
}

function setupGraphics(graphics: Graphics): void {
  const { gl } = graphics;
  const compile = (type: number, source: string): WebGLShader => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Unable to allocate graphic shader");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      throw new Error("Graphic shader unavailable");
    }
    return shader;
  };
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to allocate graphic program");
  const vertex = compile(
    gl.VERTEX_SHADER,
    "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}",
  );
  const precision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
  const pixel = compile(
    gl.FRAGMENT_SHADER,
    precision?.precision ? fragment : fragment.replace("highp", "mediump"),
  );
  gl.attachShader(program, vertex);
  gl.attachShader(program, pixel);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(pixel);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    throw new Error("Graphic program unavailable");
  }
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  for (const key of [
    "uRes",
    "uT",
    "uKind",
    "uAnim",
    "uClear",
    "uAsp",
    "uFg",
    "uBg",
    "uTex",
    "uImage",
    "uImageAsp",
    "uP",
    "uB",
    "uPh",
    "uD",
    "uC",
  ] as const) {
    graphics.uniforms[key] = gl.getUniformLocation(
      program,
      ["uB", "uPh", "uD", "uC"].includes(key) ? `${key}[0]` : key,
    );
  }
  graphics.texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, graphics.texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(graphics.uniforms.uTex, 0);
  graphics.ready = true;
  graphics.generation++;
}

function createGraphics(): Graphics | null {
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 8;
  let gl: WebGLRenderingContext | null;
  try {
    gl = canvas.getContext("webgl", {
      premultipliedAlpha: true,
      antialias: false,
      preserveDrawingBuffer: true,
      alpha: true,
    });
  } catch {
    return null;
  }
  if (!gl) return null;
  const graphics: Graphics = {
    canvas,
    gl,
    uniforms: {} as Graphics["uniforms"],
    ready: false,
    texture: null,
    generation: 0,
  };
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    graphics.ready = false;
    refresh();
  });
  canvas.addEventListener("webglcontextrestored", () => {
    try {
      setupGraphics(graphics);
    } catch {
      graphics.ready = false;
    }
    refresh();
  });
  try {
    setupGraphics(graphics);
  } catch {
    graphics.ready = false;
  }
  return graphics;
}

function drawGraphics(state: CanvasState, time: number): void {
  if (!gpu?.ready) return;
  const { gl, canvas, uniforms: u } = gpu;
  const { width } = state.buffer;
  const { height } = state.buffer;
  gl.viewport(0, 0, width, height);
  gl.uniform2f(u.uRes, width, height);
  gl.uniform1f(u.uT, time);
  gl.uniform1f(u.uKind, modes[state.kind]);
  gl.uniform1f(
    u.uAnim,
    state.artwork ? Number(state.artworkMotion) : Number(state.animated && !reduced),
  );
  gl.uniform1f(u.uClear, state.clear ? 1 : 0);
  gl.uniform1f(u.uAsp, width / height);
  gl.uniform1f(u.uImage, state.artwork ? 1 : 0);
  gl.uniform1f(u.uImageAsp, state.artwork ? state.artworkWidth / state.artworkHeight : 1);
  gl.uniform3f(u.uFg, state.fg[0] / 255, state.fg[1] / 255, state.fg[2] / 255);
  gl.uniform3f(u.uBg, state.bg[0] / 255, state.bg[1] / 255, state.bg[2] / 255);
  if (state.artwork) {
    if (!state.texture || state.textureGeneration !== gpu.generation) {
      state.texture = gl.createTexture();
      if (!state.texture) throw new Error("Unable to allocate artwork texture");
      gl.bindTexture(gl.TEXTURE_2D, state.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, state.artwork);
      if (gl.getError() !== gl.NO_ERROR) throw new Error("Artwork texture upload failed");
      state.textureGeneration = gpu.generation;
    } else gl.bindTexture(gl.TEXTURE_2D, state.texture);
  } else if (state.kind === "cortex") {
    gl.bindTexture(gl.TEXTURE_2D, gpu.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, state.buffer);
  } else {
    const p = state.parameters;
    gl.uniform4fv(u.uB, p.blobs);
    gl.uniform1fv(u.uPh, p.phases);
    gl.uniform4fv(u.uP, p.waves);
    if (state.kind === "blot") gl.uniform3fv(u.uD, p.drops);
    if (state.kind === "lava") gl.uniform3fv(u.uC, state.palette);
  }
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  state.context.clearRect(0, 0, state.canvas.width, state.canvas.height);
  state.context.drawImage(
    canvas,
    0,
    canvas.height - height,
    width,
    height,
    0,
    0,
    state.canvas.width,
    state.canvas.height,
  );
}

function drawCpu(state: CanvasState, time: number): void {
  const { width } = state.buffer;
  const { height } = state.buffer;
  const aspect = width / height;
  const isCortex = state.kind === "cortex";
  const image = isCortex
    ? state.bufferContext.getImageData(0, 0, width, height)
    : (state.image ??= state.bufferContext.createImageData(width, height));
  const pixels = image.data;
  const { blobs, phases, waves, drops, moving, movingDrops } = state.parameters;
  const count = state.kind === "cover" ? 4 : 6;
  if (!isCortex)
    for (let i = 0; i < count; i++) {
      const j = i * 4;
      const phase = phases[i];
      if (state.kind === "lava") {
        moving[j] = blobs[j] + Math.sin(time * 0.23 * blobs[j + 3] + phase) * 0.26;
        moving[j + 1] = blobs[j + 1] + Math.cos(time * 0.19 * blobs[j + 3] + phase * 1.7) * 0.3;
      } else if (state.kind === "cover") {
        moving[j] = blobs[j] + Math.sin(time * 0.7 + phase) * 0.14;
        moving[j + 1] = blobs[j + 1] + Math.cos(time * 0.5 + phase) * 0.1;
      } else {
        moving[j] = blobs[j] + Math.sin(time * 0.31 + phase) * 0.07;
        moving[j + 1] = blobs[j + 1] + Math.cos(time * 0.23 + phase * 1.3) * 0.06;
      }
      moving[j + 2] =
        blobs[j + 2] ** 2 * (state.kind === "blot" ? 1 + 0.12 * Math.sin(time * 0.4 + phase) : 1);
      moving[j + 3] = blobs[j + 3];
    }
  if (state.kind === "blot")
    for (let i = 0; i < 34; i++) {
      movingDrops[i * 3] = drops[i * 3] + Math.sin(time * 0.35 + i) * 0.018;
      movingDrops[i * 3 + 1] = drops[i * 3 + 1] + Math.cos(time * 0.28 + i * 1.7) * 0.018;
      movingDrops[i * 3 + 2] = drops[i * 3 + 2] ** 2;
    }
  const waveX = aspect * Math.cos(waves[0]);
  const waveY = Math.sin(waves[0]);
  for (let py = 0; py < height; py++)
    for (let px = 0; px < width; px++) {
      const offset = (py * width + px) * 4;
      const x = (px + 0.5) / width;
      const y = (py + 0.5) / height;
      const threshold = (BAYER[(py & 3) * 4 + (px & 3)] + 0.5) / 16;
      let value = 0;
      if (isCortex) value = pixels[offset] / 255;
      else if (state.kind === "cover") value = 0.12 + y * 0.12;
      let best = 0;
      let second = 0;
      let bestIndex = 0;
      let secondIndex = 0;
      if (!isCortex)
        for (let i = 0; i < count; i++) {
          const j = i * 4;
          const dx = (x - moving[j]) * (state.kind === "blot" ? Math.min(aspect, 1.6) : aspect);
          const dy = y - moving[j + 1];
          if (state.kind === "lava") {
            const field = moving[j + 2] / (dx * dx + dy * dy + 0.0001);
            value += field;
            if (field > best) {
              second = best;
              secondIndex = bestIndex;
              best = field;
              bestIndex = i;
            } else if (field > second) {
              second = field;
              secondIndex = i;
            }
          } else value += moving[j + 3] * Math.exp(-(dx * dx + dy * dy) / moving[j + 2]);
        }
      if (state.kind === "cover") {
        value += 0.14 * Math.sin((x * waveX + y * waveY) * waves[1] - time * 2.2);
        if (state.animated && !reduced && Math.abs(y - ((time * 0.18) % 1)) < 0.012)
          value = 1 - value * 0.4;
        value = Math.max(0, Math.min(1, value * 0.62));
      } else if (state.kind === "blot") {
        value +=
          0.16 *
            Math.sin(x * waves[0] + waves[2] + time * 0.4) *
            Math.sin(y * waves[1] + waves[3]) +
          0.08 * Math.sin((x + y) * waves[1] * 1.7 + waves[2]);
        for (let i = 0; i < 34; i++) {
          const dx = (x - movingDrops[i * 3]) * Math.min(aspect, 1.6);
          const dy = y - movingDrops[i * 3 + 1];
          if (dx * dx + dy * dy < movingDrops[i * 3 + 2]) {
            value = 1;
            break;
          }
        }
        value =
          Math.max(0, Math.min(1, (value - 0.32) * 2.4)) *
          Math.min(1, Math.min(x, 1 - x, y, 1 - y) * 8);
      } else if (state.kind === "lava") {
        const inside = Math.max(0, Math.min(1, (value - 0.8) * 2.3)) >= threshold;
        const mix = (BAYER[((py + 1) & 3) * 4 + ((px + 2) & 3)] + 0.5) / 16;
        const index =
          (mix < (second / (best + second + 0.0001)) * 1.15 ? secondIndex : bestIndex) * 3;
        pixels[offset] = state.palette[index] * 255;
        pixels[offset + 1] = state.palette[index + 1] * 255;
        pixels[offset + 2] = state.palette[index + 2] * 255;
        pixels[offset + 3] = inside ? 255 : 0;
        continue;
      }
      const on = value >= threshold;
      const [red, green, blue] = on ? state.fg : state.bg;
      pixels[offset] = red;
      pixels[offset + 1] = green;
      pixels[offset + 2] = blue;
      pixels[offset + 3] = on || !state.clear ? 255 : 0;
    }
  state.bufferContext.putImageData(image, 0, 0);
  state.context.clearRect(0, 0, state.canvas.width, state.canvas.height);
  state.context.drawImage(state.buffer, 0, 0, state.canvas.width, state.canvas.height);
}

function drawCortex(state: CanvasState): void {
  const context = state.bufferContext;
  const { width } = state.buffer;
  const { height } = state.buffer;
  const time = reduced ? 0 : elapsed / 1000;
  const progress = reduced ? 1 : Math.min(1, (elapsed - state.started) / 2800);
  const drift = state.drift && !reduced;
  const ox = state.origin + (drift ? 0.06 * Math.sin(time * 0.09) : 0);
  const oy = 0.5 + (drift ? 0.07 * Math.cos(time * 0.07) : 0);
  const size = height * 1.9 * state.scale * (drift ? 1 + 0.22 * Math.sin(time * 0.12) : 1);
  const rotation = drift ? 0.22 * Math.sin(time * 0.05) : 0;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const xx = 1.55 * cos * size;
  const xy = -sin * size;
  const yx = 1.55 * sin * size;
  const yy = cos * size;
  const cx = width * ox;
  const cy = height * oy;
  context.fillStyle = "#000";
  context.fillRect(0, 0, width, height);
  context.lineCap = "round";
  context.lineJoin = "round";
  for (const branch of state.branches) {
    // Include the final branch and its terminal node at progress=1.
    const local =
      progress >= 1 ? 1 : Math.min(1, (progress * (state.count + 0.2) - branch.index) / 1.2);
    if (local <= 0) continue;
    const lit = state.highlight < 0 || state.highlight === branch.index;
    const shade = (branch.depth ? 2 : 0) + (lit ? 1 : 0);
    const { points } = branch;
    const end = Math.min(points.length, Math.max(4, Math.floor((points.length / 2) * local) * 2));
    context.shadowColor = branchShadow[shade];
    context.shadowBlur = lit && state.highlight >= 0 ? 6 : 3;
    context.strokeStyle = branchStroke[shade];
    context.lineWidth = (branch.depth ? 0.7 : 1.3) * (state.highlight === branch.index ? 1.7 : 1);
    context.beginPath();
    for (let i = 0; i < end; i += 2) {
      const x = points[i] - 0.5;
      const y = points[i + 1] - 0.5;
      if (i) context.lineTo(cx + x * xx + y * xy, cy + x * yx + y * yy);
      else context.moveTo(cx + x * xx + y * xy, cy + x * yx + y * yy);
    }
    context.stroke();
    if (!branch.depth && local >= 1) {
      const x = points[points.length - 2] - 0.5;
      const y = points[points.length - 1] - 0.5;
      const nx = cx + x * xx + y * xy;
      const ny = cy + x * yx + y * yy;
      context.fillStyle = lit ? "#fff" : "rgba(255,255,255,0.5)";
      if (branch.tape) context.fillRect(nx - 2.5, ny - 2.5, 5, 5);
      else {
        context.beginPath();
        context.arc(nx, ny, 1.8, 0, Math.PI * 2);
        context.fill();
      }
    }
  }
  context.shadowBlur = 0;
  if (!reduced && progress >= 1)
    for (const branch of state.branches) {
      if (branch.depth || (state.highlight >= 0 && state.highlight !== branch.index)) continue;
      const fraction = (elapsed / (2600 + branch.index * 170) + branch.index * 0.37) % 1;
      const index = Math.floor(fraction * (branch.points.length / 2 - 1)) * 2;
      const x = branch.points[index] - 0.5;
      const y = branch.points[index + 1] - 0.5;
      context.drawImage(pulse, cx + x * xx + y * xy - 7, cy + x * yx + y * yy - 7, 14, 14);
    }
  if (state.count) context.drawImage(pulse, cx - 10, cy - 10);
  if (state.leftGradient) {
    context.fillStyle = state.leftGradient;
    context.fillRect(0, height * 0.35, width * state.fade, height * 0.65);
  }
  if (state.bottomGradient) {
    context.fillStyle = state.bottomGradient;
    context.fillRect(0, height * (1 - state.fadeBottom), width, height * state.fadeBottom);
  }
}

function drawArtworkCpu(state: CanvasState): void {
  const source = state.artworkPixels;
  if (!source) return;
  const { width, height } = state.buffer;
  state.image ??= state.bufferContext.createImageData(width, height);
  const { image } = state;
  const pixels = image.data;
  const aspect = width / height;
  const sourceAspect = state.artworkWidth / state.artworkHeight;
  const time = state.artworkTime;
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const x = (px + 0.5) / width;
      const y = (py + 0.5) / height;
      let u = x;
      let v = y;
      if (state.artworkMotion) {
        u += Math.sin(y * 8 + time * 0.7) * 0.012;
        v += Math.cos(x * 7 + time * 0.5) * 0.01;
      }
      if (sourceAspect > aspect) u = ((u - 0.5) * aspect) / sourceAspect + 0.5;
      else v = ((v - 0.5) * sourceAspect) / aspect + 0.5;
      const sx = Math.max(0, Math.min(state.artworkWidth - 1, Math.floor(u * state.artworkWidth)));
      const sy = Math.max(
        0,
        Math.min(state.artworkHeight - 1, Math.floor(v * state.artworkHeight)),
      );
      const sourceOffset = (sy * state.artworkWidth + sx) * 4;
      let value =
        1 -
        (source[sourceOffset] * 0.2126 +
          source[sourceOffset + 1] * 0.7152 +
          source[sourceOffset + 2] * 0.0722) /
          255;
      if (state.artworkMotion && Math.abs(y - ((time * 0.18) % 1)) < 0.012) value = 1 - value * 0.4;
      const on = value >= (BAYER[(py & 3) * 4 + (px & 3)] + 0.5) / 16;
      const [red, green, blue] = on ? state.fg : state.bg;
      const offset = (py * width + px) * 4;
      pixels[offset] = red;
      pixels[offset + 1] = green;
      pixels[offset + 2] = blue;
      pixels[offset + 3] = 255;
    }
  }
  state.bufferContext.putImageData(image, 0, 0);
  state.context.clearRect(0, 0, state.canvas.width, state.canvas.height);
  state.context.drawImage(state.buffer, 0, 0, state.canvas.width, state.canvas.height);
}

function schedule(): void {
  if (!raf && !suspended && !document.hidden && states.size) raf = requestAnimationFrame(render);
}

function render(now: number): void {
  raf = 0;
  if (suspended || document.hidden) return;
  if (last && now - last < INTERVAL) {
    schedule();
    return;
  }
  if (last && !reduced) elapsed += now - last;
  last = now;
  const measure = checkVisibility || frame++ % 6 === 0;
  checkVisibility = false;
  let keepAnimating = false;
  for (const state of states.values()) {
    if (!state.canvas.isConnected) {
      unmount(state);
      continue;
    }
    if (measure) {
      const bounds = state.canvas.getBoundingClientRect();
      state.visible =
        bounds.width > 0 &&
        bounds.height > 0 &&
        bounds.bottom > -200 &&
        bounds.top < window.innerHeight + 200 &&
        bounds.right > -200 &&
        bounds.left < window.innerWidth + 200;
    }
    // An image request must never reveal a generated substitute or keep RAF alive.
    if (state.source !== undefined && !state.artwork) continue;
    const animate =
      !reduced &&
      (state.kind === "cover" ? state.animated : state.kind !== "cortex" || state.count > 0);
    if (!state.visible) continue;
    keepAnimating ||= animate;
    if (!state.dirty && !animate) continue;
    if (state.kind === "cortex") drawCortex(state);
    let time = reduced || (state.kind === "cover" && !state.animated) ? 0 : elapsed / 1000;
    if (state.artwork) {
      if (animate) {
        state.artworkTime = time;
        state.artworkMotion = true;
      } else time = state.artworkTime;
      try {
        if (gpu?.ready) drawGraphics(state, time);
        else drawArtworkCpu(state);
      } catch {
        if (gpu) gpu.ready = false;
        drawArtworkCpu(state);
      }
      if (state.canvas.dataset.imageReady !== "true") state.canvas.dataset.imageReady = "true";
    } else if (gpu?.ready) drawGraphics(state, time);
    else drawCpu(state, time);
    state.dirty = false;
  }
  if (keepAnimating) schedule();
  else last = 0;
}

function unmount(state: CanvasState): void {
  state.observer.disconnect();
  if (state.texture && gpu) gpu.gl.deleteTexture(state.texture);
  states.delete(state.canvas);
}

function mount(canvas: HTMLCanvasElement): void {
  if (canvas.dataset.zc === "heat") {
    if (!heatmaps.has(canvas)) {
      const heatmap = mountHeat(canvas);
      if (heatmap) heatmaps.set(canvas, heatmap);
    }
    return;
  }
  if (!(canvas.dataset.zc && canvas.dataset.zc in modes)) return;
  if (!graphicsAttempted) {
    graphicsAttempted = true;
    gpu = createGraphics();
  }
  const context = canvas.getContext("2d");
  const buffer = document.createElement("canvas");
  const bufferContext = buffer.getContext("2d", { willReadFrequently: !gpu?.ready });
  if (!context || !bufferContext) return;
  let state: CanvasState;
  const observer = new ResizeObserver(() => {
    resize(state);
    refreshColors(state);
  });
  const kind = canvas.dataset.zc as Kind;
  const seed = numeric(canvas.dataset.seed, 1);
  state = {
    canvas,
    context,
    buffer,
    bufferContext,
    observer,
    kind,
    seed,
    sessionData: "",
    parameters: parameters(kind, seed),
    branches: [],
    count: 0,
    started: elapsed,
    dirty: true,
    visible: true,
    animated: false,
    drift: false,
    highlight: -1,
    origin: 0.62,
    scale: 1,
    fade: 0,
    fadeBottom: 0,
    leftGradient: null,
    bottomGradient: null,
    fg: [0, 0, 0],
    bg: [0, 0, 0],
    clear: false,
    palette: new Float32Array(18),
    image: null,
    source: undefined,
    artwork: null,
    artworkPixels: null,
    artworkWidth: 0,
    artworkHeight: 0,
    artworkTime: 0,
    artworkMotion: false,
    texture: null,
    textureGeneration: 0,
  };
  states.set(canvas, state);
  configure(state);
  observer.observe(canvas);
}

function pause(): void {
  suspended = true;
  cancelAnimationFrame(raf);
  raf = 0;
  last = 0;
  mutationObserver.disconnect();
  for (const state of states.values()) state.observer.disconnect();
  for (const heatmap of heatmaps.values()) heatmap.pause();
}

function resume(): void {
  suspended = false;
  mutationObserver.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: attributes,
  });
  scan();
  for (const state of states.values()) {
    state.observer.observe(state.canvas);
    resize(state);
  }
  for (const heatmap of heatmaps.values()) heatmap.resume();
  refresh();
}

function initialize(): void {
  if (initialized) return;
  initialized = true;
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  const canonical = Boolean(document.querySelector("[data-og-frame]"));
  const personal = document.documentElement.hasAttribute("data-device-preferences") && !canonical;
  const motion = personal ? getPreferences().motion : "System";
  reduced = canonical || motion === "Still" || (motion === "System" && preference.matches);
  pulse = document.createElement("canvas");
  pulse.width = 20;
  pulse.height = 20;
  const context = pulse.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(10, 10, 0, 10, 10, 10);
    gradient.addColorStop(0, "#fff");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 20, 20);
  }
  const preferencesChanged = () => {
    const nextMotion = personal ? getPreferences().motion : "System";
    const nextReduced =
      canonical || nextMotion === "Still" || (nextMotion === "System" && preference.matches);
    if (nextReduced !== reduced) {
      reduced = nextReduced;
      // A static cortex is complete; turning animation back on must not regrow it.
      for (const state of states.values()) state.started = elapsed - 2800;
      last = 0;
    }
    // Palette and layout preferences also need a fresh static frame.
    refresh();
  };
  if (personal) subscribePreferences(preferencesChanged);
  else preference.addEventListener("change", preferencesChanged);
  mutationObserver = new MutationObserver((records) => {
    let layoutChanged = false;
    for (const record of records) {
      if (record.type === "attributes" && record.target instanceof HTMLCanvasElement) {
        layoutChanged = true;
        const heatmap = heatmaps.get(record.target);
        if (heatmap) {
          if (record.target.dataset.zc === "heat") {
            heatmap.refresh();
            continue;
          }
          heatmap.dispose();
          heatmaps.delete(record.target);
        }
        const state = states.get(record.target);
        if (state && record.target.dataset.zc && record.target.dataset.zc in modes)
          configure(state);
        else if (state) {
          unmount(state);
          scan(record.target);
        } else scan(record.target);
      } else {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          layoutChanged = true;
          scan(node);
        }
        for (const node of record.removedNodes) {
          if (node instanceof Element) layoutChanged = true;
        }
      }
    }
    if (!layoutChanged) return;
    for (const state of states.values()) if (!state.canvas.isConnected) unmount(state);
    for (const [canvas, heatmap] of heatmaps) {
      if (!canvas.isConnected) {
        heatmap.dispose();
        heatmaps.delete(canvas);
      }
    }
    checkVisibility = true;
    schedule();
  });
  mutationObserver.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: attributes,
  });
  window.addEventListener(
    "scroll",
    () => {
      if (!raf) {
        checkVisibility = true;
        schedule();
      }
    },
    { passive: true, capture: true },
  );
  window.addEventListener("resize", () => {
    for (const state of states.values()) resize(state);
    for (const heatmap of heatmaps.values()) heatmap.refresh();
    checkVisibility = true;
    schedule();
  });
  document.addEventListener("visibilitychange", () => {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    if (!document.hidden) {
      checkVisibility = true;
      schedule();
    }
  });
  window.addEventListener("pagehide", pause);
  window.addEventListener("pageswap", pause);
  window.addEventListener("pageshow", resume);
  window.addEventListener("pagereveal", resume);
  document.addEventListener("astro:page-load", () => scan());
}

/** Mount newly inserted decorative canvases, including root itself. Safe to call repeatedly. */
export function scan(root?: ParentNode): void {
  if (typeof document === "undefined") return;
  initialize();
  const scope = root || document;
  if (scope instanceof HTMLCanvasElement && !states.has(scope) && !heatmaps.has(scope))
    mount(scope);
  for (const canvas of scope.querySelectorAll<HTMLCanvasElement>("canvas[data-zc]"))
    if (!states.has(canvas) && !heatmaps.has(canvas)) mount(canvas);
  checkVisibility = true;
  schedule();
}

/** Re-read canvas attributes/CSS colors after CMS or token updates and draw a fresh frame. */
export function refresh(root?: ParentNode): void {
  if (typeof document === "undefined") return;
  scan(root);
  for (const state of states.values())
    if (!root || root === state.canvas || (root instanceof Node && root.contains(state.canvas)))
      configure(state);
  for (const [canvas, heatmap] of heatmaps)
    if (!root || root === canvas || (root instanceof Node && root.contains(canvas)))
      heatmap.refresh();
  schedule();
}
