/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared, stateless Anthropic (Claude) forwarding core.
 *
 * Used by BOTH the Cloudflare Pages Function (functions/api/agent.ts) and the
 * Vite dev middleware (vite.config.ts), so local dev and the deployed proxy
 * behave identically. The ANTHROPIC_API_KEY never leaves the server.
 */

export interface AgentRequestBody {
  messages: unknown[];
  system?: string;
  tools?: unknown[];
  max_tokens?: number;
}

export interface LlmResult {
  status: number;
  body: unknown;
}

export const DEFAULT_MODEL = "claude-sonnet-4-5";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MAX_TOKENS = 1024;

/**
 * Forwards a Messages request to the Anthropic API, injecting the key
 * server-side. Returns the upstream JSON (or a structured error) plus a status.
 */
export async function callLlm(
  reqBody: AgentRequestBody,
  apiKey: string | undefined,
  model: string = DEFAULT_MODEL,
): Promise<LlmResult> {
  if (!apiKey) {
    return {
      status: 500,
      body: { error: "ANTHROPIC_API_KEY is not configured on the server." },
    };
  }
  if (!reqBody || !Array.isArray(reqBody.messages)) {
    return { status: 400, body: { error: "Request must include a 'messages' array." } };
  }

  const payload: Record<string, unknown> = {
    model,
    max_tokens: reqBody.max_tokens ?? DEFAULT_MAX_TOKENS,
    messages: reqBody.messages,
  };
  if (reqBody.system) payload.system = reqBody.system;
  if (reqBody.tools) payload.tools = reqBody.tools;

  try {
    const resp = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    return { status: resp.status, body: data };
  } catch (err) {
    return {
      status: 502,
      body: { error: "Upstream Anthropic request failed.", detail: String(err) },
    };
  }
}
