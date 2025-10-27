/**
 * AI Integration Example
 *
 * Demonstrates how to use the AI-powered error analysis and code suggestions
 * within the util package ecosystem.
 */

import { analyzeErrorWithAI, defaultAIErrorAnalyzer, getAICodeSuggestions } from './ai-error-analyzer.js'
import { ErrorFormatter } from './error-formatter.js'

/**
 * Example: Enhanced error handling with AI analysis
 */
export async function enhancedErrorHandler(error: Error, context?: {
  filePath?: string
  codeSnippet?: string
  operation?: string
}) {
  // Format the error using existing utilities
  const formattedError = ErrorFormatter.formatError(error, 'critical')
  console.error(formattedError.message)

  try {
    // Get AI analysis of the error
    const analysis = await analyzeErrorWithAI(error, {
      filePath: context?.filePath,
      codeSnippet: context?.codeSnippet,
      environment: 'development',
    })

    // Display AI-enhanced error information
    const enhancedOutput = defaultAIErrorAnalyzer.formatErrorWithAI(analysis)
    console.log(`\n${enhancedOutput}`)

    return analysis
  }
  catch {
    console.warn('AI analysis failed, falling back to basic error handling')
    return null
  }
}

/**
 * Example: Code review with AI suggestions
 */
export async function reviewCodeWithAI(codeSnippet: string, language = 'typescript') {
  try {
    const suggestions = await getAICodeSuggestions(codeSnippet, {
      language,
      framework: 'node',
      purpose: 'code-review',
    })

    if (suggestions.length > 0) {
      console.log('\n🤖 AI Code Review Suggestions:')
      suggestions.forEach((suggestion, index) => {
        console.log(`  ${index + 1}. ${suggestion}`)
      })
    }
    else {
      console.log('\n✅ No AI suggestions - code looks good!')
    }

    return suggestions
  }
  catch (error) {
    console.warn('AI code review failed:', error)
    return []
  }
}

/**
 * Example: Workflow error recovery with AI assistance
 */
export async function aiAssistedErrorRecovery(
  workflowStep: string,
  error: Error,
  context: {
    stepIndex: number
    totalSteps: number
    previousSteps: string[]
    failedAttempts: number
  },
) {
  console.log(`\n❌ Workflow step "${workflowStep}" failed (attempt ${context.failedAttempts + 1})`)

  // Analyze the error with AI
  const analysis = await analyzeErrorWithAI(error, {
    environment: 'workflow',
    stackTrace: error.stack,
  })

  if (analysis.suggestions.length > 0) {
    console.log('\n🔧 AI Recovery Suggestions:')
    analysis.suggestions.forEach((suggestion, index) => {
      console.log(`  ${index + 1}. ${suggestion}`)
    })

    // Return structured recovery options
    return {
      canRetry: analysis.confidence > 0.6,
      suggestedDelay: analysis.confidence > 0.8 ? 1000 : 5000,
      alternativeApproaches: analysis.suggestions.slice(0, 3),
      skipRecommended: analysis.confidence < 0.3,
    }
  }

  return {
    canRetry: true,
    suggestedDelay: 5000,
    alternativeApproaches: [],
    skipRecommended: false,
  }
}

/**
 * Example: Performance optimization suggestions
 */
export async function getPerformanceOptimizations(codeSnippet: string) {
  try {
    const suggestions = await getAICodeSuggestions(codeSnippet, {
      language: 'typescript',
      purpose: 'performance-optimization',
    })

    const performanceSuggestions = suggestions.filter(s =>
      s.toLowerCase().includes('performance')
      || s.toLowerCase().includes('optimize')
      || s.toLowerCase().includes('faster')
      || s.toLowerCase().includes('memory'),
    )

    if (performanceSuggestions.length > 0) {
      console.log('\n⚡ Performance Optimization Suggestions:')
      performanceSuggestions.forEach((suggestion, index) => {
        console.log(`  ${index + 1}. ${suggestion}`)
      })
    }

    return performanceSuggestions
  }
  catch (error) {
    console.warn('Performance analysis failed:', error)
    return []
  }
}

/**
 * Example usage and testing
 */
export async function demonstrateAIIntegration() {
  console.log('🤖 AI Integration Demo for @g-1/util\n')

  // Example 1: Error analysis
  try {
    throw new Error('ENOENT: no such file or directory, open \'/missing/file.txt\'')
  }
  catch (error) {
    await enhancedErrorHandler(error as Error, {
      filePath: '/src/utils/file-reader.ts',
      operation: 'file-read',
    })
  }

  console.log(`\n${'='.repeat(50)}\n`)

  // Example 2: Code review
  const sampleCode = `
function processData(data) {
  let result = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i] != null) {
      result.push(data[i].toString().toUpperCase());
    }
  }
  return result;
}
`

  await reviewCodeWithAI(sampleCode, 'javascript')

  console.log(`\n${'='.repeat(50)}\n`)

  // Example 3: Performance optimization
  const performanceCode = `
const users = await db.users.findMany();
for (const user of users) {
  const posts = await db.posts.findMany({ where: { userId: user.id } });
  user.posts = posts;
}
return users;
`

  await getPerformanceOptimizations(performanceCode)
}

// Export for testing and demonstration
export { demonstrateAIIntegration as default }
