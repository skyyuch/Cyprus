/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aether Live Desk — conversation + function-calling loop.
 *
 * Maintains the chat, talks to the stateless /api/agent proxy, runs the
 * model's tool calls locally against the simulated world (with real mids), and
 * exposes a live snapshot for the dashboard. Degrades gracefully offline.
 */

import { useCallback, useRef, useState } from "react";
import type { LiveInstrument } from "../useLiveQuotes";
import { getSnapshot, type SimSnapshot } from "./simState";
import { SYSTEM_PROMPT } from "./systemPrompt";
import { executeTool, FUNCTION_DECLARATIONS, type QuoteProvider } from "./tools";

export interface ToolCallRecord {
  name: string;
  args: Record<string, unknown>;
  result: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  toolCalls?: ToolCallRecord[];
  error?: boolean;
}

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}
interface GeminiContent {
  role: string;
  parts: GeminiPart[];
}

const MAX_TOOL_ROUNDS = 6;
const uid = () => Math.random().toString(36).slice(2, 10);

export function useAgent(instruments: LiveInstrument[]) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const [snapshot, setSnapshot] = useState<SimSnapshot>(() => getSnapshot());
  const [focusSymbol, setFocusSymbol] = useState<string | null>(null);

  // Keep the latest instruments accessible inside the async loop without stale closures.
  const instrumentsRef = useRef(instruments);
  instrumentsRef.current = instruments;

  // Mirror of messages for building request history without stale closures.
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  // Synchronous busy latch (React state lags a render, so rapid double-submits
  // could otherwise both pass the guard and run overlapping loops on simState).
  const busyRef = useRef(false);
  // Generation token: bumping it (e.g. on reset) invalidates any in-flight run
  // so a late response can't append to a cleared conversation.
  const runGenRef = useRef(0);

  const quotes: QuoteProvider = {
    getMid: (sym: string) => {
      const ins = instrumentsRef.current.find((i) => i.sym === sym);
      return ins && ins.px ? ins.px : null;
    },
  };

  const refreshSnapshot = useCallback(() => setSnapshot(getSnapshot()), []);

  const reset = useCallback(() => {
    runGenRef.current += 1; // invalidate any in-flight send
    busyRef.current = false;
    setBusy(false);
    setMessages([]);
    setOffline(false);
    setFocusSymbol(null);
  }, []);

  const send = useCallback(
    async (userText: string) => {
      const text = userText.trim();
      if (!text || busyRef.current) return;

      const myGen = runGenRef.current;
      busyRef.current = true;
      setBusy(true);

      // Build the running Gemini contents from prior turns + this message.
      // We replay only the visible chat as plain text history (tool exchanges are
      // ephemeral and re-derivable); this keeps the request small for the booth.
      const contents: GeminiContent[] = [];
      messagesRef.current.forEach((m) => {
        if (m.role === "user") contents.push({ role: "user", parts: [{ text: m.text }] });
        else if (m.text && !m.error) contents.push({ role: "model", parts: [{ text: m.text }] });
      });
      contents.push({ role: "user", parts: [{ text }] });

      setMessages((prev) => [...prev, { id: uid(), role: "user", text }]);

      const collectedToolCalls: ToolCallRecord[] = [];

      try {
        let finalText = "";
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const resp = await fetch("/api/agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents,
              tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
              systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            }),
          });

          if (!resp.ok) {
            const errBody = await resp.json().catch(() => ({}));
            throw new Error((errBody as { error?: string }).error || `Proxy error ${resp.status}`);
          }

          const data = (await resp.json()) as {
            candidates?: { content?: GeminiContent }[];
            promptFeedback?: unknown;
          };
          const content = data.candidates?.[0]?.content;
          const parts = content?.parts || [];
          const functionCalls = parts.filter((p) => p.functionCall);
          const textParts = parts
            .filter((p) => typeof p.text === "string")
            .map((p) => p.text as string)
            .join("\n")
            .trim();

          if (functionCalls.length === 0) {
            finalText = textParts || "(no response)";
            break;
          }

          // Record the model's turn (function calls) for fidelity.
          contents.push({ role: "model", parts });

          const responseParts: GeminiPart[] = [];
          for (const p of functionCalls) {
            const name = p.functionCall!.name;
            const args = p.functionCall!.args || {};
            if (typeof args.symbol === "string") setFocusSymbol(args.symbol);
            const result = executeTool(name, args, quotes);
            if (result.mutated) refreshSnapshot();
            collectedToolCalls.push({ name, args, result: result.data });
            responseParts.push({
              functionResponse: { name, response: result.data },
            });
          }
          contents.push({ role: "user", parts: responseParts });

          if (textParts) finalText = textParts;
          if (round === MAX_TOOL_ROUNDS - 1) {
            finalText =
              finalText ||
              "Reached the tool-call limit for this demo turn — ask a more specific question and I'll run it.";
          }
        }

        refreshSnapshot();
        if (runGenRef.current !== myGen) return; // conversation was reset mid-flight
        setOffline(false);
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            text: finalText,
            toolCalls: collectedToolCalls.length ? collectedToolCalls : undefined,
          },
        ]);
      } catch (err) {
        if (runGenRef.current !== myGen) return;
        setOffline(true);
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            error: true,
            text:
              "AI desk is offline (the /api/agent proxy or network is unreachable). The live dashboard and simulated controls on the right still work — and live prices keep streaming.",
            toolCalls: collectedToolCalls.length ? collectedToolCalls : undefined,
          },
        ]);
      } finally {
        if (runGenRef.current === myGen) {
          busyRef.current = false;
          setBusy(false);
        }
      }
    },
    [quotes, refreshSnapshot],
  );

  return { messages, busy, offline, snapshot, focusSymbol, send, reset, refreshSnapshot };
}
