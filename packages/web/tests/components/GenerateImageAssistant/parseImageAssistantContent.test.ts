import { describe, expect, it } from 'vitest';
import { parseImageAssistantContent } from '../../../src/components/parseImageAssistantContent';

// The Image Generation assistant asks the LLM to return a JSON object
// ({ prompt, negativePrompt, comment, recommendedStylePreset }). In multi-turn
// sessions the model frequently wraps the 2nd+ response in a Markdown code
// fence (```json ... ```), which makes a bare JSON.parse throw and loses the
// prompt/preset. parseImageAssistantContent strips such fences defensively
// before parsing, while preserving the existing error shape on truly-bad output.
// See aws-samples/generative-ai-use-cases#1392.

const payload = {
  prompt: 'a serene mountain lake at dawn',
  negativePrompt: 'blurry, low quality',
  comment: 'A calm landscape scene.',
  recommendedStylePreset: ['photographic', 'anime'],
};

const errorShape = {
  prompt: null,
  negativePrompt: null,
  comment: '',
  error: true,
  recommendedStylePreset: [],
};

describe('parseImageAssistantContent', () => {
  it('parses a plain JSON object', () => {
    expect(parseImageAssistantContent(JSON.stringify(payload))).toEqual(
      payload
    );
  });

  it('parses a ```json-fenced object to the same result as the unfenced one', () => {
    const fenced = '```json\n' + JSON.stringify(payload, null, 2) + '\n```';
    expect(parseImageAssistantContent(fenced)).toEqual(payload);
  });

  it('parses a bare ```-fenced object (no language tag)', () => {
    const fenced = '```\n' + JSON.stringify(payload) + '\n```';
    expect(parseImageAssistantContent(fenced)).toEqual(payload);
  });

  it('tolerates leading/trailing whitespace around the fence', () => {
    const fenced =
      '\n\n  ```json\n' + JSON.stringify(payload) + '\n```  \n\n';
    expect(parseImageAssistantContent(fenced)).toEqual(payload);
  });

  it('extracts the outermost {...} when prose surrounds the JSON', () => {
    const prose =
      'Sure! Here is the prompt you asked for:\n' +
      JSON.stringify(payload) +
      '\nLet me know if you want changes.';
    expect(parseImageAssistantContent(prose)).toEqual(payload);
  });

  it('returns the error shape for genuinely invalid output', () => {
    expect(parseImageAssistantContent('not json at all')).toEqual(errorShape);
  });

  it('returns the error shape for an empty string', () => {
    expect(parseImageAssistantContent('')).toEqual(errorShape);
  });

  it('returns the error shape when the JSON is a bare primitive', () => {
    // A valid-JSON primitive is not a usable assistant payload; the component
    // expects an object and would crash on content.recommendedStylePreset.
    expect(parseImageAssistantContent('42')).toEqual(errorShape);
  });

  it('returns the error shape when the JSON is an array', () => {
    expect(parseImageAssistantContent('[1, 2, 3]')).toEqual(errorShape);
  });
});
