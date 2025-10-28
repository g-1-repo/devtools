// Database adapters and types
export {
  createDatabaseAdapter,
  D1DatabaseAdapter,
  type DatabaseAdapter,
  DrizzleD1Adapter,
  DrizzleSqliteAdapter,
  detectBestDatabaseProvider,
  MemoryDatabaseAdapter,
  SqliteDatabaseAdapter,
} from './adapters/index.js'

// Smart data factory
export {
  createSeededFactory,
  type FactoryConfig,
  type FactoryFunction,
  factory,
  TestDataFactory,
  type TestDataGenerators,
  TestDataSequence,
} from './factory.js'

// Test store management
export {
  AutoCleanup,
  cleanupAllTestStores,
  clearTestStore,
  createAutoCleanup,
  createScopedTestData,
  getTestStore,
  type IsolationLevel,
  ScopedTestData,
  TestDataLifecycle,
  TestDataStore,
  type TestStore,
  testLifecycle,
} from './store.js'
// Environment utilities
export {
  createOptimizedTestConfig,
  detectDatabaseProvider,
  detectRuntime,
  ensureEnv,
  getEnv,
  getEnvironmentInfo,
  getMemoryUsage,
  getRuntimeCapabilities,
  getTestConfig,
  hasEnv,
  isCIEnvironment,
  isTestEnvironment,
  PerformanceMonitor,
  performanceMonitor,
  setEnv,
  setupRuntimeSpecificTests,
  setupTestEnvironment as setupEnv,
} from './utils/environment.js'
// Enhanced HTTP test client
export {
  createHttpTestClient,
  type HttpClientOptions,
  HttpTestClient,
} from './utils/http-client.js'

// Vitest integration
export {
  concurrentTest,
  configureVitest,
  createTestBuilder,
  createTestContext,
  dbTest,
  factoryTest,
  httpTest,
  perfTest,
  retryTest,
  setupTestFramework,
  snapshotTest,
  TestBuilder,
  testSuite,
  testWithContext,
  timeTest,
} from './vitest/index.js'

// CLI Test Runner (conditionally exported - only in Node.js/Bun environments)
// Note: Excluded from Workers runtime to avoid Node.js dependency issues

// Core testing utilities (legacy exports for compatibility)
export {
  createTestContext as createLegacyTestContext,
  getCookieJarKeys,
  postJSON,
  requestJSON,
  requestWithCookies,
  resetCookies,
  uniqueEmail,
  uniqueUsername,
  wait,
} from './core.js'

// Email testing utilities (legacy exports)
export {
  assertEmailSent,
  assertNoEmailSent,
  clearOutbox,
  extractOTPCode,
  extractVerificationLink,
  getEmailsFor,
  getLastEmail,
  getOutbox,
  waitForEmail,
} from './email.js'

// Test setup utilities (legacy exports)
export {
  createTimeMock,
  ensureTestEnv,
  MockTime,
  setupCloudflareWorkerTests,
  setupTestEnvironment,
  withTestEnv,
} from './setup.js'

// Type exports
export type {
  DatabaseProvider,
  HonoApp,
  Runtime,
  TestEmail,
  TestEnvironmentConfig,
  TestRequestOptions,
  TestResponse,
  TestRunnerConfig,
  TestSetupOptions,
  TestSuiteConfig,
  VitestConfig,
} from './types.js'
