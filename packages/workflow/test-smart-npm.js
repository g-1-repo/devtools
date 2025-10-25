#!/usr/bin/env node

/**
 * Test script to demonstrate smart NPM version checking functionality
 */

const { detectSmartPublishablePackages, formatPackageDetectionSummary } = require('./dist/index.js')

async function testSmartNpmChecking() {
  console.log('🔍 Testing Smart NPM Version Checking...\n')

  try {
    // Test with the current workspace
    const result = await detectSmartPublishablePackages()

    console.log('📊 Package Analysis Results:')
    console.log('='.repeat(50))

    if (result.publishable.length > 0) {
      console.log(`✅ Ready to publish (${result.publishable.length}):`)
      for (const pkg of result.publishable) {
        console.log(`   • ${pkg}`)
      }
      console.log()
    }

    if (result.alreadyPublished.length > 0) {
      console.log(`⏭️  Already published (${result.alreadyPublished.length}):`)
      for (const pkg of result.alreadyPublished) {
        console.log(`   • ${pkg}`)
      }
      console.log()
    }

    if (result.private.length > 0) {
      console.log(`🔒 Private packages (${result.private.length}):`)
      for (const pkg of result.private) {
        console.log(`   • ${pkg}`)
      }
      console.log()
    }

    if (result.notFound.length > 0) {
      console.log(`❌ Not found (${result.notFound.length}):`)
      for (const pkg of result.notFound) {
        console.log(`   • ${pkg}`)
      }
      console.log()
    }

    // Test the formatted summary
    console.log('📋 Formatted Summary:')
    console.log('='.repeat(50))
    const summary = formatPackageDetectionSummary(result)
    console.log(summary)
  } catch (error) {
    console.error('❌ Error testing smart NPM checking:', error)
  }
}

testSmartNpmChecking()
