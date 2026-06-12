"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";

interface MetricCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function MetricCard({ title, children, className }: MetricCardProps) {
  return (
    <Card className={`rounded-2xl border bg-card shadow-sm ${className || ""}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
