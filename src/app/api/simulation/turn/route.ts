import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processTurn, applyStateUpdates } from "@/lib/buyer-brain";
import { CustomPersona } from "@/types";
import { SimulationState } from "@/types/simulation";

export async function POST(req: NextRequest) {
  try {
    const { sessionId, message } = await req.json();

    if (!sessionId || !message?.trim()) {
      return NextResponse.json({ error: "Missing sessionId or message" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: session, error: sessionError } = await supabase
      .from("simulation_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status !== "active") {
      return NextResponse.json({ error: "Session is not active" }, { status: 400 });
    }

    const { data: scenario, error: scenarioError } = await supabase
      .from(session.scenario_table)
      .select("custom_persona, context_note, seller_description")
      .eq("id", session.scenario_id)
      .single();

    if (scenarioError || !scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    const persona = scenario.custom_persona as CustomPersona;
    if (!persona) {
      return NextResponse.json({ error: "Scenario has no persona configured" }, { status: 400 });
    }

    const { data: recentMessages } = await supabase
      .from("simulation_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(20);

    const messages = recentMessages ?? [];
    const state = session.state as SimulationState;

    const buyerResponse = await processTurn(
      persona,
      scenario.context_note ?? "",
      scenario.seller_description ?? "",
      state,
      messages,
      message.trim()
    );

    const newState = applyStateUpdates(state, buyerResponse.state_updates, messages.length + 1);

    const [userMsgResult, buyerMsgResult] = await Promise.all([
      supabase.from("simulation_messages").insert({
        session_id: sessionId,
        role: "user",
        content: message.trim(),
      }).select().single(),
      supabase.from("simulation_messages").insert({
        session_id: sessionId,
        role: "buyer",
        content: buyerResponse.message,
        emotion: buyerResponse.emotion,
        intent: buyerResponse.intent,
      }).select().single(),
    ]);

    await supabase
      .from("simulation_sessions")
      .update({ state: newState })
      .eq("id", sessionId);

    return NextResponse.json({
      buyer_response: buyerResponse,
      new_state: newState,
      user_message: userMsgResult.data,
      buyer_message: buyerMsgResult.data,
    });
  } catch (err) {
    console.error("[simulation/turn]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
