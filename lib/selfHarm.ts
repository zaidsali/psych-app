import type { SelfHarmChecklist } from "@/lib/types";

const patterns: Record<keyof SelfHarmChecklist, RegExp[]> = {
  ideation: [
    /\b(si|suicidal ideation|suicidal thoughts|thoughts of suicide)\b/i,
    /\b(wants? to die|wish(?:es)? (?:to be )?dead|kill(?:ing)? (?:myself|himself|herself|themselves))\b/i,
    /\bself[-\s]?harm\b/i
  ],
  plan: [
    /\b(plan|planned|planning)\b.{0,80}\b(suicide|kill|overdose|hang|jump|shoot|cut)\b/i,
    /\b(overdose|hang(?:ing)?|jump(?:ing)?|shoot(?:ing)?|cut(?:ting)?)\b.{0,80}\b(plan|method)\b/i
  ],
  intent: [
    /\b(intent|intends|intended|intention)\b.{0,80}\b(suicide|die|kill|self[-\s]?harm)\b/i,
    /\bgoing to\b.{0,80}\b(kill myself|end my life|die by suicide)\b/i
  ],
  means: [
    /\b(means|access)\b.{0,80}\b(gun|firearm|pills|medications|knife|razor|rope)\b/i,
    /\b(gun|firearm|stockpile|pills|medications|knife|razor|rope)\b/i
  ],
  protectiveFactors: [
    /\b(protective factors?|reasons? for living|children|family support|faith|future oriented|future-oriented)\b/i,
    /\b(contract(?:ed)? for safety|support system)\b/i
  ],
  safetyPlanning: [
    /\b(safety plan|safety planning|crisis plan|988|hotline|remove(?:d)? means|means restriction)\b/i,
    /\b(return precautions|go to (?:the )?ed|call 911)\b/i
  ]
};

export function detectSelfHarmChecklist(text: string): SelfHarmChecklist {
  return Object.entries(patterns).reduce(
    (result, [key, expressions]) => ({
      ...result,
      [key]: expressions.some((expression) => expression.test(text))
    }),
    {
      ideation: false,
      plan: false,
      intent: false,
      means: false,
      protectiveFactors: false,
      safetyPlanning: false
    } as SelfHarmChecklist
  );
}
