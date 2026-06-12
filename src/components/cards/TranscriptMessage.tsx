"use client";

import { Message } from "@/types";
import { cn } from "@/lib/utils";
import { User, Bot } from "lucide-react";

interface TranscriptMessageProps {
  message: Message;
}

export function TranscriptMessage({ message }: TranscriptMessageProps) {
  const isUser = message.sender === "user";
  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex items-center justify-center w-7 h-7 rounded-full shrink-0 mt-0.5",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}
      >
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>
      <div className={cn("max-w-[80%] space-y-1", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted text-foreground rounded-bl-md"
          )}
        >
          {message.text}
        </div>
        <span className="text-[10px] text-muted-foreground px-1">{message.timestamp}</span>
      </div>
    </div>
  );
}
