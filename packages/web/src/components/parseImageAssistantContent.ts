// Parses an Image Generation assistant message into its structured payload.
//
// The assistant is prompted to return only a JSON object
// ({ prompt, negativePrompt, comment, recommendedStylePreset }), but in
// multi-turn sessions the model frequently wraps the 2nd+ response in a
// Markdown code fence (```json ... ```) or surrounds it with prose. A bare
// JSON.parse then throws, the prompt/preset are lost, and the UI shows an
// error on the second turn even though the response is otherwise valid.
//
// This helper strips such fences/prose defensively before parsing. On
// genuinely unparseable output it returns the same error shape the call site
// previously produced in its catch block, so truly-bad output still degrades
// gracefully. See aws-samples/generative-ai-use-cases#1392.

export type ImageAssistantContent = {
  prompt: string | null;
  negativePrompt: string | null;
  comment: string;
  recommendedStylePreset: string[];
  error?: boolean;
};

const errorContent = (): ImageAssistantContent => ({
  prompt: null,
  negativePrompt: null,
  comment: '',
  error: true,
  recommendedStylePreset: [],
});

// Strip a single leading ```/```json fence and a trailing ``` fence, if present.
const stripCodeFence = (text: string): string => {
  const fenced = text.match(/^```(?:[a-zA-Z0-9_-]+)?\s*\n?([\s\S]*?)\n?```$/);
  return fenced ? fenced[1].trim() : text;
};

const tryParseObject = (text: string): ImageAssistantContent | null => {
  try {
    const parsed = JSON.parse(text);
    // The call site reads object fields (e.g. recommendedStylePreset.flatMap),
    // so only a plain object is a usable payload — reject primitives/arrays.
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as ImageAssistantContent;
    }
  } catch {
    // fall through
  }
  return null;
};

export const parseImageAssistantContent = (
  raw: string
): ImageAssistantContent => {
  const trimmed = (raw ?? '').trim();

  // 1. Direct parse (the common, well-formed case).
  // 2. After stripping a surrounding Markdown code fence.
  const unfenced = stripCodeFence(trimmed);
  const direct = tryParseObject(unfenced) ?? tryParseObject(trimmed);
  if (direct) {
    return direct;
  }

  // 3. Last resort: extract the outermost {...} when prose surrounds the JSON.
  const start = unfenced.indexOf('{');
  const end = unfenced.lastIndexOf('}');
  if (start !== -1 && end > start) {
    const extracted = tryParseObject(unfenced.slice(start, end + 1));
    if (extracted) {
      return extracted;
    }
  }

  return errorContent();
};
