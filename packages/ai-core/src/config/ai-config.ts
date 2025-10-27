/**
 * AI Configuration Manager
 *
 * Manages AI provider configurations with sensible defaults
 * Supports multiple providers and environment-based configuration
 */

import type {
  CloudflareConfig,
  OllamaConfig,
  OpenAIConfig,
} from '../types/index.js';

export interface AIConfig {
  defaultProvider: 'cloudflare' | 'openai' | 'ollama';
  providers: {
    cloudflare?: CloudflareConfig;
    openai?: OpenAIConfig;
    ollama?: OllamaConfig;
  };
  services: {
    codeAnalyzer: {
      enabled: boolean;
      maxFileSize: number;
      supportedExtensions: string[];
      analysisTimeout: number;
    };
    changelogGenerator: {
      enabled: boolean;
      defaultFormat: 'markdown' | 'json' | 'conventional';
      includeBreaking: boolean;
      groupByType: boolean;
    };
  };
  cache: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
}

export class AIConfigManager {
  private config: AIConfig;
  private static instance: AIConfigManager;

  private constructor(config?: Partial<AIConfig>) {
    this.config = this.mergeWithDefaults(config || {});
  }

  static getInstance(config?: Partial<AIConfig>): AIConfigManager {
    if (!AIConfigManager.instance) {
      AIConfigManager.instance = new AIConfigManager(config);
    }
    return AIConfigManager.instance;
  }

  // Method to reset the singleton instance for testing
  static resetInstance(): void {
    // @ts-expect-error - Intentionally setting to undefined for testing
    AIConfigManager.instance = undefined;
  }

  /**
   * Get the complete configuration
   */
  getConfig(): AIConfig {
    return { ...this.config };
  }

  /**
   * Get configuration for a specific provider
   */
  getProviderConfig(
    provider: 'cloudflare' | 'openai' | 'ollama',
  ): CloudflareConfig | OpenAIConfig | OllamaConfig | undefined {
    return this.config.providers[provider];
  }

  /**
   * Get the default provider configuration
   */
  getDefaultProviderConfig(): CloudflareConfig | OpenAIConfig | OllamaConfig {
    const defaultProvider = this.config.defaultProvider;
    const providerConfig = this.config.providers[defaultProvider];

    if (!providerConfig) {
      throw new Error(
        `Default provider '${defaultProvider}' is not configured`,
      );
    }

    return providerConfig;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<AIConfig>): void {
    this.config = this.mergeWithDefaults(updates, this.config);
  }

  /**
   * Update provider configuration
   */
  updateProviderConfig(
    provider: 'cloudflare' | 'openai' | 'ollama',
    config: Partial<CloudflareConfig | OpenAIConfig | OllamaConfig>,
  ): void {
    if (!this.config.providers[provider]) {
      if (provider === 'cloudflare') {
        this.config.providers[provider] = {} as CloudflareConfig;
      } else if (provider === 'openai') {
        this.config.providers[provider] = {} as OpenAIConfig;
      } else if (provider === 'ollama') {
        this.config.providers[provider] = {} as OllamaConfig;
      }
    }

    if (provider === 'cloudflare' && this.config.providers.cloudflare) {
      this.config.providers.cloudflare = {
        ...this.config.providers.cloudflare,
        ...config,
      } as CloudflareConfig;
    } else if (provider === 'openai' && this.config.providers.openai) {
      this.config.providers.openai = {
        ...this.config.providers.openai,
        ...config,
      } as OpenAIConfig;
    } else if (provider === 'ollama' && this.config.providers.ollama) {
      this.config.providers.ollama = {
        ...this.config.providers.ollama,
        ...config,
      } as OllamaConfig;
    }
  }

  /**
   * Load configuration from environment variables
   */
  static fromEnvironment(): AIConfigManager {
    const config: Partial<AIConfig> = {
      defaultProvider:
        (process.env.AI_DEFAULT_PROVIDER as
          | 'cloudflare'
          | 'openai'
          | 'ollama') || 'cloudflare',
      providers: {},
    };

    // Cloudflare Workers AI configuration
    if (process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_ACCOUNT_ID) {
      if (!config.providers) {
        config.providers = {};
      }
      config.providers.cloudflare = {
        apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
        baseUrl: process.env.CLOUDFLARE_API_BASE_URL,
        model:
          process.env.CLOUDFLARE_DEFAULT_MODEL ||
          '@cf/meta/llama-3.1-8b-instruct',
      };
    }

    // OpenAI configuration
    if (process.env.OPENAI_API_KEY) {
      if (!config.providers) {
        config.providers = {};
      }
      config.providers.openai = {
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: process.env.OPENAI_BASE_URL,
        model: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4',
      };
    }

    // Ollama configuration
    if (process.env.OLLAMA_BASE_URL) {
      if (!config.providers) {
        config.providers = {};
      }
      config.providers.ollama = {
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        model: process.env.OLLAMA_DEFAULT_MODEL || 'llama3.1',
      };
    }

    return new AIConfigManager(config);
  }

