"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { ImageOff, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";

interface HeyGenAvatar {
  id: string;
  name: string;
  preview_image_url: string | null;
  gender: string | null;
  voice_id: string | null;
}

interface AvatarPickerProps {
  selected: string;
  onSelect: (id: string, voiceId: string | null, name: string) => void;
}

const PAGE_SIZE = 6;

export function AvatarPicker({ selected, onSelect }: AvatarPickerProps) {
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "male" | "female">("all");
  const [allAvatars, setAllAvatars] = useState<HeyGenAvatar[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const initialSyncRef = useRef(false);

  // Auto-trigger onSelect for pre-selected avatars (e.g., in edit mode)
  useEffect(() => {
    if (!loading && allAvatars.length > 0 && selected && !initialSyncRef.current) {
      const found = allAvatars.find((a) => a.id === selected);
      if (found) {
        initialSyncRef.current = true;
        onSelect(found.id, found.voice_id, found.name);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, allAvatars, selected]);

  const FEMALE_NAMES = new Set([
    "alessandra","amina","anastasia","ann","anna","annie","amy","abigail","alice","alison","amanda","amelia","andrea","angela","aria","arianna","ashley","aubrey","audrey","autumn","ava","avery",
    "bella","beverly","bonnie","brooklyn",
    "camila","caroline","carolyn","charlotte","chloe","claire","cora",
    "daisy","daniella","diana","doris","dorothy",
    "eleanor","elena","eliana","elizabeth","elenora","ella","ellen","ellie","eloise","emily","emma","erin","evelyn","evie",
    "faith","fiona","frances",
    "gabriella","genesis","gianna","gloria","grace",
    "hannah","hazel","heather","helen","holly",
    "iris","isabella","isla","ivy",
    "jacqueline","jade","jasmine","jenna","jennifer","jenny","jessica","joan","jocelyn","jordyn","josephine","joy","joyce","judith","judy","julia","juliana","julie","june",
    "kaitlyn","karen","kate","katherine","kathleen","kathryn","katya","kayla","kaylee","kendall","kennedy","kimberly","kinsley","kylie",
    "layla","lauren","leah","lillian","lily","linda","london","lucy","luna","lydia","lyla",
    "madeline","madelyn","madison","makayla","marianne","maria","marie","martha","mary","matilda","maya","megan","melanie","melissa","mia","michelle","mildred","milani","mila","molly","morgan",
    "naomi","natalie","nevaeh","nicole","nina","nora","nova",
    "olivia","paisley","pamela","patricia","penelope","piper","priscilla",
    "raelynn","rachel","reagan","rebecca","reese","riley","rika","rose","ruby","ruth",
    "samantha","sandra","sarah","savannah","scarlett","serenity","sharon","shirley","skylar","sofia","sophia","sophie","stella","stephanie","summer",
    "teresa","tiffany","trinity",
    "valentina","vanessa","victoria","violet","virginia","vivian",
    "willow","winnie","ximena","zoe","zoey"
  ]);

  const inferGender = (name: string): string | null => {
    const first = name.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "");
    if (FEMALE_NAMES.has(first)) return "female";
    if (first) return "male";
    return null;
  };

  const fetchAvatars = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/heygen-test/avatars?page=1&page_size=100`);
      const data = await res.json();
      const avatars: HeyGenAvatar[] = (data.avatars ?? []).map((a: HeyGenAvatar) => ({
        ...a,
        gender: a.gender ?? inferGender(a.name),
      }));
      setAllAvatars(avatars);
      setTotalCount(data.count ?? 0);
      setHasMore(data.hasMore ?? false);
      if (data.hint) setError(data.hint);
    } catch {
      setError("Failed to load avatars.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvatars();
  }, [fetchAvatars]);

  const handleFilterChange = (g: "all" | "male" | "female") => {
    setFilter(g);
    setPage(1);
  };

  const filtered = allAvatars.filter((a) =>
    filter === "all" ? true : (a.gender?.toLowerCase() ?? "") === filter
  );

  // Paginate the filtered results
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filteredTotalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  return (
    <div className="space-y-4">
      {/* Header row: filter + pagination info */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["all", "male", "female"] as const).map((g) => (
            <button
              key={g}
              onClick={() => handleFilterChange(g)}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-medium border transition-colors",
                filter === g
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/40"
              )}
            >
              {g === "all" ? "All" : g === "male" ? "Male" : "Female"}
            </button>
          ))}
        </div>
        {totalCount > 0 && (
          <span className="text-[11px] text-muted-foreground">
            {filtered.length} matching · Page {page}{filteredTotalPages > 1 ? ` / ${filteredTotalPages}` : ""}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">Loading avatars…</span>
        </div>
      ) : paginated.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {paginated.map((avatar) => (
            <button
              key={avatar.id}
              onClick={() => onSelect(avatar.id, avatar.voice_id, avatar.name)}
              className={cn(
                "relative rounded-xl border p-3 text-left transition-all flex flex-col gap-2",
                selected === avatar.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/40 hover:bg-muted/30"
              )}
            >
              <div className="aspect-square rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                {avatar.preview_image_url ? (
                  <img
                    src={avatar.preview_image_url}
                    alt={avatar.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <ImageOff className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-xs font-medium truncate">{avatar.name}</p>
                {avatar.gender && (
                  <p className="text-[10px] text-muted-foreground capitalize">{avatar.gender}</p>
                )}
              </div>
              {selected === avatar.id && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-6 text-center space-y-2">
          <AlertCircle className="w-6 h-6 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">
            {error || "No avatars found on this page."}
          </p>
        </div>
      )}

      {/* Pagination controls */}
      {filteredTotalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-background border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Prev
          </button>
          <span className="text-xs text-muted-foreground">Page {page} / {filteredTotalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(filteredTotalPages, p + 1))}
            disabled={page >= filteredTotalPages || loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-background border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {selected && (
        <p className="text-[11px] text-muted-foreground">
          Selected: <span className="font-mono text-foreground">{selected}</span>
        </p>
      )}
    </div>
  );
}
