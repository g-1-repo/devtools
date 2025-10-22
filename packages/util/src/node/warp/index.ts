/**
 * @g-1/util/node/warp - WARP Development Workflow Enhancement
 *
 * This module provides comprehensive workflow enhancement utilities for WARP
 * when working with G1 projects. It handles TypeScript checking, package linking,
 * dependency management, and provides integration points for automated workflow.
 */

// Integration utilities for WARP
export {
  enhanceWorkflow,
  getProjectStatus,
  isG1Project,
  quickTypecheck,
  type WarpIntegrationOptions,
  WarpIntegrationPoints,
  type WarpIntegrationResult,
} from './integration'

// Core workflow enhancement
export {
  type FixResult,
  type ProjectInfo,
  WarpWorkflowEnhancer,
} from './workflow-enhancer'
