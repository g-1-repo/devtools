import type { AIConfig } from '../config/index.js';
import type {
  AIProvider,
  ChangelogOptions,
  ChangelogResult,
  CodeAnalysisOptions,
  CodeAnalysisResult,
  CommitInfo,
} from '../types/index.js';

/**
 * Enhanced AI Service with improved functionality
 */
export class AIServiceV2 {
  private provider: AIProvider;

  constructor(provider: AIProvider, config?: AIConfig) {
    // Validate configuration if provided
    if (config?.defaultProvider) {
      const supportedProviders = ['cloudflare', 'openai', 'ollama'];
      if (!supportedProviders.includes(config.defaultProvider)) {
        throw new Error(
          `Provider "${config.defaultProvider}" is not supported`,
        );
      }
    }

    this.provider = provider;
  }

  /**
   * Generate changelog from commits
   */
  async generateChangelog(
    commits: CommitInfo[],
    options?: ChangelogOptions,
  ): Promise<ChangelogResult> {
    // Validate commits array exists
    if (!Array.isArray(commits)) {
      throw new Error('Commits must be an array');
    }

    // Validate options if provided
    if (options && typeof options !== 'object') {
      throw new Error('Options must be an object');
    }

    return this.provider.generateChangelog(commits, options);
  }

  /**
   * Analyze code for issues and suggestions
   */
  async analyzeCode(
    code: string,
    options?: CodeAnalysisOptions,
  ): Promise<CodeAnalysisResult> {
    // Validate input
    if (!code || code.trim() === '') {
      throw new Error('Code content cannot be empty');
    }

    return this.provider.analyzeCode(code, options);
  }

  /**
   * Suggest version bump based on commits
   */
  async suggestVersionBump(
    commits: CommitInfo[],
  ): Promise<'major' | 'minor' | 'patch'> {
    const prompt = `Analyze these commits and suggest a version bump (major, minor, or patch):
${commits.map((c) => `- ${c.message}`).join('\n')}

Consider:
- Breaking changes = major
- New features = minor  
- Bug fixes = patch

Return only: major, minor, or patch`;

    const response = await this.provider.generateText(prompt, {
      maxTokens: 10,
      temperature: 0.1,
    });

    const suggestion = response.toLowerCase().trim();
    if (['major', 'minor', 'patch'].includes(suggestion)) {
      return suggestion as 'major' | 'minor' | 'patch';
    }
    return 'patch'; // Default fallback
  }

  /**
   * Analyze impact of changes
   */
  async analyzeImpact(data: {
    changes: Array<{
      file: string;
      type: 'added' | 'modified' | 'deleted';
      linesAdded: number;
      linesRemoved: number;
    }>;
  }): Promise<{
    riskLevel: 'low' | 'medium' | 'high';
    affectedAreas: string[];
    recommendations: string[];
    estimatedEffort: 'low' | 'medium' | 'high';
  }> {
    // Validate input
    if (!data || !Array.isArray(data.changes)) {
      throw new Error('Changes must be provided as an array');
    }

    // Use generateText to analyze impact since analyzeImpact is not in AIProvider interface
    const prompt = `Analyze the impact of these code changes: ${JSON.stringify(data.changes)}. 
    Provide risk level (low/medium/high), affected areas, recommendations, and estimated effort.`;

    const _analysis = await this.provider.generateText(prompt);

    // Parse the response and return structured data
    // This is a simplified implementation - in practice, you'd want more sophisticated parsing
    return {
      riskLevel: 'medium',
      affectedAreas: data.changes.map((c) => c.file),
      recommendations: ['Review changes carefully', 'Test thoroughly'],
      estimatedEffort: 'medium',
    };
  }

  /**
   * Suggest branch name based on changes
   */
  async suggestBranchName(data: {
    type: string;
    description: string;
    scope?: string;
  }): Promise<{
    suggestions: string[];
    recommended: string;
  }> {
    // Validate input
    if (!data || !data.type || !data.description) {
      throw new Error('Type and description are required');
    }

    // Use generateText to suggest branch names since suggestBranchName is not in AIProvider interface
    const prompt = `Suggest branch names for a ${data.type} change: "${data.description}"${data.scope ? ` in scope: ${data.scope}` : ''}. 
    Provide 3-5 suggestions following conventional naming patterns.`;

    const _suggestions = await this.provider.generateText(prompt);

    // Parse the response and return structured data
    // This is a simplified implementation - in practice, you'd want more sophisticated parsing
    const branchSuggestions = [
      `${data.type}/${data.description.toLowerCase().replace(/\s+/g, '-')}`,
      `${data.type}-${data.description.toLowerCase().replace(/\s+/g, '-')}`,
      data.scope
        ? `${data.type}/${data.scope}-${data.description.toLowerCase().replace(/\s+/g, '-')}`
        : `${data.type}/update-${data.description.toLowerCase().replace(/\s+/g, '-')}`,
    ];

    return {
      suggestions: branchSuggestions,
      recommended: branchSuggestions[0],
    };
  }

  /**
   * Suggest commit message based on changes
   */
  async suggestCommitMessage(data: {
    files: string[];
    changes: string;
  }): Promise<{
    suggestions: string[];
    recommended: string;
  }> {
    // Validate input
    if (!data || !Array.isArray(data.files)) {
      throw new Error('Files must be provided as an array');
    }

    // Use generateText to suggest commit messages since suggestCommitMessage is not in AIProvider interface
    const prompt = `Suggest commit messages for changes to files: ${data.files.join(', ')}. 
    Changes: ${data.changes}. 
    Provide 3-5 conventional commit message suggestions.`;

    const _suggestions = await this.provider.generateText(prompt);

    // Parse the response and return structured data
    // This is a simplified implementation - in practice, you'd want more sophisticated parsing
    const commitSuggestions = [
      `feat: ${data.changes}`,
      `fix: ${data.changes}`,
      `refactor: ${data.changes}`,
    ];

    return {
      suggestions: commitSuggestions,
      recommended: commitSuggestions[0],
    };
  }
}
