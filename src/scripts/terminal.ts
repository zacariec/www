import { navigateSite } from "./site";

import type { GitHubPush } from "@/lib/github";

export interface TerminalData {
  pages: { label: string; href: string }[];
  sessions: { id: string; title: string; slug: string }[];
  readme: string;
  identity: string;
  pushes: Pick<GitHubPush, "repo" | "date" | "branch" | "commits">[];
}

type LineTone = "error" | "muted" | "hint";

function initializeTerminal(terminal: HTMLElement): void {
  const inputElement = terminal.querySelector<HTMLInputElement>("[data-terminal-input]");
  const outputElement = terminal.querySelector<HTMLElement>("[data-terminal-output]");
  const scrollElement = terminal.querySelector<HTMLElement>("[data-terminal-scroll]");
  const form = terminal.querySelector<HTMLFormElement>("[data-terminal-form]");
  if (!inputElement || !outputElement || !scrollElement || !form) return;
  const input = inputElement;
  const output = outputElement;
  const scroll = scrollElement;
  const data = JSON.parse(terminal.dataset.terminalContent || "{}") as TerminalData;
  const history: string[] = [];
  let historyIndex = 0;
  let draft = "";
  let pendingNavigation: number | undefined;

  function line(text: string, tone?: LineTone): void {
    // Text nodes are deliberate: commands, CMS copy and commit messages never become markup or code.
    for (const part of text.split("\n")) {
      const node = document.createElement("div");
      node.className = `terminal-line${tone ? ` terminal-line--${tone}` : ""}`;
      node.textContent = part || "\u00a0";
      output.append(node);
      if (output.children.length > 60) output.firstElementChild?.remove();
    }
  }

  function navigate(href: string): void {
    clearTimeout(pendingNavigation);
    pendingNavigation = window.setTimeout(() => navigateSite(href), 450);
  }

  function destination(argument: string): string | undefined {
    if (["", "~", "..", "/", "home", "index"].includes(argument)) return "/";
    const path = argument.replace(/^\.?\/+|\/+$/g, "");
    const page = data.pages.find(
      (item) => item.label.toLowerCase() === path || item.href.slice(1) === path,
    );
    if (page) return page.href;
    const session = data.sessions.find(
      (item) => path === `sessions/${item.slug.toLowerCase()}` || path === item.id.toLowerCase(),
    );
    return session ? `/sessions/${session.slug}` : undefined;
  }

  function run(raw: string): void {
    const command = raw.trim();
    if (!command) return;
    const [verb = "", ...args] = command.split(/\s+/);
    const argument = args.join(" ");
    const normalized = argument.replace(/^\.?\/+|\/+$/g, "").toLowerCase();
    history.push(command);
    if (history.length > 60) history.shift();
    historyIndex = history.length;
    draft = "";
    input.value = "";
    line(`zc@paper ~/lost $ ${command}`, "muted");
    switch (verb.toLowerCase()) {
      case "help":
        [
          "ls [sessions]   list pages, or sessions",
          "cd <page>       go there (or cd S.001)",
          "cat readme      what this site is",
          "git log         latest public pushes",
          "whoami          who's writing",
          "history         commands from this visit",
          "clear           empty the terminal",
          "exit            back to /",
        ].forEach((text) => line(text, "hint"));
        break;
      case "ls":
        if (normalized === "sessions") {
          if (data.sessions.length)
            data.sessions.forEach((session) => line(`${session.id}  ${session.title}`));
          else line("No published sessions.", "muted");
        } else if (!normalized) {
          line(
            data.pages
              .map((page) => (page.href === "/" ? "index/" : `${page.href.slice(1)}/`))
              .join("  "),
            "hint",
          );
        } else line(`ls: cannot access '${argument}': No such file or directory`, "error");
        break;
      case "cd": {
        const href = destination(argument.toLowerCase());
        if (href) {
          line(`→ ${href}`, "muted");
          navigate(href);
        } else line(`cd: no such file or directory: ${argument}`, "error");
        break;
      }
      case "cat":
        if (/^readme(\.md)?$/.test(normalized)) line(data.readme);
        else line(`cat: ${argument}: No such file or directory`, "error");
        break;
      case "git":
        if (args.length === 1 && args[0]?.toLowerCase() === "log") {
          if (!data.pushes.length) line("No recent public pushes available.", "muted");
          for (const push of data.pushes) {
            line(`${push.repo} · ${push.branch} · ${push.date.slice(0, 10)}`, "hint");
            if (!push.commits.length) line("Commit details unavailable.", "muted");
            for (const commit of push.commits) line(`${commit.sha.slice(0, 7)}  ${commit.message}`);
          }
        } else line("usage: git log", "muted");
        break;
      case "whoami":
        line(data.identity);
        break;
      case "history":
        history.forEach((item, index) =>
          line(`${String(index + 1).padStart(4, " ")}  ${item}`, "muted"),
        );
        break;
      case "clear":
        output.replaceChildren();
        break;
      case "exit":
        line("logout", "muted");
        navigate("/");
        break;
      case "sudo":
        line("zc is not in the sudoers file. This incident will be reported.", "error");
        break;
      case "rm":
        line("rm: refusing. the cortex grows back.", "error");
        break;
      case "base64":
        line(
          args.includes("-d") || args.includes("--decode")
            ? "Thoughts, unfiltered."
            : "VGhvdWdodHMsIHVuZmlsdGVyZWQu",
        );
        break;
      default:
        line(`zsh: command not found: ${verb}`, "error");
    }
    scroll.scrollTop = scroll.scrollHeight;
    input.focus({ preventScroll: true });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    run(input.value);
  });
  input.addEventListener("keydown", (event) => {
    if (
      event.isComposing ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.shiftKey ||
      (event.key !== "ArrowUp" && event.key !== "ArrowDown")
    )
      return;
    event.preventDefault();
    if (historyIndex === history.length) draft = input.value;
    historyIndex = Math.max(
      0,
      Math.min(history.length, historyIndex + (event.key === "ArrowUp" ? -1 : 1)),
    );
    input.value = historyIndex === history.length ? draft : (history[historyIndex] ?? "");
    input.setSelectionRange(input.value.length, input.value.length);
  });
  terminal.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("button, a")) return;
    if (window.getSelection()?.toString()) return;
    input.focus({ preventScroll: true });
  });
  for (const chip of terminal.querySelectorAll<HTMLButtonElement>("[data-terminal-command]")) {
    chip.addEventListener("click", () => run(chip.dataset.terminalCommand || ""));
  }
  window.addEventListener("pagehide", () => clearTimeout(pendingNavigation));
}

for (const terminal of document.querySelectorAll<HTMLElement>("[data-terminal]"))
  initializeTerminal(terminal);
