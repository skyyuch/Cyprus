/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AWS Lambda handler for POST /api/agent (behind CloudFront).
 *
 * Reuses the shared, stateless Anthropic forwarding core so the AWS path behaves
 * identically to the Cloudflare Pages Function and the Vite dev middleware.
 * ANTHROPIC_API_KEY is a Lambda env var and never reaches the browser.
 *
 * Invoked via a Lambda Function URL (payload format 2.0) that CloudFront reaches
 * with Origin Access Control (SigV4), so the URL is not publicly callable.
 */

import { callLlm, type AgentRequestBody } from "../../functions/_lib/anthropic";

interface FunctionUrlEvent {
  requestContext?: { http?: { method?: string } };
  headers?: Record<string, string | undefined>;
  body?: string;
  isBase64Encoded?: boolean;
}

interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

function reply(statusCode: number, payload: unknown): LambdaResponse {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  };
}

export async function handler(event: FunctionUrlEvent): Promise<LambdaResponse> {
  // Only accept requests proxied by CloudFront (which injects the shared secret).
  const expectedSecret = process.env.ORIGIN_SECRET;
  if (expectedSecret) {
    const got = event.headers?.["x-origin-secret"];
    if (got !== expectedSecret) return reply(403, { error: "Forbidden." });
  }

  const method = event?.requestContext?.http?.method;
  if (method && method !== "POST") {
    return reply(405, { error: "Method not allowed. Use POST." });
  }

  let raw = event.body ?? "{}";
  if (event.isBase64Encoded && raw) {
    raw = Buffer.from(raw, "base64").toString("utf8");
  }

  let body: AgentRequestBody;
  try {
    body = JSON.parse(raw) as AgentRequestBody;
  } catch {
    return reply(400, { error: "Invalid JSON body." });
  }

  const result = await callLlm(
    body,
    process.env.ANTHROPIC_API_KEY,
    process.env.ANTHROPIC_MODEL || undefined,
  );
  return reply(result.status, result.body);
}
