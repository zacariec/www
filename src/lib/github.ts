import bundledSnapshot from "./github-snapshot.json";

export interface ContributionDay {
  iso: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  future?: boolean;
}
export interface PushCommit {
  sha: string;
  message: string;
}
export interface GitHubPush {
  id: string;
  repo: string;
  branch: string;
  date: string;
  commits: PushCommit[];
  compareUrl: string;
  additions?: number;
  deletions?: number;
  comparisonUnavailable?: true;
}
export interface GitHubSnapshot {
  login: string;
  fetchedAt: string;
  days: ContributionDay[];
  total: number;
  currentStreak: number;
  longestStreak: number;
  pushes: GitHubPush[];
  lastPush: GitHubPush | null;
}

/** Bundled at build time: rendering a page never calls GitHub. */
export function getGitHubSnapshot(): GitHubSnapshot | null {
  return bundledSnapshot as GitHubSnapshot | null;
}

const DAY = 86_400_000;
const MAX_REQUESTS = 64;
const SHA = /^[a-f0-9]{40}$/;
const isoDay = (time: number) => new Date(time).toISOString().slice(0, 10);
const integer = (value: number) => Number.isSafeInteger(value) && value >= 0;

/** UTC dates match GitHub's calendar, including yesterday's still-active streak. */
export function normalizeContributionDays(
  source: { date: string; contributionCount: number }[],
  now: Date,
): Pick<GitHubSnapshot, "days" | "total" | "currentStreak" | "longestStreak"> {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const start = today - (364 + now.getUTCDay()) * DAY;
  const counts = new Map<string, number>();
  for (const day of source) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !integer(day.contributionCount)) {
      throw new Error("Invalid GitHub contribution day");
    }
    if (counts.has(day.date)) throw new Error("Duplicate GitHub contribution day");
    counts.set(day.date, day.contributionCount);
  }
  const days: ContributionDay[] = [];
  let total = 0;
  let run = 0;
  let longestStreak = 0;
  let currentStreak = 0;
  for (let index = 0; index < 371; index += 1) {
    const time = start + index * DAY;
    const iso = isoDay(time);
    if (time > today) {
      days.push({ iso, count: 0, level: 0, future: true });
      continue;
    }
    const count = counts.get(iso);
    if (count === undefined) throw new Error(`Missing GitHub contribution day: ${iso}`);
    let level: ContributionDay["level"] = 4;
    if (count === 0) level = 0;
    else if (count <= 3) level = 1;
    else if (count <= 7) level = 2;
    else if (count <= 12) level = 3;
    days.push({ iso, count, level });
    total += count;
    // A zero today does not end yesterday's streak until today has finished.
    if (time === today && count === 0) currentStreak = run;
    run = count > 0 ? run + 1 : 0;
    longestStreak = Math.max(longestStreak, run);
    if (time === today && count > 0) currentStreak = run;
  }
  return { days, total, currentStreak, longestStreak };
}

interface PublicRepository {
  isPrivate: boolean;
}
interface ContributionConnection<T> {
  totalCount: number;
  nodes: T[];
  pageInfo: { hasNextPage: boolean };
}
interface ContributionCollection {
  restrictedContributionsCount: number;
  totalRepositoriesWithContributedCommits: number;
  commitContributionsByRepository: { repository: PublicRepository }[];
  issueContributions: ContributionConnection<{ issue: { repository: PublicRepository } }>;
  pullRequestContributions: ContributionConnection<{
    pullRequest: { repository: PublicRepository };
  }>;
  pullRequestReviewContributions: ContributionConnection<{
    pullRequest: { repository: PublicRepository };
  }>;
  repositoryContributions: ContributionConnection<{ repository: PublicRepository }>;
  contributionCalendar: {
    weeks: { contributionDays: { date: string; contributionCount: number }[] }[];
  };
}

const CALENDAR_QUERY = `query PublicCalendar($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      restrictedContributionsCount
      totalRepositoriesWithContributedCommits
      commitContributionsByRepository(maxRepositories: 100) { repository { isPrivate } }
      issueContributions(first: 100, excludeFirst: false, excludePopular: false) {
        totalCount pageInfo { hasNextPage } nodes { issue { repository { isPrivate } } }
      }
      pullRequestContributions(first: 100, excludeFirst: false, excludePopular: false) {
        totalCount pageInfo { hasNextPage } nodes { pullRequest { repository { isPrivate } } }
      }
      pullRequestReviewContributions(first: 100) {
        totalCount pageInfo { hasNextPage } nodes { pullRequest { repository { isPrivate } } }
      }
      repositoryContributions(first: 100, excludeFirst: false) {
        totalCount pageInfo { hasNextPage } nodes { repository { isPrivate } }
      }
      contributionCalendar { weeks { contributionDays { date contributionCount } } }
    }
  }
}`;

