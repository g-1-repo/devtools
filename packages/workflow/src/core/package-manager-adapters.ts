import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { type MonorepoType, PackageManager } from './monorepo-detector'

export interface PackageManagerAdapter {
  install(options?: InstallOptions): Promise<void>
  build(packages?: string[], options?: BuildOptions): Promise<void>
  test(packages?: string[], options?: TestOptions): Promise<void>
  run(script: string, packages?: string[], options?: RunOptions): Promise<void>
  getWorkspacePackages(): Promise<string[]>
  getPackageInfo(packageName: string): Promise<any>
}

export interface InstallOptions {
  frozen?: boolean
  production?: boolean
  cwd?: string
}

export interface BuildOptions {
  parallel?: boolean
  since?: string
  scope?: string[]
  ignore?: string[]
  cwd?: string
}

export interface TestOptions {
  parallel?: boolean
  since?: string
  scope?: string[]
  ignore?: string[]
  coverage?: boolean
  cwd?: string
}

export interface RunOptions {
  parallel?: boolean
  since?: string
  scope?: string[]
  ignore?: string[]
  cwd?: string
}

export function createPackageManagerAdapter(
  monorepoType: MonorepoType,
  packageManager: PackageManager,
  rootPath: string
): PackageManagerAdapter {
  switch (monorepoType) {
    case 'lerna':
      return new LernaAdapter(rootPath, packageManager)
    case 'nx':
      return new NxAdapter(rootPath, packageManager)
    case 'yarn-workspaces':
      return new YarnWorkspacesAdapter(rootPath)
    case 'pnpm-workspaces':
      return new PnpmWorkspacesAdapter(rootPath)
    case 'rush':
      return new RushAdapter(rootPath)
    case 'single-package':
      return new SinglePackageAdapter(rootPath, packageManager)
    default:
      throw new Error(`Unsupported monorepo type: ${monorepoType}`)
  }
}

export class LernaAdapter implements PackageManagerAdapter {
  constructor(
    private rootPath: string,
    private packageManager: PackageManager
  ) {}

  async install(options: InstallOptions = {}): Promise<void> {
    const cmd =
      this.packageManager === PackageManager.NPM ? 'npm ci' : `${this.packageManager} install`
    const flags = options.frozen ? '--frozen-lockfile' : ''

    await this.exec(`${cmd} ${flags}`, options.cwd)
  }

  async build(packages: string[] = [], options: BuildOptions = {}): Promise<void> {
    let cmd = 'npx lerna run build'

    if (packages.length > 0) {
      cmd += ` --scope=${packages.join(' --scope=')}`
    }

    if (options.since) {
      cmd += ` --since=${options.since}`
    }

    if (options.parallel) {
      cmd += ' --parallel'
    }

    await this.exec(cmd, options.cwd)
  }

  async test(packages: string[] = [], options: TestOptions = {}): Promise<void> {
    let cmd = 'npx lerna run test'

    if (packages.length > 0) {
      cmd += ` --scope=${packages.join(' --scope=')}`
    }

    if (options.since) {
      cmd += ` --since=${options.since}`
    }

    if (options.parallel) {
      cmd += ' --parallel'
    }

    await this.exec(cmd, options.cwd)
  }

  async run(script: string, packages: string[] = [], options: RunOptions = {}): Promise<void> {
    let cmd = `npx lerna run ${script}`

    if (packages.length > 0) {
      cmd += ` --scope=${packages.join(' --scope=')}`
    }

    if (options.since) {
      cmd += ` --since=${options.since}`
    }

    if (options.parallel) {
      cmd += ' --parallel'
    }

    await this.exec(cmd, options.cwd)
  }

  async getWorkspacePackages(): Promise<string[]> {
    const output = await this.exec('npx lerna list --json', undefined, true)
    const packages = JSON.parse(output)
    return packages.map((pkg: any) => pkg.name)
  }

  async getPackageInfo(packageName: string): Promise<any> {
    const output = await this.exec(`npx lerna list --json --scope=${packageName}`, undefined, true)
    const packages = JSON.parse(output)
    return packages[0] || null
  }

