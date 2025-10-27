/**
 * Core AI Types and Interfaces
 */

export interface AIProvider {
  readonly name: string;
  readonly version: string;
  generateText(prompt: string, options?: GenerateTextOptions): Promise<string>;
  generateChangelog(
    commits: CommitInfo[],
    options?: ChangelogOptions,
  ): Promise<ChangelogResult>;
  analyzeCode(
    code: string,
    options?: CodeAnalysisOptions,
  ): Promise<CodeAnalysisResult>;
}

export interface GenerateTextOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
  systemPrompt?: string;
}

export interface ChangelogOptions {
  format?: 'markdown' | 'json' | 'conventional';
  includeBreaking?: boolean;
  groupByType?: boolean;
  customTemplate?: string;
}

export interface ChangelogResult {
  version: string;
  date?: string;
  content: string;
  format: 'markdown' | 'json' | 'conventional';
}

export interface CodeAnalysisOptions {
  language?: string;
  analysisType?: 'quality' | 'security' | 'performance' | 'all';
  includeMetrics?: boolean;
  customRules?: string[];
}

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
  files: string[];
  additions: number;
  deletions: number;
  body?: string;
}

export interface CodeAnalysisResult {
  quality: QualityMetrics;
  security: SecurityIssue[];
  performance: PerformanceIssue[];
  suggestions: CodeSuggestion[];
  metrics: CodeMetrics;
}

export interface QualityMetrics {
  complexity: number;
  maintainability: number;
  testCoverage?: number;
  codeSmells: CodeSmell[];
  duplications: Duplication[];
}

export interface SecurityIssue {
  type: 'vulnerability' | 'warning' | 'info';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  line?: number;
  column?: number;
  rule: string;
  fix?: string;
}

export interface PerformanceIssue {
  type: 'bottleneck' | 'memory' | 'cpu' | 'io';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  line?: number;
  impact: string;
  suggestion: string;
}

export interface CodeSuggestion {
  type: 'refactor' | 'optimize' | 'modernize' | 'style';
  priority: 'high' | 'medium' | 'low';
  description: string;
  before?: string;
  after?: string;
  reasoning: string;
}

export interface CodeSmell {
  type: string;
  description: string;
  line: number;
  severity: 'minor' | 'major' | 'critical';
}

export interface Duplication {
  lines: number[];
  duplicatedLines: number;
  similarity: number;
}

export interface CodeMetrics {
  linesOfCode: number;
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  maintainabilityIndex: number;
  technicalDebt: string;
}

export interface AIConfig {
  provider: 'cloudflare' | 'openai' | 'anthropic' | 'ollama' | 'local';
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  temperature?: number;
  maxTokens?: number;
}

export interface ProviderConfig {
  cloudflare?: CloudflareConfig;
  openai?: OpenAIConfig;
  anthropic?: AnthropicConfig;
  ollama?: OllamaConfig;
}

export interface CloudflareConfig {
  accountId?: string;
  apiToken?: string;
  model?: string;
  baseUrl?: string;
}

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
  organization?: string;
  baseUrl?: string;
}

export interface AnthropicConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export interface OllamaConfig {
  baseUrl?: string;
  model?: string;
}

export type AIServiceError = {
  code: string;
  message: string;
  provider?: string;
  originalError?: Error;
};
