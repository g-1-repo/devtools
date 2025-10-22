# @g-1/util

[![npm version](https://badge.fury.io/js/@g-1%2Futil.svg)](https://badge.fury.io/js/@g-1%2Futil)
[![npm downloads](https://img.shields.io/npm/dm/@g-1/util.svg)](https://www.npmjs.com/package/@g-1/util)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@g-1/util?label=bundle%20size)](https://bundlephobia.com/package/@g-1/util)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/g-1-repo/util/workflows/CI/badge.svg)](https://github.com/g-1-repo/util/actions)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

G1 Shared Utilities. The centralized library for common G1 business logic and utilities.

## Installation

```bash
npm install @g-1/util
# or
yarn add @g-1/util
# or
bun add @g-1/util
```

## Usage

```typescript
import { deepClone, formatDate, toCamelCase } from '@g-1/util'

// String utilities
const camelCased = toCamelCase('hello world') // 'helloWorld'

// Date utilities
const formatted = formatDate(new Date(), 'medium') // 'Jan 1, 2024'

// Object utilities
const cloned = deepClone({ a: { b: 1 } })
```

## API Documentation

### String Utilities

- `toCamelCase(str: string): string` - Converts string to camelCase
- `toKebabCase(str: string): string` - Converts string to kebab-case
- `toSnakeCase(str: string): string` - Converts string to snake_case
- `toPascalCase(str: string): string` - Converts string to PascalCase
- `truncate(str: string, length: number, suffix?: string): string` - Truncates string to specified length
- `capitalize(str: string): string` - Capitalizes first letter
- `slugify(str: string): string` - Creates URL-friendly slugs
- `generateRandomString(length: number, charset?: string): string` - Generates random string
- `removeWhitespace(str: string): string` - Removes all whitespace

### Date Utilities

- `formatDate(date: Date, format?: 'short' | 'medium' | 'long' | 'iso'): string` - Formats date
- `daysBetween(date1: Date, date2: Date): number` - Days between two dates
- `isToday(date: Date): boolean` - Checks if date is today
- `isThisWeek(date: Date): boolean` - Checks if date is this week
- `addDays(date: Date, days: number): Date` - Adds days to date
- `addMonths(date: Date, months: number): Date` - Adds months to date
- `startOfDay(date: Date): Date` - Gets start of day
- `endOfDay(date: Date): Date` - Gets end of day
- `getRelativeTime(date: Date, baseDate?: Date): string` - Gets relative time string

### Object Utilities

- `deepClone<T>(obj: T): T` - Deep clones object
- `omit<T, K>(obj: T, keys: K[]): Omit<T, K>` - Omits keys from object
- `pick<T, K>(obj: T, keys: K[]): Pick<T, K>` - Picks keys from object
- `isEmpty(obj: any): boolean` - Checks if object is empty

### Array Utilities

- `unique<T>(array: T[]): T[]` - Removes duplicate values
- `groupBy<T, K>(array: T[], keyFn: (item: T) => K): Record<K, T[]>` - Groups array items by key
- `chunk<T>(array: T[], size: number): T[][]` - Chunks array into smaller arrays
- `shuffle<T>(array: T[]): T[]` - Shuffles array randomly

### Validation Utilities

- `isValidEmail(email: string): boolean` - Validates email address
- `isValidUrl(url: string): boolean` - Validates URL
- `isValidPhone(phone: string): boolean` - Validates phone number (US format)
- `isValidUUID(uuid: string): boolean` - Validates UUID

### Async Utilities

- `delay(ms: number): Promise<void>` - Creates a delay/sleep function
- `debounce<T>(func: T, wait: number): (...args: Parameters<T>) => void` - Debounces function
- `throttle<T>(func: T, wait: number): (...args: Parameters<T>) => void` - Throttles function
- `retry<T>(fn: () => Promise<T>, maxAttempts?: number, baseDelay?: number): Promise<T>` - Retries async function with exponential backoff

### Type Utilities

- `isNotNull<T>(value: T | null | undefined): value is T` - Type guard for non-null values
- `isString(value: unknown): value is string` - Type guard for strings
- `isNumber(value: unknown): value is number` - Type guard for numbers
- `isBoolean(value: unknown): value is boolean` - Type guard for booleans
- `isArray<T>(value: unknown): value is T[]` - Type guard for arrays
- `isObject(value: unknown): value is Record<string, unknown>` - Type guard for plain objects
- `isFunction(value: unknown): value is Function` - Type guard for functions

### Math Utilities

- `clamp(value: number, min: number, max: number): number` - Clamps number between min/max
- `randomBetween(min: number, max: number): number` - Random number between min/max
- `roundTo(value: number, decimals: number): number` - Rounds to specified decimals
- `percentage(value: number, total: number): number` - Calculates percentage
- `degToRad(degrees: number): number` - Converts degrees to radians
- `radToDeg(radians: number): number` - Converts radians to degrees

### Web Utilities

- `getQueryParams(url: string): Record<string, string>` - Gets URL query parameters
- `formatBytes(bytes: number, decimals?: number): string` - Formats bytes to human readable
- `copyToClipboard(text: string): Promise<boolean>` - Copies text to clipboard

### Debug Utilities

- `createTimer(label?: string)` - Creates a performance timer
- `logWithTime(message: string, ...args: any[]): void` - Logs with timestamp
- `prettyPrint(obj: any, indent?: number): void` - Pretty prints object
- `measureTime<T>(fn: () => T | Promise<T>, label?: string): Promise<{ result: T; duration: number }>` - Measures function execution time

### Node.js Utilities (Server-side only)

#### Git & Repository Management
- `getCurrentBranch(): string` - Get current Git branch
- `hasUncommittedChanges(): boolean` - Check for uncommitted changes
- `getChangedFiles(): string[]` - Get list of changed files
- `getRecentCommits(count?: number): string[]` - Get recent commit messages
- `incrementVersion(version: string, type: 'major' | 'minor' | 'patch'): string` - Increment version string
- `getCurrentVersion(packagePath?: string): string` - Get version from package.json
- `updatePackageVersion(newVersion: string, packagePath?: string): void` - Update package.json version
- `analyzeChangesForVersionBump(): VersionAnalysis` - Analyze changes for version bump
- `updateChangelog(version: string, changeType: string, changesList: string[]): void` - Update CHANGELOG.md
- `commitAndPush(message: string, push?: boolean): void` - Create and push git commit
- `isGitRepository(): boolean` - Check if in a git repository
- `exec(command: string, options?: ExecOptions): string` - Execute shell command
- `log(message: string, color?: string): void` - Log with color
- `COLORS` - Terminal color constants

#### CLI Prompts & Interaction
- `text(options: PromptOptions): Promise<string>` - Simple text prompt
- `confirm(options: ConfirmOptions): Promise<boolean>` - Yes/no confirmation
- `select<T>(options: SelectOptions<T>): Promise<T>` - Select from options
- `multiselect<T>(options: MultiSelectOptions<T>): Promise<T[]>` - Multi-select from options
- `password(options: PromptOptions): Promise<string>` - Hidden password input
- `ProgressIndicator` - Animated progress indicator class

## Development

```bash
# Install dependencies
bun install

# Run tests
bun run test

# Build
bun run build

# Type check
bun run type-check

# Lint
bun run lint
```

## MCP Server Integration

@g-1/util includes an MCP (Model Context Protocol) server that automatically provides AI assistants with context about your utilities.

### Setup

1. Install the package:
```bash
npm install @g-1/util
```

2. Configure Warp MCP in your terminal settings:
```json
{
  "mcpServers": {
    "g1-util": {
      "command": "g1-util-mcp"
    }
  }
}
```

3. The AI will now automatically know when `@g-1/util` is available and suggest relevant utilities!

### What the AI Will Know
- ✅ Which utilities are available in your project
- 📋 Detailed function signatures and usage examples
- 🎯 When to suggest specific utilities
- 🚀 Import statements and code examples
- 💡 Perfect use cases for different scenarios

See `mcp-server/README.md` for detailed setup instructions.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT © G1
