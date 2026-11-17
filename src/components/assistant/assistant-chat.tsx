"use client";

import { FormEvent, useRef, useState } from "react";
import { LoaderCircle, MessageCircle, Send, X } from "lucide-react";

type Message = { role: "user" | "assistant"; text: string };

const suggestions = [
  "How much leave do I have?",
  "Show my last payslip",
  "How do I apply for leave?",
];

export function AssistantChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hi! I can help with HR policies and your own leave or payslip details.",
    },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);

  async function ask(value: string) {
    const trimmed = value.trim();
    if (!trimmed || isSending) return;
    setQuestion("");
    setIsSending(true);
    setMessages((current) => [...current, { role: "user", text: trimmed }]);

    try {
      const response = await fetch("/api/v1/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ question: trimmed }),
      });
      const result = await response.json();
      if (response.status === 401) {
        throw new Error("Please sign in to use the HR assistant.");
      }
      if (!response.ok || typeof result?.answer !== "string") {
        throw new Error(
          typeof result?.message === "string"
            ? result.message
            : "Unable to answer right now. Please try again or contact HR.",
        );
      }
      setMessages((current) => [...current, { role: "assistant", text: result.answer }]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: error instanceof Error
            ? error.message
            : "Unable to answer right now. Please try again or contact HR.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(question);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      {isOpen && (
        <section
          id="hr-assistant-panel"
          aria-label="HR assistant chat"
          className="mb-3 flex h-[min(34rem,calc(100dvh-7rem))] w-[min(23rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        >
          <header className="flex items-center justify-between border-b border-border bg-primary p-4 text-primary-foreground">
            <div>
              <h2 className="font-semibold">HR Assistant</h2>
              <p className="text-xs opacity-85">Private answers for your account</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close HR assistant"
              className="rounded-md p-2 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </header>

          <div
            aria-live="polite"
            aria-label="Conversation"
            className="flex-1 space-y-3 overflow-y-auto p-4"
          >
            {messages.map((message, index) => (
              <p
                key={`${index}-${message.role}`}
                className={`max-w-[90%] whitespace-pre-wrap rounded-lg p-3 text-sm ${
                  message.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-background"
                }`}
              >
                <span className="sr-only">
                  {message.role === "user" ? "You: " : "Assistant: "}
                </span>
                {message.text}
              </p>
            ))}
            {isSending && (
              <p role="status" className="flex items-center gap-2 text-sm text-muted">
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                Checking your question…
              </p>
            )}
          </div>

          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 px-4 pb-3">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={isSending}
                  onClick={() => void ask(suggestion)}
                  className="rounded-full border border-border px-3 py-1.5 text-left text-xs hover:border-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={submit} className="flex items-end gap-2 border-t border-border p-3">
            <label htmlFor="assistant-question" className="sr-only">
              Ask an HR question
            </label>
            <input
              ref={inputRef}
              id="assistant-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              maxLength={500}
              placeholder="Ask an HR question…"
              disabled={isSending}
              className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-60"
            />
            <button
              type="submit"
              aria-label="Send question"
              disabled={!question.trim() || isSending}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send aria-hidden="true" className="size-4" />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        aria-label={isOpen ? "Close HR assistant" : "Open HR assistant"}
        aria-controls="hr-assistant-panel"
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((open) => !open);
          if (!isOpen) window.setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="ml-auto flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {isOpen ? (
          <X aria-hidden="true" className="size-6" />
        ) : (
          <MessageCircle aria-hidden="true" className="size-6" />
        )}
      </button>
    </div>
  );
}