function assertPublicCollection(collection: ContributionCollection): void {
  // A broad local token can see private repositories without those contributions
  // being "restricted". Audit repository visibility as well as anonymous counts.
  if (collection.restrictedContributionsCount !== 0) {
    throw new Error("Refusing a contribution calendar containing restricted activity");
  }
  const commits = collection.commitContributionsByRepository;
  if (commits.length !== collection.totalRepositoriesWithContributedCommits) {
    throw new Error("GitHub commit repository visibility audit was truncated");
  }
  const assertPublic = (repo: PublicRepository) => {
    if (repo.isPrivate) throw new Error("Refusing non-public GitHub contributions");
  };
  commits.forEach(({ repository }) => assertPublic(repository));
  const check = <T>(
    connection: ContributionConnection<T>,
    repository: (node: T) => PublicRepository,
  ) => {
    if (connection.pageInfo.hasNextPage || connection.totalCount !== connection.nodes.length) {
      throw new Error("GitHub contribution visibility audit exceeded its bounded page");
    }
    connection.nodes.forEach((node) => assertPublic(repository(node)));
  };
  check(collection.issueContributions, (node) => node.issue.repository);
  check(collection.pullRequestContributions, (node) => node.pullRequest.repository);
  check(collection.pullRequestReviewContributions, (node) => node.pullRequest.repository);
  check(collection.repositoryContributions, (node) => node.repository);
}

interface PushEvent {
  id: string;
  type: string;
  public: boolean;
  created_at: string;
  repo: { name: string };
  payload: { before: string; head: string; ref: string };
}
interface Comparison {
  base_commit: { sha: string };
  merge_base_commit: { sha: string };
  status: string;
  total_commits: number;
  commits: { sha: string; commit: { message: string } }[];
  files?: { additions: number; deletions: number }[];
}

class GitHubRequestError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`GitHub snapshot request failed (${status})`);
    this.status = status;
  }
}

