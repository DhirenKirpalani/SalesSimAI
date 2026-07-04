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

// ── LiveAvatar Secrets ────────────────────────────────────────────────────────

export async function createLiveAvatarSecret(
  secret_value: string,
  secret_name = "day1 OpenAI Key"
): Promise<string> {
  const res = await fetch(`${LIVEAVATAR_BASE}/v1/secrets`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ secret_type: "OPENAI_API_KEY", secret_value, secret_name }),
  });
  const json = await handleResponse(res, "create secret");
  return json.data.id as string;
}

// ── LiveAvatar LLM Configurations ────────────────────────────────────────────

export async function createLLMConfig(opts: {
  display_name: string;
  model_name: string;
  secret_id: string;
  base_url: string;
}): Promise<string> {
  const res = await fetch(`${LIVEAVATAR_BASE}/v1/llm-configurations`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(opts),
  });
  const json = await handleResponse(res, "create LLM config");
  return json.data.id as string;
}

export async function deleteLLMConfig(config_id: string): Promise<void> {
  try {
    await fetch(`${LIVEAVATAR_BASE}/v1/llm-configurations/${config_id}`, {
      method: "DELETE",
      headers: headers(),
    });
  } catch {
    // best-effort cleanup
  }
}

// ── Session Token ─────────────────────────────────────────────────────────────

export interface LiveAvatarSessionOptions {
  avatar_id: string;
  quality?: "low" | "medium" | "high";
  is_sandbox?: boolean;
  max_session_duration?: number;
  // FULL mode fields (only set when using custom LLM)
  mode?: "LITE" | "FULL";
  llm_configuration_id?: string;
  context_id?: string;
  voice_id?: string;
  interactivity_type?: "CONVERSATIONAL" | "PUSH_TO_TALK";
}

export interface LiveAvatarSessionToken {
  session_id: string;
  session_token: string;
}

export async function createSessionToken(
  options: LiveAvatarSessionOptions
): Promise<LiveAvatarSessionToken> {
  const mode = options.mode ?? "LITE";

  const body: Record<string, unknown> =
    mode === "FULL"
      ? {
          mode: "FULL",
          avatar_id: options.avatar_id,
          is_sandbox: options.is_sandbox ?? false,
          interactivity_type: options.interactivity_type ?? "PUSH_TO_TALK",
          video_settings: { quality: options.quality ?? "low", encoding: "H264" },
          avatar_persona: {
            ...(options.voice_id && { voice_id: options.voice_id }),
            ...(options.context_id && { context_id: options.context_id }),
          },
          ...(options.llm_configuration_id && {
            llm_configuration_id: options.llm_configuration_id,
          }),
          ...(options.max_session_duration && {
            max_session_duration: options.max_session_duration,
          }),
        }
      : {
          // LITE mode: we own STT + LLM + TTS; LiveAvatar provides lip-sync video
          mode: "LITE",
          avatar_id: options.avatar_id,
          is_sandbox: options.is_sandbox ?? false,
          video_settings: { quality: options.quality ?? "low", encoding: "H264" },
          ...(options.max_session_duration && {
            max_session_duration: options.max_session_duration,
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

/**
 * Send text to the LiveAvatar avatar to speak (with lip-sync).
 * Tries multiple endpoint patterns used by HeyGen/LiveAvatar streaming sessions.
 */
export async function speakText(
  session_id: string,
  text: string
): Promise<{ ok: boolean; endpoint: string }> {
  // Try POST and PUT for each path pattern
  const attempts: Array<{ method: string; path: string; body: Record<string, unknown> }> = [
    // /v1/sessions/task returned 405 for POST — try with session in path
    { method: "POST", path: `/v1/sessions/${session_id}/task`,  body: { text, task_type: "repeat", task_mode: "sync" } },
    { method: "PUT",  path: `/v1/sessions/${session_id}/task`,  body: { text, task_type: "repeat", task_mode: "sync" } },
    // Plural: /v1/sessions/{id}/tasks
    { method: "POST", path: `/v1/sessions/${session_id}/tasks`, body: { text, task_type: "repeat" } },
    // Original body-based patterns
    { method: "POST", path: "/v1/sessions/task",    body: { session_id, text, task_type: "repeat", task_mode: "sync" } },
    { method: "PUT",  path: "/v1/sessions/task",    body: { session_id, text, task_type: "repeat" } },
    { method: "POST", path: "/v1/sessions/speak",   body: { session_id, text } },
    { method: "POST", path: "/v1/sessions/message", body: { session_id, text, type: "repeat" } },
  ];

  for (const attempt of attempts) {
    try {
      console.log(`[speakText] ${attempt.method} ${attempt.path}`);
      const res = await fetch(`${LIVEAVATAR_BASE}${attempt.path}`, {
        method: attempt.method,
        headers: headers(),
        body: JSON.stringify(attempt.body),
      });
      const rawText = await res.text();
      console.log(`[speakText] → ${res.status}: ${rawText.slice(0, 120)}`);
      if (res.ok) {
        console.log(`[speakText] ✅ success: ${attempt.method} ${attempt.path}`);
        return { ok: true, endpoint: `${attempt.method} ${attempt.path}` };
      }
    } catch (err) {
      console.warn(`[speakText] ${attempt.method} ${attempt.path} threw:`, err);
    }
  }

  console.warn("[speakText] ❌ all endpoints failed — avatar lip-sync unavailable");
  return { ok: false, endpoint: "none" };
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
