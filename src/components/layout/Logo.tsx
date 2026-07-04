"use client";

import Image from "next/image";
import { useThemeStore } from "@/stores/useThemeStore";

interface LogoProps {
  className?: string;
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function Logo({ className = "", href = "/", onClick }: LogoProps) {
  const { darkMode } = useThemeStore();
  const src = darkMode ? "/images/Logo-footer.png" : "/images/Logo.png";

  return (
    <a
      href={href}
      onClick={onClick}
      className={`inline-flex items-center no-underline hover:opacity-80 transition-opacity ${className}`}
    >
      <Image
        src={src}
        alt="SalesSim"
        width={150}
        height={40}
        className="h-10 w-auto"
        priority
      />
    </a>
  );
}
