/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cloudflare Pages Function: POST /api/agent
 *
 * Stateless proxy that holds ANTHROPIC_API_KEY (Pages secret) and forwards the
 * front-end's Messages request to Claude. No conversation is stored.
 *
 * Deploy: set ANTHROPIC_API_KEY (and optionally ANTHROPIC_MODEL) as Pages secrets.
 */

import { callLlm, type AgentRequestBody } from "../_lib/anthropic";

// Minimal local typing so we don't need @cloudflare/workers-types in tsc.
interface PagesContext {
  request: Request;
  env: { ANTHROPIC_API_KEY?: string; ANTHROPIC_MODEL?: string };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequest(ctx: PagesContext): Promise<Response> {
  if (ctx.request.method !== "POST") {
    return json({ error: "Method not allowed. Use POST." }, 405);
  }

  let body: AgentRequestBody;
  try {
    body = (await ctx.request.json()) as AgentRequestBody;
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const result = await callLlm(body, ctx.env.ANTHROPIC_API_KEY, ctx.env.ANTHROPIC_MODEL || undefined);
  return json(result.body, result.status);
}
