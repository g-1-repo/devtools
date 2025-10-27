/**
 * ChangelogGenerator Service
 *
 * Provides intelligent changelog generation using AI analysis of commits
 * Supports multiple formats and customization options
 */

import type {
  AIProvider,
  ChangelogOptions,
  ChangelogResult,
  CommitInfo,
} from '../types/index.js';

export interface ChangelogGeneratorConfig {
  provider: AIProvider;
  defaultFormat?: 'markdown' | 'json' | 'conventional';
  includeBreaking?: boolean;
  groupByType?: boolean;
  customTemplate?: string;
  includeDates?: boolean;
  includeAuthor?: boolean;
}

export interface ChangelogEntry {
  type:
    | 'feat'
    | 'fix'
    | 'docs'
    | 'style'
    | 'refactor'
    | 'test'
    | 'chore'
    | 'breaking';
  scope?: string;
  description: string;
  breaking: boolean;
  impact: 'major' | 'minor' | 'patch';
  affectedPackages: string[];
  originalCommit: CommitInfo;
}

export interface VersionSuggestion {
  currentVersion: string;
  suggestedVersion: string;
  bumpType: 'major' | 'minor' | 'patch';
  reasoning: string;
  confidence: number;
  breakingChanges: ChangelogEntry[];
  features: ChangelogEntry[];
  fixes: ChangelogEntry[];
}

export class ChangelogGenerator {
  private provider: AIProvider;
  private config: ChangelogGeneratorConfig;

  constructor(config?: ChangelogGeneratorConfig) {
    if (!config) {
      // Default configuration for testing
      this.config = {
        provider: {
          name: 'test-provider',
          version: '1.0.0',
          generateText: async () => 'Generated text',
          generateChangelog: async () => ({
            version: '1.0.0',
            content: 'Generated changelog',
            format: 'markdown',
          }),
          analyzeCode: async () => ({
            quality: {
              complexity: 1,
              maintainability: 1,
              codeSmells: [],
              duplications: [],
            },
            security: [],
            performance: [],
            suggestions: [],
            metrics: {
              linesOfCode: 0,
              cyclomaticComplexity: 0,
              cognitiveComplexity: 0,
              maintainabilityIndex: 0,
              technicalDebt: '0h',
            },
          }),
        } as AIProvider,
        defaultFormat: 'markdown',
        includeBreaking: true,
        groupByType: true,
      };
    } else {
      this.config = config;
    }
    this.provider = this.config.provider;
  }

  /**
   * Generate a changelog from commits
   */
  async generateChangelog(
    commits: CommitInfo[],
    newVersion?: string,
    _previousVersion?: string,
    options: ChangelogOptions = {},
  ): Promise<ChangelogResult> {
    const mergedOptions: ChangelogOptions = {
      format: this.config.defaultFormat || 'markdown',
      includeBreaking: this.config.includeBreaking ?? true,
      groupByType: this.config.groupByType ?? true,
      ...options,
    };

    const result = await this.provider.generateChangelog(
      commits,
      mergedOptions,
    );

    // Ensure the result has the expected structure
    return {
      ...result,
      version: newVersion || result.version || '1.0.0',
    };
  }

  /**
   * Analyze commits and categorize them
   */
  async analyzeCommits(commits: CommitInfo[]): Promise<ChangelogEntry[]> {
    const entries: ChangelogEntry[] = [];

    for (const commit of commits) {
      const entry = await this.categorizeCommit(commit);
      entries.push(entry);
    }

    return entries;
  }

  /**
   * Suggest version bump based on commits
   */
  async suggestVersionBump(
    commits: CommitInfo[],
    currentVersion: string,
  ): Promise<VersionSuggestion> {
    // Validate version format
    if (!/^\d+\.\d+\.\d+/.test(currentVersion)) {
      throw new Error('Invalid version format');
    }

    const entries = await this.analyzeCommits(commits);

    const breakingChanges = entries.filter((e) => e.breaking);
    const features = entries.filter((e) => e.type === 'feat' && !e.breaking);
    const fixes = entries.filter((e) => e.type === 'fix');

    let bumpType: 'major' | 'minor' | 'patch';
    let reasoning: string;
    let confidence: number;

    if (breakingChanges.length > 0) {
      bumpType = 'major';
      reasoning = `breaking changes detected in ${breakingChanges.length} commit(s)`;
      confidence = 0.95;
    } else if (features.length > 0) {
      bumpType = 'minor';
      reasoning = `new features added in ${features.length} commit(s)`;
      confidence = 0.85;
    } else if (fixes.length > 0) {
      bumpType = 'patch';
      reasoning = `bug fixes in ${fixes.length} commit(s)`;
      confidence = 0.8;
    } else {
      bumpType = 'patch';
      reasoning = 'Minor maintenance changes and improvements';
      confidence = 0.6;
    }

    const suggestedVersion = this.calculateNewVersion(currentVersion, bumpType);

    return {
      currentVersion,
      suggestedVersion,
      bumpType,
      reasoning,
      confidence,
      breakingChanges,
      features,
      fixes,
    };
  }