export async function fetchGitHubSnapshot(options: {
  login: string;
  token: string;
  now?: Date;
  fetch?: typeof fetch;
}): Promise<GitHubSnapshot> {
  const { login, token } = options;
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(login) || !token.trim()) {
    throw new Error("GitHub snapshot requires a valid login and token");
  }
  const now = options.now ?? new Date();
  const fetcher = options.fetch ?? fetch;
  let requests = 0;
  let remaining = Infinity;
  const request = async <T>(path: string, body?: object): Promise<T> => {
    requests += 1;
    if (requests > MAX_REQUESTS || remaining < 1)
      throw new Error("GitHub snapshot request budget exhausted");
    const response = await fetcher(`https://api.github.com${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "zcarr.dev-public-snapshot",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20_000),
      redirect: "error",
    });
    const quota = response.headers.get("x-ratelimit-remaining");
    if (quota !== null) remaining = Number(quota);
    if (!response.ok) throw new GitHubRequestError(response.status);
    return response.json() as Promise<T>;
  };

  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const start = today - (364 + now.getUTCDay()) * DAY;
  const midpoint = start + 185 * DAY;
  const calendar: { date: string; contributionCount: number }[] = [];
  // 53 full weeks can exceed GraphQL's one-year maximum. Two disjoint ranges
  // also keep the repository-visibility audit small and explicitly bounded.
  for (const [from, to] of [
    [start, midpoint - 1],
    [midpoint, now.getTime()],
  ]) {
    // eslint-disable-next-line no-await-in-loop -- Audit each range before spending more of the shared API quota.
    const result = await request<{
      errors?: unknown[];
      data?: { user: { contributionsCollection: ContributionCollection } | null };
    }>("/graphql", {
      query: CALENDAR_QUERY,
      variables: { login, from: new Date(from).toISOString(), to: new Date(to).toISOString() },
    });
    if (result.errors?.length || !result.data?.user)
      throw new Error("GitHub public contribution query failed");
    const collection = result.data.user.contributionsCollection;
    assertPublicCollection(collection);
    for (const week of collection.contributionCalendar.weeks) {
      for (const day of week.contributionDays) {
        if (day.date >= isoDay(from) && day.date <= isoDay(to)) calendar.push(day);
      }
    }
  }

  const events: PushEvent[] = [];
  // Public events are capped by GitHub at 300 / 90 days. Fetch the whole available
  // window: returned event IDs are not reliably ordered by created_at.
  for (let page = 1; page <= 3; page += 1) {
    // eslint-disable-next-line no-await-in-loop -- Stop pagination on the first incomplete page.
    const batch = await request<PushEvent[]>(
      `/users/${login}/events/public?per_page=100&page=${page}`,
    );
    if (!Array.isArray(batch)) throw new Error("Invalid GitHub public events response");
    for (const event of batch) {
      if (event.type !== "PushEvent") continue;
      if (!event.public) throw new Error("Refusing a non-public GitHub push");
      events.push(event);
    }
    if (batch.length < 100) break;
  }
  events.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
  const latest = [...new Map(events.map((event) => [event.id, event])).values()].slice(0, 12);
  const verifiedRepos = new Set<string>();
  const pushes: GitHubPush[] = [];
  for (const event of latest) {
    const { before, head, ref } = event.payload;
    const repo = event.repo.name;
    if (
      !/^[\w.-]+\/[\w.-]+$/.test(repo) ||
      !SHA.test(before) ||
      !SHA.test(head) ||
      !ref.startsWith("refs/") ||
      !Number.isFinite(Date.parse(event.created_at))
    ) {
      throw new Error("GitHub push has no trustworthy before/head/ref");
    }
    if (!verifiedRepos.has(repo)) {
      // eslint-disable-next-line no-await-in-loop -- Verify visibility before fetching this repository's comparisons.
      const visibility = await request<{ private: boolean }>(`/repos/${repo}`);
      if (visibility.private) throw new Error("Refusing a push from a non-public repository");
      verifiedRepos.add(repo);
    }
    const commits: PushCommit[] = [];
    const push: GitHubPush = {
      id: event.id,
      repo,
      branch: ref.startsWith("refs/heads/") ? ref.slice("refs/heads/".length) : ref,
      date: event.created_at,
      commits,
      compareUrl: `https://github.com/${repo}/compare/${before}...${head}`,
    };
    // Branch creation/deletion has no comparable endpoint. Preserve the real
    // event, but never present an unknown commit list as a zero-commit push.
    if (/^0+$/.test(before) || /^0+$/.test(head)) {
      push.comparisonUnavailable = true;
      pushes.push(push);
      continue;
    }
    const seen = new Set<string>();
    let comparison: Comparison | undefined;
    for (let page = 1; page <= 10; page += 1) {
      let result: Comparison;
      try {
        // eslint-disable-next-line no-await-in-loop -- Each page determines completion and remaining request quota.
        result = await request<Comparison>(
          `/repos/${repo}/compare/${before}...${head}?per_page=100&page=${page}`,
        );
      } catch (error) {
        // Deleted/force-pushed history may no longer be resolvable. Only these
        // known comparison failures degrade; permissions and quota stay fatal.
        if (
          !(error instanceof GitHubRequestError) ||
          (error.status !== 404 && error.status !== 409)
        ) {
          throw error;
        }
        commits.length = 0;
        push.comparisonUnavailable = true;
        break;
      }
      if (
        result.base_commit.sha !== before ||
        !integer(result.total_commits) ||
        (comparison && comparison.total_commits !== result.total_commits)
      ) {
        throw new Error("GitHub compare returned inconsistent commit boundaries");
      }
      comparison ??= result;
      for (const commit of result.commits) {
        if (
          !SHA.test(commit.sha) ||
          seen.has(commit.sha) ||
          typeof commit.commit.message !== "string"
        ) {
          throw new Error("GitHub compare returned invalid or duplicate commits");
        }
        seen.add(commit.sha);
        commits.push({
          sha: commit.sha.slice(0, 7),
          message: commit.commit.message.split(/\r?\n/, 1)[0],
        });
      }
      if (commits.length === result.total_commits) break;
      if (result.commits.length === 0 || commits.length > result.total_commits || page === 10) {
        throw new Error("GitHub compare commit list is incomplete");
      }
    }
    if (push.comparisonUnavailable) {
      pushes.push(push);
      continue;
    }
    if (!comparison || (comparison.total_commits > 0 && !seen.has(head))) {
      throw new Error("GitHub compare did not include the pushed head");
    }
    // GitHub silently caps comparison files at 300. At that boundary totals are
    // unknowable; divergent comparisons are merge-base deltas, not push deltas.
    const { files } = comparison;
    if (
      files &&
      files.length < 300 &&
      comparison.merge_base_commit.sha === before &&
      (comparison.status === "ahead" || comparison.status === "identical") &&
      files.every((file) => integer(file.additions) && integer(file.deletions))
    ) {
      push.additions = files.reduce((sum, file) => sum + file.additions, 0);
      push.deletions = files.reduce((sum, file) => sum + file.deletions, 0);
    }
    pushes.push(push);
  }
  return {
    login,
    fetchedAt: now.toISOString(),
    ...normalizeContributionDays(calendar, now),
    pushes,
    lastPush: pushes[0] ?? null,
  };
}
