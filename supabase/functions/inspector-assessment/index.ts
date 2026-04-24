// Generates a 3-bullet engineering assessment for a single unit via Lovable AI.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a senior elevator field engineer reviewing the last 24 hours of sensor telemetry for a single Fujitec elevator. Your job is to write a tight, executive-grade engineering assessment.

Output strictly as JSON matching this schema:
{
  "bullets": [string, string, string],
  "verdict": "Healthy" | "Monitor" | "Service Soon" | "Immediate Service",
  "verdictReason": string
}

Rules:
- Exactly 3 bullets, each one sentence, technically specific (cite numbers from the data).
- Highlight if the motor runs hot during peak hours, or if leveling is drifting away from its mean.
- The "verdict" must reflect the worst observed signal.
- "verdictReason" is one short sentence explaining the verdict.
- No markdown, no prose outside JSON, no code fences.`;

interface Sample {
  t: number;
  Motor_Temp_C: number;
  Current_Draw_A: number;
  Vibration_RMS: number;
  Leveling_Accuracy_mm: number;
  Bearing_Health_Index: number;
}

interface UnitMeta {
  Unit_ID: string;
  Site: string;
  City: string;
  Install_Year: number;
  age: number;
  score: number;
  status: string;
}

function summarize(samples: Sample[]) {
  if (!samples.length) return null;
  const keys: (keyof Sample)[] = [
    "Motor_Temp_C",
    "Current_Draw_A",
    "Vibration_RMS",
    "Leveling_Accuracy_mm",
    "Bearing_Health_Index",
  ];
  const out: Record<string, { min: number; max: number; mean: number; last: number }> = {};
  for (const k of keys) {
    const vals = samples.map((s) => s[k] as number).filter((v) => Number.isFinite(v));
    if (!vals.length) continue;
    const sum = vals.reduce((a, b) => a + b, 0);
    out[k as string] = {
      min: +Math.min(...vals).toFixed(3),
      max: +Math.max(...vals).toFixed(3),
      mean: +(sum / vals.length).toFixed(3),
      last: +(vals[vals.length - 1]).toFixed(3),
    };
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { unit, samples } = (await req.json()) as {
      unit: UnitMeta;
      samples: Sample[];
    };
    if (!unit?.Unit_ID) {
      return new Response(JSON.stringify({ error: "Missing unit payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Trim to last 24h of samples for the prompt.
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const recent = (samples ?? []).filter((s) => s.t >= cutoff);
    const window = recent.length ? recent : (samples ?? []).slice(-24);
    const stats = summarize(window);

    const userMessage = `Unit ${unit.Unit_ID} at ${unit.Site}, ${unit.City} — installed ${unit.Install_Year} (age ${unit.age}y). Modernization score ${unit.score} (${unit.status}).

Telemetry summary across the last ${window.length} samples (≈24h):
${JSON.stringify(stats, null, 2)}

Reference thresholds:
- Motor_Temp_C alert: 75
- Current_Draw_A alert: 22
- Vibration_RMS concern: > 0.15
- Leveling_Accuracy_mm safety: > 10mm`;

    const aiRes = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
          response_format: { type: "json_object" },
        }),
      },
    );

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Top up at Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const content: string = data?.choices?.[0]?.message?.content?.toString() ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { bullets: [content.slice(0, 280)], verdict: "Monitor", verdictReason: "Model returned unstructured output." };
    }

    return new Response(JSON.stringify({ assessment: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("inspector-assessment error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
