/**
 * ElevenLabs Chat Completions alias.
 * ElevenLabs Custom LLM (Chat Completions mode) appends /chat/completions to the base URL,
 * so this file re-exports the webhook handler so both paths work.
 */
export { POST } from "../../webhook/route";
