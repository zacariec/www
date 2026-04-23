import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete("__sanity_preview", { path: "/" });
  return redirect("/", 307);
};
