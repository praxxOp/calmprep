"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowUpIcon, SparklesIcon, SquareIcon } from "lucide-react";
import Lottie from "lottie-react";
import { toast } from "sonner";

import {
  Input,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea
} from "@/components/ui/custom/prompt/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Suggestion } from "@/components/ui/custom/prompt/suggestion";
import { ChatContainer } from "@/components/ui/custom/prompt/chat-container";
import { Message, MessageContent } from "@/components/ui/custom/prompt/message";
import { Markdown } from "@/components/ui/custom/prompt/markdown";
import { PromptScrollButton } from "@/components/ui/custom/prompt/scroll-button";
import { COMPANION_DISCLAIMER } from "@/lib/gemini/safety";
import type { ChatTurn } from "@/lib/wellness/types";

import aiSphereAnimation from "../ai-sphere-animation.json";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  crisis?: boolean;
}

const STARTERS = [
  "I'm anxious about my upcoming mock test",
  "I can't focus on studying today",
  "Help me wind down before sleep",
  "I keep comparing myself to my friends"
];

/** Skeleton "thinking" bubble shown while waiting for the first token. */
function ThinkingBubble() {
  return (
    <div className="bg-muted text-foreground w-64 max-w-full rounded-lg border p-4" aria-label="Saathi is typing">
      <div className="space-y-2">
        <Skeleton className="h-3 w-[80%]" />
        <Skeleton className="h-3 w-[95%]" />
        <Skeleton className="h-3 w-[60%]" />
      </div>
    </div>
  );
}

export function CompanionChat() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const sessionIdRef = useRef<string | undefined>(undefined);
  const idRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const hasStarted = messages.length > 0;
  const nextId = () => `m${++idRef.current}`;

  async function send(text: string) {
    const message = text.trim();
    if (!message || isStreaming) return;

    // History = turns before this one (the API appends the new user message itself).
    const history: ChatTurn[] = messages.map((m) => ({ role: m.role, content: m.content }));

    const userMsg: ChatMessage = { id: nextId(), role: "user", content: message };
    const assistantId = nextId();
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: "assistant", content: "" }]);
    setPrompt("");
    setIsStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionIdRef.current, message, history })
      });

      if (res.status === 401) {
        toast.error("Please sign in again.");
        setIsStreaming(false);
        return;
      }
      if (!res.ok || !res.body) throw new Error(`Chat failed (${res.status})`);

      sessionIdRef.current = res.headers.get("x-session-id") ?? sessionIdRef.current;
      if (res.headers.get("x-crisis") === "1") {
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, crisis: true } : m)));
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m)));
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId && !m.content
            ? { ...m, content: "Sorry, I had trouble responding. Could you try again?" }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
      {/* Messages (scrolls) OR centered welcome — both fill the space above the input. */}
      {hasStarted ? (
        <ChatContainer
          className="relative min-h-0 flex-1 space-y-4 overflow-y-auto pe-2 pb-4"
          ref={containerRef}
          scrollToRef={bottomRef}>
          {messages.map((message, index) => {
            const isAssistant = message.role === "assistant";
            const isLast = index === messages.length - 1;

            return (
              <Message
                key={message.id}
                className={message.role === "user" ? "justify-end" : "justify-start"}>
                <div className={cn("max-w-[85%] sm:max-w-[75%]", { "text-end": !isAssistant })}>
                  {isAssistant ? (
                    message.content ? (
                      <div
                        className={cn(
                          "bg-muted text-foreground prose dark:prose-invert rounded-lg border p-4",
                          message.crisis && "border-destructive/50 bg-destructive/5"
                        )}>
                        <Markdown className="space-y-4">{message.content}</Markdown>
                      </div>
                    ) : (
                      isLast && isStreaming && <ThinkingBubble />
                    )
                  ) : (
                    <MessageContent className="bg-primary text-primary-foreground inline-flex text-start">
                      {message.content}
                    </MessageContent>
                  )}
                </div>
              </Message>
            );
          })}
        </ChatContainer>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="w-56 mask-radial-[50%_50%] mask-radial-from-30%">
            <Lottie className="w-full" animationData={aiSphereAnimation} loop autoplay />
          </div>
          <h1 className="text-center text-2xl leading-normal font-medium lg:text-3xl">
            Hi, I&apos;m Saathi 👋 <br /> How are you feeling about your{" "}
            <span className="bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">
              prep today?
            </span>
          </h1>
        </div>
      )}

      <div className="fixed right-6 bottom-28 z-10">
        <PromptScrollButton containerRef={containerRef} scrollRef={bottomRef} className="shadow-sm" />
      </div>

      {/* Input — pinned at the bottom for the whole session (no jump). */}
      <div className="shrink-0 pt-2">
        <Input
          value={prompt}
          onValueChange={setPrompt}
          onSubmit={() => send(prompt)}
          isLoading={isStreaming}
          className="bg-primary/5 w-full">
          <label htmlFor="companion-input" className="sr-only">
            Message Saathi
          </label>
          <PromptInputTextarea
            id="companion-input"
            placeholder="Tell me what's on your mind…"
            className="min-h-auto p-4"
          />

          <PromptInputActions className="flex items-center justify-between gap-2 p-3">
            <Badge variant="secondary" className="gap-1">
              <SparklesIcon className="size-3" />
              Gemini 2.5 Flash Lite
            </Badge>

            <PromptInputAction tooltip={isStreaming ? "Generating…" : "Send"}>
              <Button
                size="icon"
                className="size-8 rounded-full"
                onClick={() => send(prompt)}
                disabled={!prompt.trim() || isStreaming}
                aria-label="Send message">
                {isStreaming ? <SquareIcon /> : <ArrowUpIcon />}
              </Button>
            </PromptInputAction>
          </PromptInputActions>
        </Input>

        <p className="text-muted-foreground mt-2 px-1 text-center text-xs">{COMPANION_DISCLAIMER}</p>

        {/* Starter suggestions only before the conversation begins. */}
        {!hasStarted && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {STARTERS.map((s) => (
              <Suggestion key={s} size="sm" onClick={() => send(s)}>
                {s}
              </Suggestion>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
