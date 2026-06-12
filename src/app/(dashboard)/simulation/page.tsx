"use client";

import { useState } from "react";
import { BuyerProfileCard } from "@/components/cards/BuyerProfileCard";
import { TranscriptMessage } from "@/components/cards/TranscriptMessage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Mic,
  Pause,
  Square,
  Timer,
  Radio,
  MessageSquare,
  Pencil,
  Send,
  Volume2,
} from "lucide-react";
import { mockPersonas, mockTranscript } from "@/lib/data/mockData";
import { Message } from "@/types";

export default function SimulationPage() {
  const [notes, setNotes] = useState("");
  const [messages] = useState<Message[]>(mockTranscript);
  const [sessionStatus] = useState("In Progress");
  const [timer] = useState("09:45");
  const [currentStage] = useState("Objection Handling");

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] -m-4 lg:-m-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 lg:px-6 py-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-1 text-[10px] font-normal">
            <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
            Voice Connected
          </Badge>
          <Badge variant="outline" className="text-[10px] font-normal">
            {sessionStatus}
          </Badge>
          <Badge variant="outline" className="text-[10px] font-normal">
            Stage: {currentStage}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Timer className="w-4 h-4 text-muted-foreground" />
            {timer}
          </div>
          <Button size="sm" variant="ghost" className="gap-1 text-xs rounded-lg">
            <Pause className="w-3.5 h-3.5" />
            Pause
          </Button>
          <Button size="sm" variant="destructive" className="gap-1 text-xs rounded-lg">
            <Square className="w-3.5 h-3.5" />
            End Session
          </Button>
        </div>
      </div>

      {/* Three Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Buyer Profile */}
        <div className="hidden lg:block w-80 border-r bg-background overflow-y-auto p-4">
          <BuyerProfileCard persona={mockPersonas[0]} />
        </div>

        {/* Center Panel - Conversation */}
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          <ScrollArea className="flex-1 p-4 lg:p-6">
            <div className="space-y-5 max-w-2xl mx-auto">
              {messages.map((msg) => (
                <TranscriptMessage key={msg.id} message={msg} />
              ))}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t p-4 bg-card">
            <div className="flex items-center gap-3 max-w-2xl mx-auto">
              <Button size="icon" variant="outline" className="rounded-full shrink-0">
                <Mic className="w-4 h-4" />
              </Button>
              <div className="flex-1 flex items-center gap-2 rounded-xl border bg-background px-3 py-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder="Type your message..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg shrink-0">
                  <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </div>
              <Button size="icon" className="rounded-full shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Panel - Notes */}
        <div className="hidden xl:block w-80 border-l bg-background overflow-y-auto p-4">
          <Card className="rounded-2xl border bg-card shadow-sm h-full flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Pencil className="w-4 h-4" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <Textarea
                className="h-full resize-none rounded-xl text-sm"
                placeholder="Jot down objections, key points, and follow-ups..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
