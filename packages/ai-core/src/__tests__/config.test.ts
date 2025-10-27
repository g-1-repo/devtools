/**
 * Tests for AI Configuration Management
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  AIConfigManager,
  createAIConfigFromEnv,
  defaultAIConfig,
  getProviderConfig,
} from '../config/ai-config.js';
import type {
  CloudflareConfig,
  OllamaConfig,
  OpenAIConfig,
} from '../types/index.js';

describe('AIConfigManager', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Clear environment variables
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OLLAMA_BASE_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
    // Reset singleton instance
    AIConfigManager.resetInstance();
  });

  describe('getInstance', () => {
    it('should create singleton instance', () => {
      const instance1 = AIConfigManager.getInstance();
      const instance2 = AIConfigManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should create instance with custom config', () => {
      const customConfig = {
        defaultProvider: 'openai' as const,
        providers: {
          openai: {
            apiKey: 'test-key',
            model: 'gpt-4',
          },
        },
      };
      const instance = AIConfigManager.getInstance(customConfig);
      const config = instance.getConfig();
      expect(config.defaultProvider).toBe('openai');
      expect(config.providers.openai?.apiKey).toBe('test-key');
    });
  });

  describe('getProviderConfig', () => {
    it('should return cloudflare config when available', () => {
      const config = {
        providers: {
          cloudflare: {
            apiToken: 'test-token',
            accountId: 'test-account',
            model: '@cf/meta/llama-3.1-8b-instruct',
          },
        },
      };
      const instance = AIConfigManager.getInstance(config);
      const providerConfig = instance.getProviderConfig('cloudflare');
      expect(providerConfig).toEqual(config.providers.cloudflare);
    });

    it('should return undefined for non-existent provider', () => {
      const instance = AIConfigManager.getInstance();
      const providerConfig = instance.getProviderConfig('openai');
      expect(providerConfig).toBeUndefined();
    });
  });

  describe('getDefaultProviderConfig', () => {
    it('should return default cloudflare config', () => {
      const instance = AIConfigManager.getInstance();
      const defaultConfig = instance.getDefaultProviderConfig();
      expect(defaultConfig).toEqual({
        apiToken: '',
        accountId: '',
        baseUrl: 'https://api.cloudflare.com/client/v4/accounts',
        model: '@cf/meta/llama-3.1-8b-instruct',
      });
    });

    it('should return configured provider config when available', () => {
      const config = {
        defaultProvider: 'openai' as const,
        providers: {
          openai: {
            apiKey: 'test-key',
            model: 'gpt-4',
          },
        },
      };
      const instance = AIConfigManager.getInstance(config);
      const defaultConfig = instance.getDefaultProviderConfig();
      expect(defaultConfig).toEqual(config.providers.openai);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const instance = AIConfigManager.getInstance();
      const updates = {
        defaultProvider: 'openai' as const,
        providers: {
          openai: {
            apiKey: 'new-key',
            model: 'gpt-4',
          },
        },
      };
      instance.updateConfig(updates);
      const config = instance.getConfig();
      expect(config.defaultProvider).toBe('openai');
      expect(config.providers.openai?.apiKey).toBe('new-key');
    });
  });

  describe('updateProviderConfig', () => {
    it('should update cloudflare provider config', () => {
      const instance = AIConfigManager.getInstance();
      const updates = {
        apiToken: 'new-token',
        accountId: 'new-account',
      };
      instance.updateProviderConfig('cloudflare', updates);
      const config = instance.getProviderConfig(
        'cloudflare',
      ) as CloudflareConfig;
      expect(config.apiToken).toBe('new-token');
      expect(config.accountId).toBe('new-account');
    });

    it('should update openai provider config', () => {
      const instance = AIConfigManager.getInstance();
      const updates = {
        apiKey: 'new-key',
        model: 'gpt-3.5-turbo',
      };
      instance.updateProviderConfig('openai', updates);
      const config = instance.getProviderConfig('openai') as OpenAIConfig;
      expect(config.apiKey).toBe('new-key');
      expect(config.model).toBe('gpt-3.5-turbo');
    });
  });

  describe('fromEnvironment', () => {
    it('should create config from cloudflare environment variables', () => {
      process.env.CLOUDFLARE_API_TOKEN = 'env-token';
      process.env.CLOUDFLARE_ACCOUNT_ID = 'env-account';
      process.env.CLOUDFLARE_DEFAULT_MODEL = '@cf/meta/llama-3.1-70b-instruct';

      const instance = AIConfigManager.fromEnvironment();
      const config = instance.getProviderConfig(
        'cloudflare',
      ) as CloudflareConfig;
      expect(config.apiToken).toBe('env-token');
      expect(config.accountId).toBe('env-account');
      expect(config.model).toBe('@cf/meta/llama-3.1-70b-instruct');
    });

    it('should create config from openai environment variables', () => {
      process.env.OPENAI_API_KEY = 'env-key';
      process.env.OPENAI_DEFAULT_MODEL = 'gpt-4-turbo';

      const instance = AIConfigManager.fromEnvironment();
      const config = instance.getProviderConfig('openai') as OpenAIConfig;
      expect(config.apiKey).toBe('env-key');
      expect(config.model).toBe('gpt-4-turbo');
    });

    it('should create config from ollama environment variables', () => {
      process.env.OLLAMA_BASE_URL = 'http://localhost:11434';
      process.env.OLLAMA_DEFAULT_MODEL = 'llama3.1:70b';

      const instance = AIConfigManager.fromEnvironment();
      const config = instance.getProviderConfig('ollama') as OllamaConfig;
      expect(config.baseUrl).toBe('http://localhost:11434');
      expect(config.model).toBe('llama3.1:70b');
    });
  });

  describe('validate', () => {
    it('should validate valid configuration', () => {
      const config = {
        defaultProvider: 'cloudflare' as const,
        providers: {
          cloudflare: {
            apiToken: 'test-token',
            accountId: 'test-account',
            model: '@cf/meta/llama-3.1-8b-instruct',
          },
        },
      };
      const instance = AIConfigManager.getInstance(config);
      const validation = instance.validate();
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing provider configuration', () => {
      const config = {
        defaultProvider: 'openai' as const,
        providers: {},
      };
      const instance = AIConfigManager.getInstance(config);
      const validation = instance.validate();
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        "Default provider 'openai' is not configured",
      );
    });

    it('should detect missing required fields', () => {
      const config = {
        defaultProvider: 'cloudflare' as const,
        providers: {
          cloudflare: {
            apiToken: '',
            accountId: '',
            model: '@cf/meta/llama-3.1-8b-instruct',
          },
        },
      };
      const instance = AIConfigManager.getInstance(config);
      const validation = instance.validate();
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Cloudflare API token is required');
      expect(validation.errors).toContain('Cloudflare account ID is required');
    });
  });
});

describe('defaultAIConfig', () => {
  it('should provide default configuration instance', () => {
    expect(defaultAIConfig).toBeInstanceOf(AIConfigManager);
    const config = defaultAIConfig.getConfig();
    expect(config.defaultProvider).toBe('cloudflare');
  });
});

describe('createAIConfigFromEnv', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should create config from environment variables', () => {
    process.env.CLOUDFLARE_API_TOKEN = 'env-token';
    process.env.CLOUDFLARE_ACCOUNT_ID = 'env-account';

    const instance = createAIConfigFromEnv();
    const config = instance.getProviderConfig('cloudflare') as CloudflareConfig;
    expect(config.apiToken).toBe('env-token');
    expect(config.accountId).toBe('env-account');
  });
});

describe('getProviderConfig', () => {
  beforeEach(() => {
    // Reset the singleton instance before each test
    AIConfigManager.resetInstance();
  });

  it('should return default provider config when no provider specified', () => {
    const config = getProviderConfig();
    expect(config).toEqual({
      apiToken: '',
      accountId: '',
      baseUrl: 'https://api.cloudflare.com/client/v4/accounts',
      model: '@cf/meta/llama-3.1-8b-instruct',
    });
  });

  it('should return specific provider config when specified', () => {
    const _instance = AIConfigManager.getInstance({
      defaultProvider: 'openai',
      providers: {
        openai: {
          apiKey: 'test-key',
          model: 'gpt-4',
        },
      },
    });

    const config = getProviderConfig('openai');
    expect(config).toEqual({
      apiKey: 'test-key',
      model: 'gpt-4',
    });
  });
});
