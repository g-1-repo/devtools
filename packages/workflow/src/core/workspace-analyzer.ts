import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { glob } from 'glob'
import {
  type MonorepoInfo,
  MonorepoType,
  type PackageInfo,
  PackageManager,
} from './monorepo-detector'

export interface DependencyGraph {
  nodes: Map<string, PackageNode>
  edges: Map<string, Set<string>>
  buildOrder: string[]
}

export interface PackageNode {
  name: string
  path: string
  dependencies: string[]
  dependents: string[]
  isWorkspacePackage: boolean
}

export interface ChangeAnalysis {
  changedPackages: string[]
  affectedPackages: string[]
  buildOrder: string[]
  testOrder: string[]
}

export interface WorkspaceAnalysisResult {
  monorepoInfo: MonorepoInfo
  dependencyGraph: DependencyGraph
  changeAnalysis?: ChangeAnalysis
}

export class WorkspaceAnalyzer {
  private monorepoInfo: MonorepoInfo
  private dependencyGraph?: DependencyGraph
  private rootPath: string

  constructor(rootPath: string)
  constructor(monorepoInfo: MonorepoInfo)
  constructor(rootPathOrInfo: string | MonorepoInfo) {
    if (typeof rootPathOrInfo === 'string') {
      this.rootPath = rootPathOrInfo
      this.monorepoInfo = {
        packages: [],
        type: MonorepoType.SINGLE_PACKAGE,
        packageManager: PackageManager.NPM,
        workspacePatterns: [],
        rootPath: rootPathOrInfo,
        confidence: 1.0,
      }
    } else {
      this.monorepoInfo = rootPathOrInfo
      this.rootPath = rootPathOrInfo.rootPath || process.cwd()
    }
  }

  /**
   * Find packages using workspace patterns
   */
  async findPackages(patterns: string[] = ['packages/*', 'apps/*']): Promise<PackageInfo[]> {
    const packages: PackageInfo[] = []

    for (const pattern of patterns) {
      const fullPattern = join(this.rootPath, pattern, 'package.json')
      const packageJsonPaths = await glob(fullPattern)

      for (const packageJsonPath of packageJsonPaths) {
        if (existsSync(packageJsonPath)) {
          try {
            const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
            const packagePath = packageJsonPath.replace('/package.json', '')
            const relativePath = packagePath.replace(`${this.rootPath}/`, '')

            packages.push({
              name: packageJson.name,
              version: packageJson.version,
              path: packagePath,
              relativePath,
              dependencies: packageJson.dependencies || {},
              devDependencies: packageJson.devDependencies || {},
              scripts: packageJson.scripts || {},
              isPrivate: packageJson.private || false,
            })
          } catch (error) {
            throw new Error(`Failed to parse package.json at ${packageJsonPath}: ${error}`)
          }
        }
      }
    }

    return packages
  }

  /**
   * Get build order for packages
   */
  getBuildOrder(): string[] {
    if (!this.dependencyGraph) {
      throw new Error('Dependency graph not built. Call buildDependencyGraph() first.')
    }

    // If buildOrder is not computed, compute it now
    if (this.dependencyGraph.buildOrder.length === 0) {
      this.dependencyGraph.buildOrder = this.topologicalSort(
        this.dependencyGraph.nodes,
        this.dependencyGraph.edges
      )
    }

    return this.dependencyGraph.buildOrder
  }

  /**
   * Perform complete workspace analysis
   */
  async analyze(
    options: { includeChangeAnalysis?: boolean } = {}
  ): Promise<WorkspaceAnalysisResult> {
    const dependencyGraph = await this.buildDependencyGraph()
    this.dependencyGraph = dependencyGraph

    const result: WorkspaceAnalysisResult = {
      monorepoInfo: this.monorepoInfo,
      dependencyGraph,
    }

    if (options.includeChangeAnalysis) {
      result.changeAnalysis = await this.analyzeChanges()
    }

    return result
  }

  /**
   * Build dependency graph for all packages
   */
  async buildDependencyGraph(): Promise<DependencyGraph> {
    const nodes = new Map<string, PackageNode>()
    const edges = new Map<string, Set<string>>()

    // Create workspace package name set for quick lookup
    const workspacePackages = new Set(this.monorepoInfo.packages.map((pkg) => pkg.name))

    // Initialize nodes
    for (const pkg of this.monorepoInfo.packages) {
      nodes.set(pkg.name, {
        name: pkg.name,
        path: pkg.path,
        dependencies: [],
        dependents: [],
        isWorkspacePackage: true,
      })
      edges.set(pkg.name, new Set())
    }

    // Build edges based on dependencies
    for (const pkg of this.monorepoInfo.packages) {
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      }

      for (const depName of Object.keys(allDeps)) {
        if (workspacePackages.has(depName)) {
          // Add edge from dependency to dependent
          edges.get(depName)?.add(pkg.name)

          // Update node information
          const depNode = nodes.get(depName)
          const pkgNode = nodes.get(pkg.name)

          if (depNode && pkgNode) {
            depNode.dependents.push(pkg.name)
            pkgNode.dependencies.push(depName)
          }
        }
      }
    }