  private async exec(command: string, cwd?: string, returnOutput = false): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', command], {
        cwd: cwd || this.rootPath,
        stdio: returnOutput ? 'pipe' : 'inherit',
      })

      let output = ''

      if (returnOutput) {
        child.stdout?.on('data', (data) => {
          output += data.toString()
        })
      }

      child.on('close', (code) => {
        if (code === 0) {
          resolve(output)
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${command}`))
        }
      })

      child.on('error', reject)
    })
  }
}

export class NxAdapter implements PackageManagerAdapter {
  constructor(
    private rootPath: string,
    private packageManager: PackageManager
  ) {}

  async install(options: InstallOptions = {}): Promise<void> {
    const cmd =
      this.packageManager === PackageManager.NPM ? 'npm ci' : `${this.packageManager} install`
    await this.exec(cmd, options.cwd)
  }

  async build(packages: string[] = [], options: BuildOptions = {}): Promise<void> {
    if (packages.length === 0) {
      await this.exec('npx nx run-many --target=build --all', options.cwd)
    } else {
      const projects = packages.join(',')
      await this.exec(`npx nx run-many --target=build --projects=${projects}`, options.cwd)
    }
  }

  async test(packages: string[] = [], options: TestOptions = {}): Promise<void> {
    if (packages.length === 0) {
      await this.exec('npx nx run-many --target=test --all', options.cwd)
    } else {
      const projects = packages.join(',')
      await this.exec(`npx nx run-many --target=test --projects=${projects}`, options.cwd)
    }
  }

  async run(script: string, packages: string[] = [], options: RunOptions = {}): Promise<void> {
    if (packages.length === 0) {
      await this.exec(`npx nx run-many --target=${script} --all`, options.cwd)
    } else {
      const projects = packages.join(',')
      await this.exec(`npx nx run-many --target=${script} --projects=${projects}`, options.cwd)
    }
  }

  async getWorkspacePackages(): Promise<string[]> {
    const output = await this.exec('npx nx show projects', undefined, true)
    return output.trim().split('\n').filter(Boolean)
  }

  async getPackageInfo(packageName: string): Promise<any> {
    try {
      const output = await this.exec(`npx nx show project ${packageName} --json`, undefined, true)
      return JSON.parse(output)
    } catch (error) {
      return null
    }
  }

  private async exec(command: string, cwd?: string, returnOutput = false): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', command], {
        cwd: cwd || this.rootPath,
        stdio: returnOutput ? 'pipe' : 'inherit',
      })

      let output = ''

      if (returnOutput) {
        child.stdout?.on('data', (data) => {
          output += data.toString()
        })
      }

      child.on('close', (code) => {
        if (code === 0) {
          resolve(output)
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${command}`))
        }
      })

      child.on('error', reject)
    })
  }
}

export class YarnWorkspacesAdapter implements PackageManagerAdapter {
  constructor(private rootPath: string) {}

  async install(options: InstallOptions = {}): Promise<void> {
    const cmd = options.frozen ? 'yarn install --frozen-lockfile' : 'yarn install'
    await this.exec(cmd, options.cwd)
  }

  async build(packages: string[] = [], options: BuildOptions = {}): Promise<void> {
    if (packages.length === 0) {
      await this.exec('yarn workspaces run build', options.cwd)
    } else {
      for (const pkg of packages) {
        await this.exec(`yarn workspace ${pkg} run build`, options.cwd)
      }
    }
  }

  async test(packages: string[] = [], options: TestOptions = {}): Promise<void> {
    if (packages.length === 0) {
      await this.exec('yarn workspaces run test', options.cwd)
    } else {
      for (const pkg of packages) {
        await this.exec(`yarn workspace ${pkg} run test`, options.cwd)
      }
    }
  }

  async run(script: string, packages: string[] = [], options: RunOptions = {}): Promise<void> {
    if (packages.length === 0) {
      await this.exec(`yarn workspaces run ${script}`, options.cwd)
    } else {
      for (const pkg of packages) {
        await this.exec(`yarn workspace ${pkg} run ${script}`, options.cwd)
      }
    }
  }

  async getWorkspacePackages(): Promise<string[]> {
    const output = await this.exec('yarn workspaces info --json', undefined, true)
    const workspaces = JSON.parse(output)
    return Object.keys(workspaces)
  }

  async getPackageInfo(packageName: string): Promise<any> {
    try {
      const output = await this.exec('yarn workspaces info --json', undefined, true)
      const workspaces = JSON.parse(output)
      return workspaces[packageName] || null
    } catch (error) {
      return null
    }
  }

  private async exec(command: string, cwd?: string, returnOutput = false): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', command], {
        cwd: cwd || this.rootPath,
        stdio: returnOutput ? 'pipe' : 'inherit',
      })

      let output = ''

      if (returnOutput) {
        child.stdout?.on('data', (data) => {
          output += data.toString()
        })
      }

      child.on('close', (code) => {
        if (code === 0) {
          resolve(output)
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${command}`))
        }
      })

      child.on('error', reject)
    })
  }
}

export class PnpmWorkspacesAdapter implements PackageManagerAdapter {
  constructor(private rootPath: string) {}

  async install(options: InstallOptions = {}): Promise<void> {
    const cmd = options.frozen ? 'pnpm install --frozen-lockfile' : 'pnpm install'
    await this.exec(cmd, options.cwd)
  }

  async build(packages: string[] = [], options: BuildOptions = {}): Promise<void> {
    let cmd = 'pnpm run --recursive build'

    if (packages.length > 0) {
      cmd = `pnpm run --filter="${packages.join('|')}" build`
    }

    await this.exec(cmd, options.cwd)
  }

  async test(packages: string[] = [], options: TestOptions = {}): Promise<void> {
    let cmd = 'pnpm run --recursive test'

    if (packages.length > 0) {
      cmd = `pnpm run --filter="${packages.join('|')}" test`
    }

    await this.exec(cmd, options.cwd)
  }

  async run(script: string, packages: string[] = [], options: RunOptions = {}): Promise<void> {
    let cmd = `pnpm run --recursive ${script}`

    if (packages.length > 0) {
      cmd = `pnpm run --filter="${packages.join('|')}" ${script}`
    }

    await this.exec(cmd, options.cwd)
  }

  async getWorkspacePackages(): Promise<string[]> {
    const output = await this.exec('pnpm list --recursive --json', undefined, true)
    const packages = JSON.parse(output)
    return packages.map((pkg: any) => pkg.name).filter(Boolean)
  }

  async getPackageInfo(packageName: string): Promise<any> {
    try {
      const output = await this.exec(`pnpm list --filter=${packageName} --json`, undefined, true)
      const packages = JSON.parse(output)
      return packages[0] || null
    } catch (error) {
      return null
    }
  }

  private async exec(command: string, cwd?: string, returnOutput = false): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', command], {
        cwd: cwd || this.rootPath,
        stdio: returnOutput ? 'pipe' : 'inherit',
      })

      let output = ''

      if (returnOutput) {
        child.stdout?.on('data', (data) => {
          output += data.toString()
        })
      }

      child.on('close', (code) => {
        if (code === 0) {
          resolve(output)
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${command}`))
        }
      })

      child.on('error', reject)
    })
  }
}

