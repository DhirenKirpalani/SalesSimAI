"use client";

interface LogoProps {
  className?: string;
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function Logo({ className = "", href = "/", onClick }: LogoProps) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={`font-serif text-[1.2rem] font-bold text-[var(--foreground)] no-underline hover:opacity-80 transition-opacity ${className}`}
    >
      SalesSim<span className="text-[var(--primary)]">.</span>
    </a>
  );
}
