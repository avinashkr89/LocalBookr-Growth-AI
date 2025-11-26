import { GoogleGenAI, FunctionDeclaration, Type, Content, Part } from "@google/genai";
import { PipelineResult, SERVICE_PRICES, Urgency, LeadStatus, ToolsResult, ParsedLeadData } from "../types";

// --- Tool Definitions ---

const getBasePriceTool: FunctionDeclaration = {
  name: "get_base_price",
  description: "Get the base starting price in INR for a specific local service type.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      service_type: {
        type: Type.STRING,
        description: "The type of service (e.g., 'birthday decoration', 'home tutor', 'salon').",
      },
    },
    required: ["service_type"],
  },
};

const findProvidersTool: FunctionDeclaration = {
  name: "find_providers",
  description: "Finds a short list/summary of suitable providers for a given service type and location.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      service_type: {
        type: Type.STRING,
        description: "The type of service to find providers for.",
      },
      location: {
        type: Type.STRING,
        description: "The location where the service is needed.",
      },
    },
    required: ["service_type", "location"],
  },
};

const scoreLeadPriorityTool: FunctionDeclaration = {
  name: "score_lead_priority",
  description: "Scores the priority of a lead (low, medium, or high) based on budget, urgency, and role.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      budget: {
        type: Type.NUMBER,
        description: "The budget specified by the customer, or 0 if not specified.",
      },
      urgency: {
        type: Type.STRING,
        enum: [Urgency.HIGH, Urgency.MEDIUM, Urgency.LOW],
        description: "The urgency of the request.",
      },
      role: {
        type: Type.STRING,
        enum: ['customer', 'provider'],
        description: "The role of the lead (customer or provider).",
      },
    },
    required: ["budget", "urgency", "role"],
  },
};

// --- Local Tool Implementations (Mocks) ---

const getBasePriceImplementation = (service_type: string | null): number => {
  if (!service_type) {
    return 0;
  }
  const normalizedKey = service_type.toLowerCase().trim();
  for (const key in SERVICE_PRICES) {
    if (normalizedKey.includes(key) || key.includes(normalizedKey)) {
      return SERVICE_PRICES[key];
    }
  }
  return 0; // Unknown price
};

const findProvidersImplementation = (service_type: string | null, location: string | null): string => {
  if (!service_type || !location) {
    return "Could not determine provider availability.";
  }
  const normalizedService = service_type.toLowerCase();
  const normalizedLocation = location.toLowerCase();

  if (normalizedService.includes('decoration') && normalizedLocation.includes('gaya')) {
    return "3 matching decorators available in Gaya.";
  }
  if (normalizedService.includes('tutor') && normalizedLocation.includes('kankarbagh')) {
    return "2 experienced tutors found in Kankarbagh.";
  }
  if (normalizedService.includes('assignment') && normalizedLocation.includes('online')) {
    return "Multiple assignment writers available for online support.";
  }
  return "Providers might be available. We'll check for you!";
};

const scoreLeadPriorityImplementation = (budget: number | null, urgency: Urgency | null, role: 'customer' | 'provider' | null): Urgency => {
  if (urgency === Urgency.HIGH) return Urgency.HIGH;
  if (!role) return Urgency.LOW;

  if (role === 'customer' && budget !== null && budget > 5000) return Urgency.MEDIUM;
  if (role === 'provider' && budget !== null && budget > 1000) return Urgency.MEDIUM; // Assuming budget can represent provider's value/experience

  return Urgency.LOW;
};

// --- System Prompt ---