export class RushAdapter implements PackageManagerAdapter {
  constructor(private rootPath: string) {}

  async install(options: InstallOptions = {}): Promise<void> {
    await this.exec('rush install', options.cwd)
  }

  async build(packages: string[] = [], options: BuildOptions = {}): Promise<void> {
    let cmd = 'rush build'

    if (packages.length > 0) {
      cmd += ` --to ${packages.join(' --to ')}`
    }

    await this.exec(cmd, options.cwd)
  }

  async test(packages: string[] = [], options: TestOptions = {}): Promise<void> {
    let cmd = 'rush test'

    if (packages.length > 0) {
      cmd += ` --to ${packages.join(' --to ')}`
    }

    await this.exec(cmd, options.cwd)
  }

  async run(script: string, packages: string[] = [], options: RunOptions = {}): Promise<void> {
    // Rush doesn't have a direct equivalent to run arbitrary scripts
    // This would need to be implemented based on specific Rush configuration
    throw new Error('Rush adapter does not support arbitrary script execution')
  }

  async getWorkspacePackages(): Promise<string[]> {
    const output = await this.exec('rush list --json', undefined, true)
    const packages = JSON.parse(output)
    return packages.map((pkg: any) => pkg.packageName)
  }

  async getPackageInfo(packageName: string): Promise<any> {
    try {
      const output = await this.exec('rush list --json', undefined, true)
      const packages = JSON.parse(output)
      return packages.find((pkg: any) => pkg.packageName === packageName) || null
    } catch (error) {
      return null
    }
  }

  private async exec(command: string, cwd?: string, returnOutput = false): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', command], {
        cwd: cwd || this.rootPath,
        stdio: returnOutput ? 'pipe' : 'inherit',
      })

      let output = ''

      if (returnOutput) {
        child.stdout?.on('data', (data) => {
          output += data.toString()
        })
      }

      child.on('close', (code) => {
        if (code === 0) {
          resolve(output)
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${command}`))
        }
      })

      child.on('error', reject)
    })
  }
}

export class SinglePackageAdapter implements PackageManagerAdapter {
  constructor(
    private rootPath: string,
    private packageManager: PackageManager
  ) {}

  async install(options: InstallOptions = {}): Promise<void> {
    const cmd =
      this.packageManager === PackageManager.NPM ? 'npm ci' : `${this.packageManager} install`
    await this.exec(cmd, options.cwd)
  }

  async build(packages: string[] = [], options: BuildOptions = {}): Promise<void> {
    await this.exec(`${this.packageManager} run build`, options.cwd)
  }

  async test(packages: string[] = [], options: TestOptions = {}): Promise<void> {
    await this.exec(`${this.packageManager} run test`, options.cwd)
  }

  async run(script: string, packages: string[] = [], options: RunOptions = {}): Promise<void> {
    await this.exec(`${this.packageManager} run ${script}`, options.cwd)
  }

  async getWorkspacePackages(): Promise<string[]> {
    // Single package, return the package name from package.json
    try {
      const packageJson = require(join(this.rootPath, 'package.json'))
      return [packageJson.name || 'unknown']
    } catch (error) {
      return ['unknown']
    }
  }

  async getPackageInfo(packageName: string): Promise<any> {
    try {
      const packageJson = require(join(this.rootPath, 'package.json'))
      return packageJson.name === packageName ? packageJson : null
    } catch (error) {
      return null
    }
  }

  private async exec(command: string, cwd?: string, returnOutput = false): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', command], {
        cwd: cwd || this.rootPath,
        stdio: returnOutput ? 'pipe' : 'inherit',
      })

      let output = ''

      if (returnOutput) {
        child.stdout?.on('data', (data) => {
          output += data.toString()
        })
      }

      child.on('close', (code) => {
        if (code === 0) {
          resolve(output)
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${command}`))
        }
      })

      child.on('error', reject)
    })
  }
}
