"use client";

import { FormEvent, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Faq = { question: string; answer: string; category: string | null };
type Message = { role: "user" | "assistant"; text: string };

export function AssistantChat({ faqs }: { faqs: Faq[] }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: "This demo searches the configured HR FAQ. It does not use a live AI service." }]);

  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = question.trim();
    if (!value) return;
    const terms = value.toLowerCase().split(/\W+/).filter((term) => term.length > 2);
    const match = faqs.map((faq) => ({ faq, score: terms.reduce((score, term) => score + Number(`${faq.question} ${faq.category ?? ""}`.toLowerCase().includes(term)), 0) })).sort((a, b) => b.score - a.score)[0];
    const response = match?.score ? match.faq.answer : "I could not find an answer in the configured FAQ. Please contact HR for help.";
    setMessages((current) => [...current, { role: "user", text: value }, { role: "assistant", text: response }]);
    setQuestion("");
  }

  return <section className="mt-8 max-w-2xl space-y-4">
    <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm"><MessageCircle aria-hidden="true" className="size-4 shrink-0" /> Demo FAQ assistant; no AI model or external service is connected.</div>
    <div aria-live="polite" aria-label="Conversation" className="max-h-[28rem] min-h-48 space-y-3 overflow-y-auto rounded-xl border border-border bg-surface p-4">
      {messages.map((message, index) => <div key={index} className={`max-w-[90%] rounded-lg p-3 text-sm ${message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-background"}`}><span className="sr-only">{message.role === "user" ? "You: " : "Assistant: "}</span>{message.text}</div>)}
    </div>
    <form onSubmit={send} className="flex items-end gap-2"><div className="min-w-0 flex-1"><Input label="Ask an HR question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="For example, how do I apply for leave?" /></div><Button type="submit" aria-label="Send question" disabled={!question.trim()}><Send aria-hidden="true" className="size-4" /><span className="sr-only sm:not-sr-only">Send</span></Button></form>
  </section>;
}
