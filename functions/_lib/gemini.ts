/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared, stateless Gemini forwarding core.
 *
 * Used by BOTH the Cloudflare Pages Function (functions/api/agent.ts) and the
 * Vite dev middleware (vite.config.ts), so the local dev experience and the
 * deployed proxy behave identically. The GEMINI_API_KEY never leaves the server.
 */

export interface AgentRequestBody {
  contents: unknown[];
  tools?: unknown[];
  systemInstruction?: unknown;
}

export interface GeminiResult {
  status: number;
  body: unknown;
}

export const DEFAULT_MODEL = "gemini-2.5-flash";

/**
 * Forwards a generateContent request to the Gemini REST API, injecting the key
 * server-side. Returns the upstream JSON (or a structured error) plus a status.
 */
export async function callGemini(
  reqBody: AgentRequestBody,
  apiKey: string | undefined,
  model: string = DEFAULT_MODEL,
): Promise<GeminiResult> {
  if (!apiKey) {
    return {
      status: 500,
      body: { error: "GEMINI_API_KEY is not configured on the server." },
    };
  }
  if (!reqBody || !Array.isArray(reqBody.contents)) {
    return { status: 400, body: { error: "Request must include a 'contents' array." } };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const payload: Record<string, unknown> = { contents: reqBody.contents };
  if (reqBody.tools) payload.tools = reqBody.tools;
  if (reqBody.systemInstruction) payload.systemInstruction = reqBody.systemInstruction;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    return { status: resp.status, body: data };
  } catch (err) {
    return {
      status: 502,
      body: { error: "Upstream Gemini request failed.", detail: String(err) },
    };
  }
}
