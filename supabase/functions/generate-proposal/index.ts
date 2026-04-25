// Generates a Fujitec modernization sales email via Lovable AI Gateway (Gemini).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a Fujitec Sales Consultant. Generate a professional, adaptive sales email based on the provided telemetry data.

Formatting Rules:
- Subject Line: "Urgent: Modernization Proposal for Elevator [Unit_ID] at [Location]"
- Body opens with: "Dear Building Manager, our Fujitec Pulse system has identified [Unit_ID] as a high-priority candidate for modernization."
- The 'Why' (lead with rope safety): Use Main_Rope_Condition as the primary sales hook. Industry standards require rope replacement at 94%. Use language similar to: "Our sensors indicate that your main ropes have thinned to [Value]%. Industry standards require replacement at 94%. We recommend an immediate modernization to avoid a forced building shutdown." If Main_Rope_Condition is between 94% and 96%, frame it as a planning urgency; below 94% frame it as an active safety hazard. Then briefly cite Vibration_RMS exceedance over the 0.05 mm/s RMS safety limit (state the percentage exceeded), and Leveling_Accuracy_mm risks if leveling drift exists.
- The Value: Detail how modernization reduces energy waste caused by high Current_Draw and improves passenger safety, including avoidance of unscheduled shutdowns from rope failure.
- Tone: Emphasize safety, reliability, and long-term cost savings. Avoid generic filler.

Output format (plain text, no markdown fences):
Subject: <subject line>

<email body>

Sincerely,
Fujitec Pulse Sales Team`;

interface UnitPayload {
  Unit_ID: string;
  Site: string;
  City: string;
  Install_Year: number;
  age: number;
  Motor_Temp_C: number;
  Vibration_RMS: number;
  Current_Draw_A: number;
  Leveling_Accuracy_mm: number;
  Bearing_Health_Index: number;
  Door_Cycles_Hour: number;
  score: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { unit } = (await req.json()) as { unit: UnitPayload };
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
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const userMessage = `Generate the modernization proposal email for this elevator.

Telemetry snapshot:
- Unit_ID: ${unit.Unit_ID}
- Location: ${unit.Site}, ${unit.City}
- Install_Year: ${unit.Install_Year} (age ${unit.age} years)
- Vibration_RMS: ${unit.Vibration_RMS} mm/s (safety limit 0.05)
- Leveling_Accuracy_mm: ${unit.Leveling_Accuracy_mm} mm
- Current_Draw_A: ${unit.Current_Draw_A} A
- Motor_Temp_C: ${unit.Motor_Temp_C} °C
- Bearing_Health_Index: ${unit.Bearing_Health_Index} (0–1 scale)
- Door_Cycles_Hour: ${unit.Door_Cycles_Hour}
- Modernization Score: ${unit.score} (0–1 scale)`;

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
        }),
      },
    );

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limits exceeded, please try again in a moment.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({
            error:
              "AI credits exhausted. Top up at Settings → Workspace → Usage.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
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
    const content: string =
      data?.choices?.[0]?.message?.content?.toString() ?? "";

    return new Response(JSON.stringify({ proposal: content.trim() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-proposal error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