    // Calculate build order using topological sort
    const buildOrder = this.topologicalSort(nodes, edges)

    return {
      nodes,
      edges,
      buildOrder,
    }
  }

  /**
   * Perform topological sort to determine build order
   */
  private topologicalSort(
    nodes: Map<string, PackageNode>,
    edges: Map<string, Set<string>>
  ): string[] {
    const visited = new Set<string>()
    const visiting = new Set<string>()
    const result: string[] = []

    const visit = (nodeName: string): void => {
      if (visiting.has(nodeName)) {
        throw new Error(`Circular dependency detected involving package: ${nodeName}`)
      }

      if (visited.has(nodeName)) {
        return
      }

      visiting.add(nodeName)

      // Visit all dependencies first
      const node = nodes.get(nodeName)
      if (node) {
        for (const dep of node.dependencies) {
          visit(dep)
        }
      }

      visiting.delete(nodeName)
      visited.add(nodeName)
      result.push(nodeName)
    }

    // Visit all nodes
    for (const nodeName of nodes.keys()) {
      if (!visited.has(nodeName)) {
        visit(nodeName)
      }
    }

    return result
  }

  /**
   * Analyze changes and determine affected packages
   */
  async analyzeChanges(baseBranch: string = 'main'): Promise<ChangeAnalysis> {
    if (!this.dependencyGraph) {
      throw new Error('Dependency graph not built. Call buildDependencyGraph() first.')
    }

    const changedFiles = await this.getChangedFiles(baseBranch)
    const changedPackages = this.getChangedPackages(changedFiles)
    const affectedPackages = this.getAffectedPackagesFromChanged(changedPackages)

    // Filter build order to only include affected packages
    const buildOrder = this.dependencyGraph.buildOrder.filter((pkg) =>
      affectedPackages.includes(pkg)
    )

    // Test order is reverse of build order (test dependents before dependencies)
    const testOrder = [...buildOrder].reverse()

    return {
      changedPackages,
      affectedPackages,
      buildOrder,
      testOrder,
    }
  }

  /**
   * Get changed files since base branch
   */
  private async getChangedFiles(baseBranch: string): Promise<string[]> {
    try {
      const output = execSync(`git diff --name-only ${baseBranch}...HEAD`, {
        cwd: this.monorepoInfo.rootPath,
        encoding: 'utf-8',
      })

      return output.trim().split('\n').filter(Boolean)
    } catch (error) {
      // Fallback to all files if git command fails
      console.warn('Failed to get changed files, assuming all packages changed')
      return []
    }
  }

  /**
   * Determine which packages contain changed files
   */
  private getChangedPackages(changedFiles: string[]): string[] {
    if (changedFiles.length === 0) {
      // If no changed files detected, assume all packages changed
      return this.monorepoInfo.packages.map((pkg) => pkg.name)
    }

    const changedPackages = new Set<string>()

    for (const file of changedFiles) {
      // Convert absolute path to relative path from root
      const relativePath = file.startsWith(this.rootPath)
        ? file.substring(this.rootPath.length + 1)
        : file

      for (const pkg of this.monorepoInfo.packages) {
        if (relativePath.startsWith(`${pkg.relativePath}/`) || relativePath === pkg.relativePath) {
          changedPackages.add(pkg.name)
        }
      }
    }

    return Array.from(changedPackages)
  }

  /**
   * Get all packages affected by changes (including dependents)
   */
  /**
   * Get affected packages based on changed files
   */
  getAffectedPackages(changedFiles: string[]): string[] {
    if (!this.dependencyGraph) {
      throw new Error('Dependency graph not built. Call buildDependencyGraph() first.')
    }

    const changedPackages = this.getChangedPackages(changedFiles)
    return this.getAffectedPackagesFromChanged(changedPackages)
  }

  private getAffectedPackagesFromChanged(changedPackages: string[]): string[] {
    if (!this.dependencyGraph) {
      return changedPackages
    }

    const affected = new Set<string>(changedPackages)
    const toProcess = [...changedPackages]

    while (toProcess.length > 0) {
      const current = toProcess.shift()!
      const node = this.dependencyGraph.nodes.get(current)

      if (node) {
        for (const dependent of node.dependents) {
          if (!affected.has(dependent)) {
            affected.add(dependent)
            toProcess.push(dependent)
          }
        }
      }
    }

    return Array.from(affected)
  }

  /**
   * Get packages that can be built in parallel
   */
  getParallelBuildGroups(): string[][] {
    if (!this.dependencyGraph) {
      throw new Error('Dependency graph not built')
    }

    const groups: string[][] = []
    const processed = new Set<string>()
    const { nodes, buildOrder } = this.dependencyGraph

    for (const packageName of buildOrder) {
      if (processed.has(packageName)) {
        continue
      }

      const currentGroup: string[] = []
      const node = nodes.get(packageName)

      if (!node) {
        continue
      }

      // Check if all dependencies are already processed
      const canProcess = node.dependencies.every((dep) => processed.has(dep))

      if (canProcess) {
        currentGroup.push(packageName)
        processed.add(packageName)

        // Find other packages that can be processed in parallel
        for (const otherPackage of buildOrder) {
          if (processed.has(otherPackage)) {
            continue
          }

          const otherNode = nodes.get(otherPackage)
          if (!otherNode) {
            continue
          }

          const otherCanProcess = otherNode.dependencies.every((dep) => processed.has(dep))

          if (otherCanProcess) {
            currentGroup.push(otherPackage)
            processed.add(otherPackage)
          }
        }

        groups.push(currentGroup)
      }
    }

    return groups
  }

  /**
   * Detect circular dependencies in the workspace
   */
  async detectCircularDependencies(): Promise<string[][]> {
    if (!this.dependencyGraph) {
      await this.buildDependencyGraph()
    }

    const circularDeps: string[][] = []
    const visited = new Set<string>()
    const visiting = new Set<string>()
    const path: string[] = []

    const detectCycle = (nodeName: string): void => {
      if (visiting.has(nodeName)) {
        // Found a cycle - extract the cycle from the path
        const cycleStart = path.indexOf(nodeName)
        if (cycleStart !== -1) {
          const cycle = [...path.slice(cycleStart), nodeName]
          circularDeps.push(cycle)
        }
        return
      }

      if (visited.has(nodeName)) {
        return
      }

      visiting.add(nodeName)
      path.push(nodeName)

      // Visit all dependencies
      const node = this.dependencyGraph!.nodes.get(nodeName)
      if (node) {
        for (const dep of node.dependencies) {
          detectCycle(dep)
        }
      }

      path.pop()
      visiting.delete(nodeName)
      visited.add(nodeName)
    }

    // Check all nodes for cycles
    for (const nodeName of this.dependencyGraph!.nodes.keys()) {
      if (!visited.has(nodeName)) {
        detectCycle(nodeName)
      }
    }

    return circularDeps
  }

  /**
   * Get package information by name
   */
  getPackageInfo(packageName: string): PackageInfo | undefined {
    return this.monorepoInfo.packages.find((pkg) => pkg.name === packageName)
  }

  /**
   * Get packages by pattern
   */
  getPackagesByPattern(pattern: RegExp): PackageInfo[] {
    return this.monorepoInfo.packages.filter((pkg) => pattern.test(pkg.name))
  }

  /**
   * Check if package exists in workspace
   */
  hasPackage(packageName: string): boolean {
    return this.monorepoInfo.packages.some((pkg) => pkg.name === packageName)
  }

  /**
   * Get workspace statistics
   */
  getWorkspaceStats() {
    const totalPackages = this.monorepoInfo.packages.length

    // Count packages by type (apps vs packages based on path)
    const appPackages = this.monorepoInfo.packages.filter(
      (pkg) => pkg.path.includes('/apps/') || pkg.path.includes('\\apps\\')
    ).length
    const packagePackages = totalPackages - appPackages

    // Calculate dependency statistics
    let totalDependencies = 0
    let internalDependencies = 0
    let externalDependencies = 0
    const workspacePackageNames = new Set(this.monorepoInfo.packages.map((pkg) => pkg.name))

    for (const pkg of this.monorepoInfo.packages) {
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
      totalDependencies += Object.keys(allDeps).length

      for (const depName of Object.keys(allDeps)) {
        if (workspacePackageNames.has(depName)) {
          internalDependencies++
        } else {
          externalDependencies++
        }
      }
    }

    return {
      totalPackages,
      packagesByType: {
        app: appPackages,
        package: packagePackages,
      },
      dependencyStats: {
        totalDependencies,
        internalDependencies,
        externalDependencies,
        circularDependencies: [],
      },
    }
  }
}
