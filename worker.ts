import { Container, getContainer } from "@cloudflare/containers";

interface Env {
  NEXT_APP: DurableObjectNamespace<NextApp>;
}

export class NextApp extends Container<Env> {
  defaultPort = 3000;
  sleepAfter = "5m";
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const container = getContainer(env.NEXT_APP);
    return await container.fetch(request);
  },
};
