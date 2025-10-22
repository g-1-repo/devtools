import { createInterface } from 'node:readline'

/**
 * Options for prompts
 */
export interface PromptOptions {
  message: string
  default?: string
  required?: boolean
}

/**
 * Options for select prompts
 */
export interface SelectOption<T = any> {
  value: T
  label: string
  hint?: string
}

export interface SelectOptions<T = any> {
  message: string
  options: SelectOption<T>[]
  default?: T
}

/**
 * Options for multiselect prompts
 */
export interface MultiSelectOptions<T = any> {
  message: string
  options: SelectOption<T>[]
  initialValues?: T[]
  required?: boolean
}

/**
 * Options for confirm prompts
 */
export interface ConfirmOptions {
  message: string
  default?: boolean
}

/**
 * Simple text prompt
 */
export async function text(options: PromptOptions): Promise<string> {
  const rl = createInterface({
    input: process.stdin as NodeJS.ReadableStream,
    output: process.stdout as NodeJS.WritableStream,
  })

  const defaultText = options.default ? ` (${options.default})` : ''
  const prompt = `${options.message}${defaultText}: `

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close()
      const result = answer.trim() || options.default || ''

      if (options.required && !result) {
        console.log('❌ This field is required')
        text(options).then(resolve)
        return
      }

      resolve(result)
    })
  })
}

/**
 * Confirmation prompt (y/N)
 */
export async function confirm(options: ConfirmOptions): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin as NodeJS.ReadableStream,
    output: process.stdout as NodeJS.WritableStream,
  })

  const defaultText = options.default !== undefined
    ? (options.default ? ' (Y/n)' : ' (y/N)')
    : ' (y/n)'
  const prompt = `${options.message}${defaultText}: `

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close()
      const trimmed = answer.trim().toLowerCase()

      if (!trimmed && options.default !== undefined) {
        resolve(options.default)
        return
      }

      if (trimmed === 'y' || trimmed === 'yes') {
        resolve(true)
      }
      else if (trimmed === 'n' || trimmed === 'no') {
        resolve(false)
      }
      else {
        console.log('❌ Please answer y/yes or n/no')
        confirm(options).then(resolve)
      }
    })
  })
}

/**
 * Select from options
 */
export async function select<T>(options: SelectOptions<T>): Promise<T> {
  console.log(`\n${options.message}`)

  options.options.forEach((option, index) => {
    const prefix = options.default === option.value ? '>' : ' '
    const hint = option.hint ? ` (${option.hint})` : ''
    console.log(`${prefix} ${index + 1}. ${option.label}${hint}`)
  })

  const rl = createInterface({
    input: process.stdin as NodeJS.ReadableStream,
    output: process.stdout as NodeJS.WritableStream,
  })

  return new Promise((resolve) => {
    const askForChoice = () => {
      rl.question('\nSelect an option (number): ', (answer) => {
        const choice = Number.parseInt(answer.trim())

        if (Number.isNaN(choice) || choice < 1 || choice > options.options.length) {
          console.log('❌ Invalid choice. Please select a valid number.')
          return askForChoice()
        }

        rl.close()
        resolve(options.options[choice - 1]!.value)
      })
    }

    askForChoice()
  })
}

/**
 * Multi-select from options
 */
export async function multiselect<T>(options: MultiSelectOptions<T>): Promise<T[]> {
  console.log(`\n${options.message}`)
  console.log('(Use comma-separated numbers, e.g., 1,3,5)')

  const initialSet = new Set(options.initialValues || [])

  options.options.forEach((option, index) => {
    const prefix = initialSet.has(option.value) ? '✓' : ' '
    const hint = option.hint ? ` (${option.hint})` : ''
    console.log(`${prefix} ${index + 1}. ${option.label}${hint}`)
  })

  const rl = createInterface({
    input: process.stdin as NodeJS.ReadableStream,
    output: process.stdout as NodeJS.WritableStream,
  })

  return new Promise((resolve) => {
    const askForChoices = () => {
      const defaultHint = options.initialValues && options.initialValues.length > 0
        ? ` (default: ${options.initialValues.map((_, i) => i + 1).join(',')})`
        : ''

      rl.question(`\nSelect options${defaultHint}: `, (answer) => {
        const trimmed = answer.trim()

        // Use default if no input and defaults exist
        if (!trimmed && options.initialValues && options.initialValues.length > 0) {
          rl.close()
          resolve(options.initialValues)
          return
        }

        if (!trimmed && options.required) {
          console.log('❌ Please select at least one option')
          return askForChoices()
        }

        if (!trimmed) {
          rl.close()
          resolve([])
          return
        }

        const choices = trimmed.split(',')
          .map(c => Number.parseInt(c.trim()))
          .filter(c => !Number.isNaN(c) && c >= 1 && c <= options.options.length)

        if (choices.length === 0) {
          console.log('❌ No valid choices selected')
          return askForChoices()
        }

        rl.close()
        resolve(choices.map(choice => options.options[choice - 1]!.value))
      })
    }

    askForChoices()
  })
}

/**
 * Password prompt (hidden input)
 */
export async function password(options: PromptOptions): Promise<string> {
  const rl = createInterface({
    input: process.stdin as NodeJS.ReadableStream,
    output: process.stdout as NodeJS.WritableStream,
  })

  // Hide input
  const stdin = process.stdin
  if (stdin.setRawMode) {
    stdin.setRawMode(true)
  }

  return new Promise((resolve) => {
    console.log(`${options.message}: `)
    let passwordValue = ''

    const onData = (char: Uint8Array) => {
      const key = char.toString()

      if (key === '\n' || key === '\r' || key === '\u0004') {
        // Enter or Ctrl+D
        if (stdin.setRawMode) {
          stdin.setRawMode(false)
        }
        stdin.removeListener('data', onData)
        rl.close()
        console.log() // New line

        if (options.required && !passwordValue) {
          console.log('❌ Password is required')
          password(options).then(resolve)
          return
        }

        resolve(passwordValue || options.default || '')
      }
      else if (key === '\u0003') {
        // Ctrl+C
        process.exit(1)
      }
      else if (key === '\u007F' || key === '\u0008') {
        // Backspace
        if (passwordValue.length > 0) {
          passwordValue = passwordValue.slice(0, -1)
          process.stdout.write('\b \b')
        }
      }
      else if (key.charCodeAt(0) >= 32) {
        // Printable character
        passwordValue += key
        process.stdout.write('*')
      }
    }

    stdin.on('data', onData)
  })
}

/**
 * Progress indicator
 */
export class ProgressIndicator {
  private interval?: NodeJS.Timeout | undefined
  private frame = 0
  private readonly frames = ['⠃', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

  constructor(private message: string) {}

  start(): void {
    process.stdout.write(`${this.message} ${this.frames[0]}`)

    this.interval = setInterval(() => {
      process.stdout.write(`\r${this.message} ${this.frames[this.frame]}`)
      this.frame = (this.frame + 1) % this.frames.length
    }, 100)
  }

  stop(finalMessage?: string): void {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = undefined
    }

    process.stdout.write(`\r${finalMessage || this.message} ✓\n`)
  }

  update(message: string): void {
    this.message = message
  }
}
