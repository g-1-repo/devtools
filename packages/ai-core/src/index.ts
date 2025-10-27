// Core AI functionality

// Configuration
export {
  AIConfigManager,
  createAIConfigFromEnv,
  defaultAIConfig,
  getProviderConfig,
} from './config/ai-config.js';
// Types - export only what exists
export type { AIConfig } from './config/index.js';
// Providers
export { CloudflareWorkersAI } from './providers/cloudflare.js';
export { AIServiceV2 } from './services/ai-service-v2.js';

export type {
  AIProvider,
  AIServiceError,
  AnthropicConfig,
  ChangelogOptions,
  CloudflareConfig,
  CodeAnalysisOptions,
  CodeAnalysisResult,
  CodeMetrics,
  CodeSmell,
  CodeSuggestion,
  CommitInfo,
  Duplication,
  GenerateTextOptions,
  OllamaConfig,
  OpenAIConfig,
  PerformanceIssue,
  ProviderConfig,
  QualityMetrics,
  SecurityIssue,
} from './types/index.js';
