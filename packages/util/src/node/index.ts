// Git operations (new comprehensive API)
export {
  type BranchOptions,
  COLORS,
  type CommitInfo,
  createGitOperations,
  type ExecOptions,
  exec,
  type GitError,
  GitOperations,
  getChangedFiles,
  getCurrentBranch,
  hasUncommittedChanges,
  isGitRepository,
  log,
  type PullRequestOptions,
  type VersionAnalysis,
  type VersionBumpType,
} from './git-operations.js'

// Git utilities (legacy)
export {
  analyzeChangesForVersionBump as analyzeChangesForVersionBumpLegacy,
  commitAndPush as commitAndPushLegacy,
  getChangedFiles as getChangedFilesLegacy,
  getCurrentBranch as getCurrentBranchLegacy,
  getCurrentVersion,
  getRecentCommits,
  hasUncommittedChanges as hasUncommittedChangesLegacy,
  incrementVersion,
  isGitRepository as isGitRepositoryLegacy,
  updateChangelog,
  updatePackageVersion,
} from './git-utils.js'

// Prompt utilities
export * from './prompt-utils.js'