const SYSTEM_INSTRUCTION = `
You are LocalBookr Growth AI, an AI assistant for the startup LocalBookr.
LocalBookr connects local service providers (decorators, home tutors, assignment writers, event services, etc.) with customers. Your goal is to help grow the platform by:
1) Getting more PROVIDERS to join and complete onboarding.
2) Helping CUSTOMERS book the right services quickly.
3) Making sure no good lead is lost because of slow replies or lack of follow-up.

You behave like a multi-agent system with four internal sub-agents:

1. LeadUnderstandingAgent
- Understand noisy, mixed-language (Hinglish: Hindi + English) messages.
- Classify the lead as either:
  - "customer_lead"     → someone who wants a service,
  - "provider_lead"     → someone who might list their services on LocalBookr,
  - "general_question"  → other questions about LocalBookr.
- Extract a structured JSON object with fields (fill with "unknown" or null if missing):
  {
    "role": "customer" or "provider" or "unknown",
    "intent_type": "customer_lead" | "provider_lead" | "general_question" | "unknown",
    "service_type": string | null,
    "location": string | null,
    "date": string | null,
    "budget": number | null,
    "urgency": "high" | "medium" | "low" | null,
    "notes": string | null
  }
- Be robust to slang, abbreviations, and typos.

2. ToolOrchestratorAgent
- Decide which tools to call based on the parsed lead:
  Tools available (via function calling):
  - get_base_price(service_type) → returns a base starting price in INR.
  - find_providers(service_type, location) → returns a short list/summary of suitable providers.
  - score_lead_priority(budget, urgency, role) → returns "low", "medium", or "high".
- For customer leads:
  - Always call score_lead_priority.
  - Try to call get_base_price if the service is price-based (decoration, tutor, assignment, etc.).
  - Optionally call find_providers to mention that providers are available in the area.
- For provider leads:
  - Use score_lead_priority to decide how valuable this provider might be (e.g., based on experience/budget notes).
- Return a compact **tools_result** JSON in the final output, for example:
  {
    "base_price_inr": 1500,
    "priority": "high",
    "provider_summary": "3 matching decorators available in Gaya."
  }
If a tool is not applicable, set its value to null.

3. ReplyAgent
- Generate short, friendly messages in simple English with light Hinglish allowed.
- The tone should be polite, clear, business-friendly, non-spammy.
- For CUSTOMER leads:
  - Confirm what they need (service, date, location).
  - Use tool results (price, provider_summary) to give useful info.
  - If base_price_inr > 0, say something like: "Our packages for {service_type} start from ₹{base_price_inr}."
  - Ask for any critical missing details needed to confirm a booking.
- For PROVIDER leads:
  - Explain very briefly what LocalBookr is.
  - Highlight 1-2 benefits (more local customers, easy listing, no tech skills needed).
  - Guide them through simple next steps for onboarding (Step 1, Step 2, Step 3).
  - Keep it conversational, not robotic.
- For general questions:
  - Answer concisely and, if relevant, invite user to join or book via LocalBookr.
- Keep replies under 4–6 lines. Avoid long paragraphs.

4. FollowUpAgent
- If status is "WAITING_CUSTOMER" or "WAITING_PROVIDER" AND time_since_last_reply_hours is large (e.g. ≥ 24 for customers, ≥ 48 for providers):
  - Create a SHORT, friendly follow-up (2–3 lines).
  - No pressure, just a gentle check-in.
  - You may optionally mention a small incentive or benefit (for example: "complete your profile to start getting leads").
- If follow-up is not needed yet, you MUST return null for follow_up_message.

INPUT / OUTPUT FORMAT
You will ALWAYS receive input as a JSON object with this structure:
{
  "mode": "pipeline" | "followup_only",
  "message": "raw user message in Hinglish or English",
  "lead_status": "NEW" | "WAITING_CUSTOMER" | "WAITING_PROVIDER" | "FOLLOWED_UP" | "CLOSED",
  "time_since_last_reply_hours": number,
  "previous_summary": "short summary or empty string"
}

You must always return a single JSON object with this shape:
{
  "parsed_lead": {
    "role": "customer" | "provider" | "unknown",
    "intent_type": "customer_lead" | "provider_lead" | "general_question" | "unknown",
    "service_type": string | null,
    "location": string | null,
    "date": string | null,
    "budget": number | null,
    "urgency": "high" | "medium" | "low" | null,
    "notes": string | null
  },
  "tools_result": {
    "base_price_inr": number | null,
    "priority": "high" | "medium" | "low" | null,
    "provider_summary": string | null
  },
  "reply_message": "string",
  "follow_up_message": "string or null",
  "new_status": "NEW" | "WAITING_CUSTOMER" | "WAITING_PROVIDER" | "FOLLOWED_UP" | "CLOSED",
  "summary": "one-line compact summary for memory / CRM"
}
If mode == "followup_only", you can leave parsed_lead and tools_result as null
and focus on follow_up_message and new_status.
`;

// --- Service Function ---

