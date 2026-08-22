/* ============================================================
   Briselle Platform — ai-gateway / adapters/index.ts
   Created At: 2026-08-22 | Last Modified: 2026-08-22
   Task: BRIS-AI-T158 / T161

   Adapter registry. Adding a provider family means adding one file and
   one line here — the gateway itself never changes.
   ============================================================ */
import { anthropicAdapter } from './anthropic.ts';
import { openaiCompatibleAdapter } from './openaiCompatible.ts';
import { AdapterError, type AiProviderAdapter } from './types.ts';

const REGISTRY: Record<string, AiProviderAdapter> = {
  'openai-compatible': openaiCompatibleAdapter,
  'anthropic': anthropicAdapter,
  /* `custom` maps to the OpenAI shape because that is what almost every
     self-hosted gateway (vLLM, LM Studio, Ollama, LiteLLM) actually
     speaks. A genuinely different wire format needs its own adapter and
     its own provider type, not a `custom` special case here. */
  'custom': openaiCompatibleAdapter,
};

export function getAdapter(providerType: string): AiProviderAdapter {
  const adapter = REGISTRY[providerType];
  if (!adapter) {
    throw new AdapterError(
      `No adapter for provider type "${providerType}". Supported: ${Object.keys(REGISTRY).join(', ')}.`,
      400,
      'unsupported_provider_type'
    );
  }
  return adapter;
}

export { AdapterError };
export type { AiProviderAdapter };
export * from './types.ts';