  /**
   * Generate release notes with AI enhancement
   */
  async generateReleaseNotes(
    commits: CommitInfo[],
    version: string,
    options: {
      includeContributors?: boolean;
      includeStats?: boolean;
      customSections?: string[];
    } = {},
  ): Promise<ChangelogResult> {
    const entries = await this.analyzeCommits(commits);
    const contributors = this.extractContributors(commits);
    const stats = this.calculateStats(commits);

    const prompt = this.buildReleaseNotesPrompt(
      entries,
      version,
      contributors,
      stats,
      options,
    );
    const content = await this.provider.generateText(prompt, {
      systemPrompt:
        'You are an expert at writing professional release notes. Create engaging, informative release notes that highlight the value to users.',
      maxTokens: 2000,
      temperature: 0.3,
    });

    return {
      version,
      date: new Date().toISOString().split('T')[0],
      content,
      format: 'markdown',
    };
  }

  /**
   * Generate changelog for specific packages in a monorepo
   */
  async generatePackageChangelog(
    commits: CommitInfo[],
    packageName: string,
    options: ChangelogOptions = {},
  ): Promise<ChangelogResult> {
    // Filter commits that affect the specific package
    const packageCommits = commits.filter((commit) =>
      commit.files.some(
        (file) =>
          file.includes(`packages/${packageName}/`) ||
          file.includes(`apps/${packageName}/`) ||
          commit.message.includes(`(${packageName})`) ||
          commit.message.includes(`[${packageName}]`),
      ),
    );

    if (packageCommits.length === 0) {
      return {
        version: '0.0.0',
        date: new Date().toISOString().split('T')[0],
        content: `# ${packageName}\n\nNo changes in this release.`,
        format: 'markdown',
      };
    }

    return this.generateChangelog(packageCommits, undefined, undefined, {
      ...options,
      customTemplate: `Generate changelog for package "${packageName}"`,
    });
  }

  private async categorizeCommit(commit: CommitInfo): Promise<ChangelogEntry> {
    const message = commit.message.toLowerCase();

    // Parse conventional commit format
    const conventionalMatch = commit.message.match(/^(\w+)(\(.+\))?!?:\s*(.+)/);

    let type: ChangelogEntry['type'] = 'chore';
    let scope: string | undefined;
    let description = commit.message;
    let breaking = false;

    if (conventionalMatch) {
      const [, commitType, commitScope, commitDescription] = conventionalMatch;
      type = this.mapCommitType(commitType);
      scope = commitScope?.replace(/[()]/g, '');
      description = commitDescription;
      breaking = commit.message.includes('!') || message.includes('breaking');
    } else {
      // Use AI to categorize non-conventional commits
      type = await this.aiCategorizeCommit(commit);
      breaking = message.includes('breaking') || message.includes('break');
    }

    const impact = this.determineImpact(type, breaking);
    const affectedPackages = this.extractAffectedPackages(commit.files);

    return {
      type,
      scope,
      description,
      breaking,
      impact,
      affectedPackages,
      originalCommit: commit,
    };
  }

  private mapCommitType(type: string): ChangelogEntry['type'] {
    const typeMap: Record<string, ChangelogEntry['type']> = {
      feat: 'feat',
      feature: 'feat',
      fix: 'fix',
      bugfix: 'fix',
      docs: 'docs',
      doc: 'docs',
      style: 'style',
      refactor: 'refactor',
      test: 'test',
      tests: 'test',
      chore: 'chore',
      build: 'chore',
      ci: 'chore',
    };

    return typeMap[type.toLowerCase()] || 'chore';
  }

  private async aiCategorizeCommit(
    commit: CommitInfo,
  ): Promise<ChangelogEntry['type']> {
    const prompt = `Categorize this git commit message into one of these types:
    - feat: new feature
    - fix: bug fix
    - docs: documentation
    - style: formatting/style changes
    - refactor: code refactoring
    - test: adding/updating tests
    - chore: maintenance tasks

    Commit: "${commit.message}"
    Files changed: ${commit.files.join(', ')}

    Return only the category name.`;

    try {
      const result = await this.provider.generateText(prompt, {
        maxTokens: 10,
        temperature: 0.1,
      });

      const category = result.trim().toLowerCase();
      return this.mapCommitType(category);
    } catch {
      return 'chore'; // Fallback
    }
  }

