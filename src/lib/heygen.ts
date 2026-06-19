// LiveAvatar API — https://api.liveavatar.com
const LIVEAVATAR_API_KEY = process.env.LIVEAVATAR_API_KEY!;
const LIVEAVATAR_BASE = "https://api.liveavatar.com";

function headers() {
  return {
    "Content-Type": "application/json",
    "X-API-KEY": LIVEAVATAR_API_KEY,
  };
}

async function handleResponse(res: Response, label: string) {
  const text = await res.text();
  if (!res.ok) {
    // Strip HTML error pages to a clean message
    const clean = text.startsWith("<!") ? `HTTP ${res.status} — LiveAvatar returned an HTML error page (check API key / avatar ID / account limits)` : text;
    throw new Error(`LiveAvatar ${label} failed (${res.status}): ${clean}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`LiveAvatar ${label}: unexpected non-JSON response — ${text.slice(0, 200)}`);
  }
}

export interface LiveAvatarContextOptions {
  name: string;
  prompt: string;
  opening_text: string;
}

export async function createLiveAvatarContext(
  opts: LiveAvatarContextOptions
): Promise<string> {
  const res = await fetch(`${LIVEAVATAR_BASE}/v1/contexts`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(opts),
  });
  const json = await handleResponse(res, "create context");
  return json.data.id as string;
}

export async function deleteLiveAvatarContext(
  context_id: string
): Promise<void> {
  try {
    await fetch(`${LIVEAVATAR_BASE}/v1/contexts/${context_id}`, {
      method: "DELETE",
      headers: headers(),
    });
  } catch {
    // best-effort cleanup
  }
}

export interface LiveAvatarSessionOptions {
  avatar_id: string;
  voice_id?: string;
  context_id?: string;
  language?: string;
  quality?: "low" | "medium" | "high";
  is_sandbox?: boolean;
  llm_configuration_id?: string;
  interactivity_type?: "CONVERSATIONAL" | "PUSH_TO_TALK";
  max_session_duration?: number;
  dynamic_variables?: Record<string, string>;
}

export interface LiveAvatarSessionToken {
  session_id: string;
  session_token: string;
}

export async function createSessionToken(
  options: LiveAvatarSessionOptions
): Promise<LiveAvatarSessionToken> {
  const body: Record<string, unknown> = {
    avatar_id: options.avatar_id,
    avatar_persona: {
      language: options.language ?? "en",
      ...(options.voice_id && { voice_id: options.voice_id }),
      ...(options.context_id && { context_id: options.context_id }),
    },
    mode: "CUSTOM",
    is_sandbox: options.is_sandbox ?? false,
    video_settings: {
      quality: options.quality ?? "low",
      encoding: "H264",
    },
    interactivity_type: options.interactivity_type ?? "PUSH_TO_TALK",
    ...(options.max_session_duration && {
      max_session_duration: options.max_session_duration,
    }),
    ...(options.llm_configuration_id && {
      llm_configuration_id: options.llm_configuration_id,
    }),
    ...(options.dynamic_variables && {
      dynamic_variables: options.dynamic_variables,
    }),
  };

  const res = await fetch(`${LIVEAVATAR_BASE}/v1/sessions/token`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  const json = await handleResponse(res, "create session token");
  return json.data as LiveAvatarSessionToken;
}

export interface LiveAvatarStartResponse {
  session_id: string;
  livekit_url: string;
  livekit_client_token: string;
  livekit_agent_token?: string;
  max_session_duration?: number;
  ws_url?: string;
}

export async function startSession(
  session_token: string
): Promise<LiveAvatarStartResponse> {
  // /v1/sessions/start authenticates with the session_token as Bearer JWT, not X-API-KEY
  const res = await fetch(`${LIVEAVATAR_BASE}/v1/sessions/start`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session_token}`,
    },
  });
  const json = await handleResponse(res, "start session");
  return json.data as LiveAvatarStartResponse;
}

// Note: there is no REST endpoint for avatar speech.
// Speaking is done via the ws_url WebSocket returned by startSession (PUSH_TO_TALK mode)
// or via the LiveKit data channel. This function is intentionally a no-op.
export async function speakText(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _session_id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _text: string
): Promise<void> {
  // Speech is handled client-side via ws_url / LiveKit — see useHeyGen.ts
}

export async function keepSessionAlive(session_id: string): Promise<void> {
  const res = await fetch(`${LIVEAVATAR_BASE}/v1/sessions/keep-alive`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ session_id }),
  });
  await handleResponse(res, "keepalive");
}

export async function stopSession(
  session_id: string,
  reason: "USER_CLOSED" | "USER_DISCONNECTED" | "UNKNOWN" = "USER_CLOSED"
): Promise<void> {
  const res = await fetch(`${LIVEAVATAR_BASE}/v1/sessions/stop`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ session_id, reason }),
  });
  await handleResponse(res, "stop session");
}
