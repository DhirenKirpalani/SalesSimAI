"use client";

import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { Link2, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface UrlChipInputProps {
  value: string[];
  onChange: (urls: string[]) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

const URL_REGEX =
  /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/g;

function normalizeUrl(s: string): string | null {
  const trimmed = s.trim();
  if (!trimmed) return null;
  const withProtocol = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (!url.hostname.includes(".")) return null;
    return withProtocol;
  } catch {
    return null;
  }
}

function extractUrlsFromText(text: string): string[] {
  const matches = text.match(URL_REGEX) ?? [];
  return [...new Set(matches.map((m) => m.trim()).filter(Boolean))];
}

export function UrlChipInput({
  value,
  onChange,
  placeholder = "Paste URLs and press Enter",
  label,
  disabled = false,
  className,
}: UrlChipInputProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // For manual typing — validate single input, show error if invalid
  const addSingle = useCallback(
    (raw: string) => {
      setError(null);
      const url = normalizeUrl(raw);
      if (!url) {
        setError("Please enter a valid URL (e.g., https://aspire.com)");
        return false;
      }
      if (value.includes(url)) {
        setError("This URL has already been added");
        return false;
      }
      onChange([...value, url]);
      return true;
    },
    [value, onChange]
  );

  // For pasting — extract all URLs from text, silently ignore non-URL text
  const addFromPaste = useCallback(
    (text: string) => {
      setError(null);
      const found = extractUrlsFromText(text);
      const added = found.filter((u) => !value.includes(u));
      if (added.length > 0) {
        onChange([...value, ...added]);
      }
      if (found.length === 0) {
        setError("No valid URLs found in pasted text");
      }
      return added.length > 0;
    },
    [value, onChange]
  );

  const removeUrl = useCallback(
    (url: string) => {
      onChange(value.filter((u) => u !== url));
      setError(null);
    },
    [value, onChange]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (input.trim()) {
        if (addSingle(input)) setInput("");
      }
    } else if (e.key === "Backspace" && input === "" && value.length > 0) {
      e.preventDefault();
      onChange(value.slice(0, -1));
      setError(null);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    // If pasted text looks like it contains multiple URLs or is long, extract URLs
    if (pasted.length > 30 || pasted.includes("\n") || pasted.includes(",")) {
      e.preventDefault();
      addFromPaste(pasted);
      setInput("");
    }
  };

  const handleBlur = () => {
    if (input.trim()) {
      if (addSingle(input)) setInput("");
    }
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
      )}

      <div
        ref={containerRef}
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-lg border bg-background px-3 py-2.5 min-h-[44px] transition-colors",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0",
          disabled && "opacity-50 cursor-not-allowed bg-muted",
          error && "border-red-300 focus-within:ring-red-200"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((url, index) => (
          <span
            key={`${url}-${index}`}
            className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 animate-in fade-in zoom-in-95 duration-150"
          >
            <Link2 className="w-3 h-3 shrink-0 opacity-70" />
            <span className="max-w-[200px] truncate">{url}</span>
            <button
              type="button"
              onClick={() => removeUrl(url)}
              disabled={disabled}
              className="flex items-center justify-center w-4 h-4 rounded-full hover:bg-primary/20 transition-colors shrink-0"
              aria-label={`Remove ${url}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {value.length === 0 && !input && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Plus className="w-3.5 h-3.5" />
            Add URL
          </span>
        )}

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
      </div>

      {error && (
        <p className="text-xs text-red-500 animate-in slide-in-from-top-1 duration-150">
          {error}
        </p>
      )}

      <p className="text-[11px] text-muted-foreground">
        Press Enter to add. Paste multiple URLs at once.
      </p>
    </div>
  );
}
