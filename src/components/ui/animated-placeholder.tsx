"use client";

import { useEffect, useState } from "react";

interface AnimatedPlaceholderProps {
  options: string[];
  interval?: number;
  className?: string;
}

export function AnimatedPlaceholder({
  options,
  interval = 2500,
  className = "",
}: AnimatedPlaceholderProps) {
  const [index, setIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    const current = options[index];
    let timeout: NodeJS.Timeout;

    if (isTyping) {
      if (displayText.length < current.length) {
        timeout = setTimeout(() => {
          setDisplayText(current.slice(0, displayText.length + 1));
        }, 50);
      } else {
        timeout = setTimeout(() => setIsTyping(false), interval);
      }
    } else {
      if (displayText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1));
        }, 30);
      } else {
        setIsTyping(true);
        setIndex((prev) => (prev + 1) % options.length);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayText, isTyping, index, options, interval]);

  return (
    <span className={className} aria-hidden="true">
      {displayText}
    </span>
  );
}
