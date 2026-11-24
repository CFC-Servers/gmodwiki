import type { APIContext } from "astro";

export function runsOnCloudflare(locals: APIContext["locals"]): boolean {
  return "runtime" in locals;
}