  /**
   * Load configuration from a file
   */
  static async fromFile(filePath: string): Promise<AIConfigManager> {
    try {
      const fs = await import('node:fs/promises');
      const configData = await fs.readFile(filePath, 'utf-8');
      const config = JSON.parse(configData) as Partial<AIConfig>;
      return new AIConfigManager(config);
    } catch (error) {
      throw new Error(`Failed to load AI config from ${filePath}: ${error}`);
    }
  }

  /**
   * Save configuration to a file
   */
  async saveToFile(filePath: string): Promise<void> {
    try {
      const fs = await import('node:fs/promises');
      const configData = JSON.stringify(this.config, null, 2);
      await fs.writeFile(filePath, configData, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save AI config to ${filePath}: ${error}`);
    }
  }

  /**
   * Validate configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if default provider is configured
    const defaultProvider = this.config.defaultProvider;
    if (!this.config.providers[defaultProvider]) {
      errors.push(`Default provider '${defaultProvider}' is not configured`);
    }

    // Validate Cloudflare config
    const cloudflareConfig = this.config.providers.cloudflare;
    if (cloudflareConfig) {
      if (!cloudflareConfig.apiToken) {
        errors.push('Cloudflare API token is required');
      }
      if (!cloudflareConfig.accountId) {
        errors.push('Cloudflare account ID is required');
      }
    }

    // Validate OpenAI config
    const openaiConfig = this.config.providers.openai;
    if (openaiConfig && !openaiConfig.apiKey) {
      errors.push('OpenAI API key is required');
    }

    // Validate Ollama config
    const ollamaConfig = this.config.providers.ollama;
    if (ollamaConfig && !ollamaConfig.baseUrl) {
      errors.push('Ollama base URL is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get default configuration
   */
  private getDefaults(): AIConfig {
    return {
      defaultProvider: 'cloudflare',
      providers: {
        cloudflare: {
          apiToken: '',
          accountId: '',
          baseUrl: 'https://api.cloudflare.com/client/v4/accounts',
          model: '@cf/meta/llama-3.1-8b-instruct',
        },
      },
      services: {
        codeAnalyzer: {
          enabled: true,
          maxFileSize: 1024 * 1024, // 1MB
          supportedExtensions: [
            '.js',
            '.ts',
            '.jsx',
            '.tsx',
            '.vue',
            '.svelte',
            '.py',
            '.rb',
            '.go',
            '.rs',
            '.java',
            '.kt',
            '.php',
            '.cs',
            '.cpp',
            '.c',
            '.h',
            '.hpp',
            '.swift',
            '.dart',
            '.scala',
            '.clj',
            '.elm',
          ],
          analysisTimeout: 60000, // 60 seconds
        },
        changelogGenerator: {
          enabled: true,
          defaultFormat: 'markdown',
          includeBreaking: true,
          groupByType: true,
        },
      },
      cache: {
        enabled: true,
        ttl: 3600000, // 1 hour
        maxSize: 100, // 100 entries
      },
    };
  }

  /**
   * Merge configuration with defaults
   */
  private mergeWithDefaults(
    config: Partial<AIConfig>,
    existing?: AIConfig,
  ): AIConfig {
    const defaults = existing || this.getDefaults();

    return {
      defaultProvider: config.defaultProvider || defaults.defaultProvider,
      providers: {
        ...defaults.providers,
        ...config.providers,
      },
      services: {
        codeAnalyzer: {
          ...defaults.services.codeAnalyzer,
          ...config.services?.codeAnalyzer,
        },
        changelogGenerator: {
          ...defaults.services.changelogGenerator,
          ...config.services?.changelogGenerator,
        },
      },
      cache: {
        ...defaults.cache,
        ...config.cache,
      },
    };
  }
}

/**
 * Default AI configuration instance
 */
export const defaultAIConfig = AIConfigManager.getInstance();

/**
 * Create AI configuration from environment
 */
export const createAIConfigFromEnv = () => AIConfigManager.fromEnvironment();

/**
 * Helper function to get provider config
 */
export function getProviderConfig(
  provider?: 'cloudflare' | 'openai' | 'ollama',
): CloudflareConfig | OpenAIConfig | OllamaConfig {
  const configManager = AIConfigManager.getInstance();

  if (provider) {
    const config = configManager.getProviderConfig(provider);
    if (!config) {
      throw new Error(`Provider '${provider}' is not configured`);
    }
    return config;
  }

  return configManager.getDefaultProviderConfig();
}