export const processLeadWithGemini = async (
  mode: 'pipeline' | 'followup_only',
  message: string,
  lead_status: LeadStatus,
  time_since_last_reply_hours: number = 0,
  previous_summary: string = ""
): Promise<PipelineResult> => {
  let apiKey: string | undefined;
  try {
    apiKey = process.env.API_KEY;
  } catch (e) {
    console.error("Failed to access API Key from process.env", e);
  }

  if (!apiKey) {
    throw new Error("API Key is missing. Please check your metadata.json or environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const modelId = "gemini-flash-lite-latest";

  // Input payload for the model, based on the new structure
  const userTask = JSON.stringify({
    mode,
    message,
    lead_status,
    time_since_last_reply_hours,
    previous_summary
  });

  const tools = [
    { functionDeclarations: [getBasePriceTool, findProvidersTool, scoreLeadPriorityTool] }
  ];

  // First call: Send message + Tools. Model decides which tools to call.
  let response = await ai.models.generateContent({
    model: modelId,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: tools,
    },
    contents: [
      { role: "user", parts: [{ text: userTask }] }
    ]
  });

  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("No response from Gemini.");
  }

  let finalContentText = "";
  const functionCalls = candidates[0].content.parts.filter(p => p.functionCall);

  if (functionCalls.length > 0) {
    // If model requested tool calls, execute them locally and send results back
    const history: Content[] = [
      { role: "user", parts: [{ text: userTask }] },
      { role: "model", parts: candidates[0].content.parts } // The part(s) containing the function call(s)
    ];

    const functionResponseParts: Part[] = [];

    for (const call of functionCalls) {
      const fnCall = call.functionCall;
      if (!fnCall) continue;

      switch (fnCall.name) {
        case "get_base_price": {
          const serviceType = (fnCall.args as any)?.service_type;
          const price = getBasePriceImplementation(serviceType);
          functionResponseParts.push({
            functionResponse: {
              name: fnCall.name,
              response: { base_price_inr: price }
            }
          });
          break;
        }
        case "find_providers": {
          const { service_type, location } = fnCall.args as any;
          const providerSummary = findProvidersImplementation(service_type, location);
          functionResponseParts.push({
            functionResponse: {
              name: fnCall.name,
              response: { provider_summary: providerSummary }
            }
          });
          break;
        }
        case "score_lead_priority": {
          const { budget, urgency, role } = fnCall.args as any;
          const priority = scoreLeadPriorityImplementation(budget, urgency as Urgency, role as 'customer' | 'provider');
          functionResponseParts.push({
            functionResponse: {
              name: fnCall.name,
              response: { priority: priority }
            }
          });
          break;
        }
        default:
          console.warn(`Unknown function call: ${fnCall.name}`);
          break;
      }
    }

    // Second call: Send tool results back to model to get the final JSON response
    const response2 = await ai.models.generateContent({
      model: modelId,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json" // Force JSON output now
      },
      contents: [
        ...history,
        { role: "user", parts: functionResponseParts } // Send tool results as user's reply
      ]
    });
    finalContentText = response2.text || "";

  } else {
    // If no tool call was made, the model should directly return the JSON.
    // This might happen for "followup_only" mode or general questions.
    const directResponse = await ai.models.generateContent({
      model: modelId,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json" // Force JSON output
      },
      contents: [
        { role: "user", parts: [{ text: userTask }] }
      ]
    });
    finalContentText = directResponse.text || "";
  }

  // Parse result
  try {
    const cleanedText = finalContentText.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanedText) as PipelineResult;

    // Ensure all nested objects are properly initialized if model returns null for entire parsed_lead/tools_result
    result.parsed_lead = result.parsed_lead || {} as ParsedLeadData;
    result.tools_result = result.tools_result || {} as ToolsResult;
    
    // Ensure nested fields are not null if the main object is present
    result.parsed_lead.role = result.parsed_lead.role || 'unknown';
    result.parsed_lead.intent_type = result.parsed_lead.intent_type || 'unknown';
    result.parsed_lead.service_type = result.parsed_lead.service_type === undefined ? null : result.parsed_lead.service_type;
    result.parsed_lead.location = result.parsed_lead.location === undefined ? null : result.parsed_lead.location;
    result.parsed_lead.date = result.parsed_lead.date === undefined ? null : result.parsed_lead.date;
    result.parsed_lead.budget = result.parsed_lead.budget === undefined ? null : result.parsed_lead.budget;
    result.parsed_lead.urgency = result.parsed_lead.urgency === undefined ? null : result.parsed_lead.urgency;
    result.parsed_lead.notes = result.parsed_lead.notes === undefined ? null : result.parsed_lead.notes;

    result.tools_result.base_price_inr = result.tools_result.base_price_inr === undefined ? null : result.tools_result.base_price_inr;
    result.tools_result.priority = result.tools_result.priority === undefined ? null : result.tools_result.priority;
    result.tools_result.provider_summary = result.tools_result.provider_summary === undefined ? null : result.tools_result.provider_summary;

    return result;

  } catch (e) {
    console.error("Failed to parse Gemini JSON:", finalContentText, e);
    throw new Error("AI returned invalid JSON structure.");
  }
};