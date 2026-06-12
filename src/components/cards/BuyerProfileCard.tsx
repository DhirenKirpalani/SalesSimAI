"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BuyerPersona } from "@/types";
import { Building2, Briefcase, Frown, Target } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface BuyerProfileCardProps {
  persona: BuyerPersona;
}

export function BuyerProfileCard({ persona }: BuyerProfileCardProps) {
  return (
    <Card className="rounded-2xl border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">AI Buyer Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {persona.name.split(" ").map((n) => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm">{persona.name}</p>
            <p className="text-xs text-muted-foreground">{persona.jobTitle}</p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="w-4 h-4 shrink-0" />
            <span>{persona.company}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Briefcase className="w-4 h-4 shrink-0" />
            <span>{persona.industry}</span>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Personality</p>
          <p className="text-sm">{persona.personality}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
            <Frown className="w-3.5 h-3.5" /> Pain Points
          </p>
          <div className="flex flex-wrap gap-1">
            {persona.painPoints.map((p) => (
              <Badge key={p} variant="secondary" className="text-[10px] font-normal">
                {p}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
            <Target className="w-3.5 h-3.5" /> Goals
          </p>
          <div className="flex flex-wrap gap-1">
            {persona.goals.map((g) => (
              <Badge key={g} variant="outline" className="text-[10px] font-normal">
                {g}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
