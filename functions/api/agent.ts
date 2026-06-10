/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cloudflare Pages Function: POST /api/agent
 *
 * Stateless proxy that holds GEMINI_API_KEY (Pages secret) and forwards the
 * front-end's generateContent request to Gemini. No conversation is stored.
 *
 * Deploy: set GEMINI_API_KEY (and optionally GEMINI_MODEL) as Pages env secrets.
 */

import { callGemini, type AgentRequestBody } from "../_lib/gemini";

// Minimal local typing so we don't need @cloudflare/workers-types in tsc.
interface PagesContext {
  request: Request;
  env: { GEMINI_API_KEY?: string; GEMINI_MODEL?: string };
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

  const result = await callGemini(body, ctx.env.GEMINI_API_KEY, ctx.env.GEMINI_MODEL || undefined);
  return json(result.body, result.status);
}