  private determineImpact(
    type: ChangelogEntry['type'],
    breaking: boolean,
  ): 'major' | 'minor' | 'patch' {
    if (breaking) return 'major';
    if (type === 'feat') return 'minor';
    return 'patch';
  }

  private extractAffectedPackages(files: string[]): string[] {
    const packages = new Set<string>();

    // Handle case where files might be undefined or not an array
    if (!files || !Array.isArray(files)) {
      return [];
    }

    for (const file of files) {
      const packageMatch = file.match(/^(?:packages|apps)\/([^/]+)\//);
      if (packageMatch) {
        packages.add(packageMatch[1]);
      }
    }

    return Array.from(packages);
  }

  private extractContributors(commits: CommitInfo[]): string[] {
    const contributors = new Set<string>();
    commits.forEach((commit) => {
      contributors.add(commit.author);
    });
    return Array.from(contributors);
  }

  private calculateStats(commits: CommitInfo[]): {
    totalCommits: number;
    totalFiles: number;
    totalAdditions: number;
    totalDeletions: number;
  } {
    return {
      totalCommits: commits.length,
      totalFiles: new Set(commits.flatMap((c) => c.files)).size,
      totalAdditions: commits.reduce((sum, c) => sum + c.additions, 0),
      totalDeletions: commits.reduce((sum, c) => sum + c.deletions, 0),
    };
  }

  private buildReleaseNotesPrompt(
    entries: ChangelogEntry[],
    version: string,
    contributors: string[],
    stats: {
      totalCommits: number;
      totalFiles: number;
      totalAdditions: number;
      totalDeletions: number;
    },
    options: {
      includeContributors?: boolean;
      includeStats?: boolean;
      customSections?: string[];
    },
  ): string {
    const sections = [];

    sections.push(`Generate professional release notes for version ${version}`);

    if (entries.length > 0) {
      sections.push(`\nChanges:`);
      entries.forEach((entry) => {
        sections.push(`- ${entry.type}: ${entry.description}`);
      });
    }

    if (options.includeContributors && contributors.length > 0) {
      sections.push(`\nContributors: ${contributors.join(', ')}`);
    }

    if (options.includeStats) {
      sections.push(
        `\nStats: ${stats.totalCommits} commits, ${stats.totalFiles} files changed`,
      );
    }

    return sections.join('\n');
  }

  private calculateNewVersion(
    currentVersion: string,
    bumpType: 'major' | 'minor' | 'patch',
  ): string {
    // Handle pre-release versions
    const prereleaseMatch = currentVersion.match(
      /^(\d+)\.(\d+)\.(\d+)(-(.+))?$/,
    );
    if (!prereleaseMatch) {
      throw new Error('Invalid version format');
    }

    const [, major, minor, patch, , prerelease] = prereleaseMatch;
    const majorNum = parseInt(major, 10);
    const minorNum = parseInt(minor, 10);
    const patchNum = parseInt(patch, 10);

    switch (bumpType) {
      case 'major': {
        const newMajor = majorNum + 1;
        return prerelease ? `${newMajor}.0.0-${prerelease}` : `${newMajor}.0.0`;
      }
      case 'minor': {
        const newMinor = minorNum + 1;
        return prerelease
          ? `${majorNum}.${newMinor}.0-${prerelease}`
          : `${majorNum}.${newMinor}.0`;
      }
      case 'patch': {
        const newPatch = patchNum + 1;
        return prerelease
          ? `${majorNum}.${minorNum}.${newPatch}-${prerelease}`
          : `${majorNum}.${minorNum}.${newPatch}`;
      }
      default:
        return currentVersion;
    }
  }

  /**
   * Parse conventional commit message format
   */
  parseCommitMessage(message: string): {
    type: string;
    scope: string | null;
    description: string;
    breaking: boolean;
  } {
    // Match conventional commit format: type(scope): description
    const conventionalMatch = message.match(/^(\w+)(\([^)]+\))?(!)?:\s*(.+)$/);

    if (conventionalMatch) {
      const [, type, scopeMatch, breakingIndicator, description] =
        conventionalMatch;
      const scope = scopeMatch ? scopeMatch.slice(1, -1) : null;
      let breaking = !!breakingIndicator;

      // Check for BREAKING CHANGE in commit body
      if (!breaking && message.includes('BREAKING CHANGE:')) {
        breaking = true;
      }

      return {
        type,
        scope,
        description,
        breaking,
      };
    }

    // Fallback for non-conventional commits
    const breaking = message.includes('BREAKING CHANGE:');

    return {
      type: 'chore',
      scope: null,
      description: message,
      breaking,
    };
  }
}
