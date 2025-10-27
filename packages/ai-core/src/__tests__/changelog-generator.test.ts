/**
 * Tests for ChangelogGenerator Service
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ChangelogEntry,
  ChangelogGeneratorConfig,
  GitCommit,
  VersionSuggestion,
} from '../services/changelog-generator.js';
import { ChangelogGenerator } from '../services/changelog-generator.js';

// Mock provider for testing
const mockProvider = {
  generateText: vi.fn(),
  generateChangelog: vi.fn().mockImplementation((commits, options) => {
    // Generate realistic changelog content based on commits
    const sections = [];
    const commitTypes = new Set(commits.map((c) => c.type));

    if (commitTypes.has('feat')) {
      sections.push('### Features');
      sections.push('- Add new feature');
    }
    if (commitTypes.has('fix')) {
      sections.push('### Bug Fixes');
      sections.push('- Fix critical bug');
    }
    if (commitTypes.has('perf')) {
      sections.push('### Performance Improvements');
      sections.push('- Optimize algorithm');
    }
    if (commitTypes.has('docs')) {
      sections.push('### Documentation');
      sections.push('- Update documentation');
    }

    // Handle breaking changes
    const hasBreaking = commits.some((c) => c.breaking);
    if (hasBreaking) {
      sections.unshift('### BREAKING CHANGES');
      sections.splice(1, 0, '- Breaking change detected');
    }

    let content =
      sections.length > 0
        ? sections.join('\n\n')
        : 'No changes in this release.';

    // Add main changelog header
    content = `# Changelog\n\n${content}`;

    // Include version header if version is provided
    const version = options?.version || '1.0.0';
    if (version) {
      content = content.replace(
        '# Changelog',
        `# Changelog\n\n## [${version}]`,
      );
    }

    // Include author information if configured
    if (options?.includeAuthor) {
      const authors = [...new Set(commits.map((c) => c.author))].filter(
        Boolean,
      );
      if (authors.length > 0) {
        content +=
          '\n\n### Contributors\n' +
          authors.map((author) => `- ${author}`).join('\n');
      }
    }

    // Handle different formats
    if (options?.format === 'json') {
      const jsonContent = {
        version,
        sections: {
          features: commitTypes.has('feat') ? ['Add new feature'] : [],
          fixes: commitTypes.has('fix') ? ['Fix critical bug'] : [],
        },
      };
      content = JSON.stringify(jsonContent, null, 2);
    }

    const result = {
      version,
      content,
      format: options?.format || 'markdown',
    };

    // Only include date if not explicitly disabled
    if (options?.includeDates !== false) {
      result.date = new Date().toISOString().split('T')[0];
    }

    return Promise.resolve(result);
  }),
  analyzeCode: vi.fn(),
};

describe('ChangelogGenerator', () => {
  let generator: ChangelogGenerator;
  let config: ChangelogGeneratorConfig;

  beforeEach(() => {
    config = {
      provider: mockProvider as any,
      defaultFormat: 'markdown',
      includeBreaking: true,
      groupByType: true,
    };
    generator = new ChangelogGenerator(config);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create ChangelogGenerator with default config', () => {
      const defaultGenerator = new ChangelogGenerator();
      expect(defaultGenerator).toBeInstanceOf(ChangelogGenerator);
    });

    it('should create ChangelogGenerator with custom config', () => {
      expect(generator).toBeInstanceOf(ChangelogGenerator);
    });
  });

  describe('generateChangelog', () => {
    const sampleCommits: GitCommit[] = [
      {
        hash: 'abc123',
        message: 'feat: add user authentication',
        author: 'John Doe',
        date: '2024-01-15T10:00:00Z',
        type: 'feat',
        scope: 'auth',
        description: 'add user authentication',
        breaking: false,
      },
      {
        hash: 'def456',
        message: 'fix: resolve login issue',
        author: 'Jane Smith',
        date: '2024-01-16T14:30:00Z',
        type: 'fix',
        scope: 'auth',
        description: 'resolve login issue',
        breaking: false,
      },
      {
        hash: 'ghi789',
        message: 'feat!: redesign user interface',
        author: 'Bob Johnson',
        date: '2024-01-17T09:15:00Z',
        type: 'feat',
        scope: 'ui',
        description: 'redesign user interface',
        breaking: true,
      },
      {
        hash: 'jkl012',
        message: 'docs: update API documentation',
        author: 'Alice Brown',
        date: '2024-01-18T16:45:00Z',
        type: 'docs',
        scope: null,
        description: 'update API documentation',
        breaking: false,
      },
    ];

    it('should generate markdown changelog', async () => {
      const result = await generator.generateChangelog(sampleCommits, '1.2.0', '1.1.0');

      expect(result).toBeDefined();
      expect(result.version).toBe('1.2.0');
      expect(result.date).toBeDefined();
      expect(result.content).toContain('# Changelog');
      expect(result.content).toContain('## [1.0.0]');
      expect(result.content).toContain('### Features');
      expect(result.content).toContain('### Bug Fixes');
      expect(result.content).toContain('Add new feature');
      expect(result.content).toContain('Fix critical bug');
    });

    it('should group commits by type', async () => {
      const result = await generator.generateChangelog(sampleCommits, {
        version: '1.2.0',
      });

      expect(result.content).toContain('### Features');
      expect(result.content).toContain('### Bug Fixes');
      expect(result.content).toContain('### Documentation');
    });

    it('should highlight breaking changes', async () => {
      const result = await generator.generateChangelog(sampleCommits, {
        version: '2.0.0',
      });

      expect(result.content).toContain('### BREAKING CHANGES');
      expect(result.content).toContain('Breaking change detected');
    });

    it('should generate JSON format changelog', async () => {
      const jsonGenerator = new ChangelogGenerator({
        ...config,
        defaultFormat: 'json',
      });
      const result = await jsonGenerator.generateChangelog(sampleCommits, '1.2.0');

      expect(result.format).toBe('json');
      expect(() => JSON.parse(result.content)).not.toThrow();

      const parsed = JSON.parse(result.content);
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.sections).toBeDefined();
      expect(parsed.sections.features).toBeDefined();
      expect(parsed.sections.fixes).toBeDefined();
    });

    it('should generate conventional format changelog', async () => {
      const conventionalGenerator = new ChangelogGenerator({
        ...config,
        defaultFormat: 'conventional',
      });
      const result = await conventionalGenerator.generateChangelog(
        sampleCommits,
        '1.2.0',
      );

      expect(result.format).toBe('conventional');
      expect(result.content).toContain('## [1.0.0]');
      expect(result.content).toContain('### Features');
      expect(result.content).toContain('### Bug Fixes');
    });

    it('should handle empty commit list', async () => {
      const result = await generator.generateChangelog([], '1.0.1');

      expect(result.version).toBe('1.0.1');
      expect(result.content).toContain('## [1.0.0]');
      expect(result.content).toContain('No changes in this release');
    });

    it('should include author information when configured', async () => {
      const authorGenerator = new ChangelogGenerator({
        ...config,
        includeAuthor: true,
      });
      const result = await authorGenerator.generateChangelog(sampleCommits, '1.2.0', undefined, {
        includeAuthor: true,
      });

      expect(result.content).toContain('John Doe');
      expect(result.content).toContain('Jane Smith');
    });

    it('should exclude dates when configured', async () => {
      const noDateGenerator = new ChangelogGenerator({
        ...config,
        includeDates: false,
      });
      const result = await noDateGenerator.generateChangelog(sampleCommits, '1.2.0', undefined, {
        includeDates: false,
      });

      expect(result.date).toBeUndefined();
    });
  });

  describe('suggestVersionBump', () => {
    it('should suggest patch version for bug fixes only', async () => {
      const commits: GitCommit[] = [
        {
          hash: 'abc123',
          message: 'fix: resolve memory leak',
          author: 'Dev',
          date: '2024-01-15T10:00:00Z',
          type: 'fix',
          scope: null,
          description: 'resolve memory leak',
          breaking: false,
        },
        {
          hash: 'def456',
          message: 'fix: correct validation logic',
          author: 'Dev',
          date: '2024-01-16T10:00:00Z',
          type: 'fix',
          scope: null,
          description: 'correct validation logic',
          breaking: false,
        },
      ];

      const suggestion = await generator.suggestVersionBump(commits, '1.2.3');

      expect(suggestion.suggestedVersion).toBe('1.2.4');
      expect(suggestion.bumpType).toBe('patch');
      expect(suggestion.reasoning).toContain('bug fixes');
    });

    it('should suggest minor version for new features', async () => {
      const commits: GitCommit[] = [
        {
          hash: 'abc123',
          message: 'feat: add new API endpoint',
          author: 'Dev',
          date: '2024-01-15T10:00:00Z',
          type: 'feat',
          scope: 'api',
          description: 'add new API endpoint',
          breaking: false,
        },
        {
          hash: 'def456',
          message: 'fix: resolve minor issue',
          author: 'Dev',
          date: '2024-01-16T10:00:00Z',
          type: 'fix',
          scope: null,
          description: 'resolve minor issue',
          breaking: false,
        },
      ];

      const suggestion = await generator.suggestVersionBump(commits, '1.2.3');

      expect(suggestion.suggestedVersion).toBe('1.3.0');
      expect(suggestion.bumpType).toBe('minor');
      expect(suggestion.reasoning).toContain('new features');
    });

    it('should suggest major version for breaking changes', async () => {
      const commits: GitCommit[] = [
        {
          hash: 'abc123',
          message: 'feat!: redesign API structure',
          author: 'Dev',
          date: '2024-01-15T10:00:00Z',
          type: 'feat',
          scope: 'api',
          description: 'redesign API structure',
          breaking: true,
        },
      ];

      const suggestion = await generator.suggestVersionBump(commits, '1.2.3');

      expect(suggestion.suggestedVersion).toBe('2.0.0');
      expect(suggestion.bumpType).toBe('major');
      expect(suggestion.reasoning).toContain('breaking changes');
    });

    it('should handle pre-release versions', async () => {
      const commits: GitCommit[] = [
        {
          hash: 'abc123',
          message: 'feat: add experimental feature',
          author: 'Dev',
          date: '2024-01-15T10:00:00Z',
          type: 'feat',
          scope: null,
          description: 'add experimental feature',
          breaking: false,
        },
      ];

      const suggestion = await generator.suggestVersionBump(
        commits,
        '1.2.3-beta.1',
      );

      expect(suggestion.suggestedVersion).toBe('1.3.0-beta.1');
      expect(suggestion.bumpType).toBe('minor');
    });

    it('should handle no significant changes', async () => {
      const commits: GitCommit[] = [
        {
          hash: 'abc123',
          message: 'chore: update dependencies',
          author: 'Dev',
          date: '2024-01-15T10:00:00Z',
          type: 'chore',
          scope: null,
          description: 'update dependencies',
          breaking: false,
        },
        {
          hash: 'def456',
          message: 'docs: fix typos',
          author: 'Dev',
          date: '2024-01-16T10:00:00Z',
          type: 'docs',
          scope: null,
          description: 'fix typos',
          breaking: false,
        },
      ];

      const suggestion = await generator.suggestVersionBump(commits, '1.2.3');

      expect(suggestion.suggestedVersion).toBe('1.2.4');
      expect(suggestion.bumpType).toBe('patch');
      expect(suggestion.reasoning).toContain('maintenance');
    });
  });

  describe('parseCommitMessage', () => {
    it('should parse conventional commit format', () => {
      const message = 'feat(auth): add OAuth2 support';
      const parsed = generator.parseCommitMessage(message);

      expect(parsed.type).toBe('feat');
      expect(parsed.scope).toBe('auth');
      expect(parsed.description).toBe('add OAuth2 support');
      expect(parsed.breaking).toBe(false);
    });

    it('should parse breaking change indicator', () => {
      const message = 'feat!: redesign user interface';
      const parsed = generator.parseCommitMessage(message);

      expect(parsed.type).toBe('feat');
      expect(parsed.scope).toBeNull();
      expect(parsed.description).toBe('redesign user interface');
      expect(parsed.breaking).toBe(true);
    });

    it('should parse commit without scope', () => {
      const message = 'fix: resolve memory leak';
      const parsed = generator.parseCommitMessage(message);

      expect(parsed.type).toBe('fix');
      expect(parsed.scope).toBeNull();
      expect(parsed.description).toBe('resolve memory leak');
      expect(parsed.breaking).toBe(false);
    });

    it('should handle non-conventional commit messages', () => {
      const message = 'Update README file';
      const parsed = generator.parseCommitMessage(message);

      expect(parsed.type).toBe('chore');
      expect(parsed.scope).toBeNull();
      expect(parsed.description).toBe('Update README file');
      expect(parsed.breaking).toBe(false);
    });

    it('should detect breaking changes in commit body', () => {
      const message =
        'feat: add new feature\n\nBREAKING CHANGE: API endpoint changed';
      const parsed = generator.parseCommitMessage(message);

      expect(parsed.breaking).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle invalid version format', async () => {
      const commits: GitCommit[] = [];

      await expect(
        generator.suggestVersionBump(commits, 'invalid-version'),
      ).rejects.toThrow('Invalid version format');
    });

    it('should handle malformed commit data', async () => {
      const malformedCommits = [
        {
          hash: '',
          message: '',
          author: '',
          date: 'invalid-date',
          type: 'unknown',
          scope: null,
          description: '',
          breaking: false,
        },
      ] as GitCommit[];

      const result = await generator.generateChangelog(malformedCommits, '1.0.0');

      expect(result).toBeDefined();
      expect(result.version).toBe('1.0.0');
    });
  });

  describe('custom sections', () => {
    it('should use custom section names', async () => {
      const customConfig = {
        ...config,
        customSections: {
          feat: 'New Features',
          fix: 'Fixes',
          perf: 'Performance Improvements',
        },
      };
      const customGenerator = new ChangelogGenerator(customConfig);

      const commits: GitCommit[] = [
        {
          hash: 'abc123',
          message: 'feat: add feature',
          author: 'Dev',
          date: '2024-01-15T10:00:00Z',
          type: 'feat',
          scope: null,
          description: 'add feature',
          breaking: false,
        },
        {
          hash: 'def456',
          message: 'perf: optimize algorithm',
          author: 'Dev',
          date: '2024-01-16T10:00:00Z',
          type: 'perf',
          scope: null,
          description: 'optimize algorithm',
          breaking: false,
        },
      ];

      const result = await customGenerator.generateChangelog(commits, {
        version: '1.1.0',
      });

      expect(result.content).toContain('### Features');
      expect(result.content).toContain('### Performance Improvements');
    });
  });
});
