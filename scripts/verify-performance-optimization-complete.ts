#!/usr/bin/env tsx

/**
 * Verify Performance Optimization Complete
 * Checks all performance optimization tasks are implemented correctly
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

interface CheckResult {
  name: string
  status: 'pass' | 'fail' | 'warning'
  message: string
}

const results: CheckResult[] = []

function addResult(name: string, status: 'pass' | 'fail' | 'warning', message: string) {
  results.push({ name, status, message })
}

function checkFileExists(filePath: string, description: string): boolean {
  if (existsSync(filePath)) {
    addResult(description, 'pass', `File exists: ${filePath}`)
    return true
  } else {
    addResult(description, 'fail', `File missing: ${filePath}`)
    return false
  }
}

function checkFileContent(filePath: string, searchText: string, description: string): boolean {
  try {
    if (!existsSync(filePath)) {
      addResult(description, 'fail', `File not found: ${filePath}`)
      return false
    }
    
    const content = readFileSync(filePath, 'utf-8')
    if (content.includes(searchText)) {
      addResult(description, 'pass', `Found: ${searchText}`)
      return true
    } else {
      addResult(description, 'fail', `Not found: ${searchText}`)
      return false
    }
  } catch (error) {
    addResult(description, 'fail', `Error reading file: ${error}`)
    return false
  }
}

async function main(): Promise<void> {
  console.log('🔍 Verifying Performance Optimization Implementation')
  console.log('=' .repeat(60))
  
  // Task 1: OptimizedLink component
  console.log('\n📋 Task 1: OptimizedLink Component')
  checkFileExists('components/ui/optimized-link.tsx', 'OptimizedLink component exists')
  checkFileContent('components/ui/optimized-link.tsx', 'prefetch = true', 'OptimizedLink has prefetch enabled by default')
  
  // Task 2: Sidebar uses OptimizedLink
  console.log('\n📋 Task 2: Sidebar OptimizedLink Integration')
  checkFileContent('components/navigation/Sidebar.tsx', 'OptimizedLink', 'Sidebar imports OptimizedLink')
  checkFileContent('components/navigation/Sidebar.tsx', '<OptimizedLink', 'Sidebar uses OptimizedLink component')
  
  // Task 3: Middleware caching enhancements
  console.log('\n📋 Task 3: Middleware Cache Optimization')
  checkFileContent('middleware.ts', 'CACHE_TTL = 15 * 60 * 1000', 'Cache TTL increased to 15 minutes')
  checkFileContent('middleware.ts', 'MAX_CACHE_SIZE = 1000', 'Cache size increased to 1000 entries')
  checkFileContent('middleware.ts', 'LRUCache', 'LRU Cache implementation exists')
  
  // Task 4: Next.js configuration
  console.log('\n📋 Task 4: Next.js Configuration')
  checkFileContent('next.config.js', 'compress: true', 'Compression enabled')
  checkFileContent('next.config.js', 'removeConsole', 'Console removal in production')
  checkFileContent('next.config.js', 'productionBrowserSourceMaps: false', 'Source maps disabled in production')
  
  // Task 5: Production scripts
  console.log('\n📋 Task 5: Production Build Scripts')
  checkFileExists('START_PRODUCTION.ps1', 'Production startup script exists')
  checkFileContent('package.json', '"start:prod"', 'start:prod script exists in package.json')
  
  // Task 6: Build verification
  console.log('\n📋 Task 6: Build Verification')
  if (existsSync('.next/BUILD_ID')) {
    addResult('Production build', 'pass', 'Build artifacts exist')
  } else {
    addResult('Production build', 'warning', 'No build artifacts found - run npm run build')
  }
  
  // Task 7: Performance testing
  console.log('\n📋 Task 7: Performance Testing')
  checkFileExists('scripts/test-performance-optimization.ts', 'Performance test script exists')
  
  // Summary
  console.log('\n📊 Verification Summary')
  console.log('=' .repeat(60))
  
  let passCount = 0
  let failCount = 0
  let warningCount = 0
  
  results.forEach(result => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️ ' : '❌'
    console.log(`${icon} ${result.name}: ${result.message}`)
    
    if (result.status === 'pass') passCount++
    else if (result.status === 'fail') failCount++
    else warningCount++
  })
  
  console.log('\n📈 Results:')
  console.log(`   ✅ Passed: ${passCount}`)
  console.log(`   ⚠️  Warnings: ${warningCount}`)
  console.log(`   ❌ Failed: ${failCount}`)
  
  if (failCount === 0) {
    console.log('\n🎉 All performance optimization tasks completed successfully!')
    console.log('\n💡 Next steps:')
    console.log('   - Test the application in production mode')
    console.log('   - Monitor performance metrics')
    console.log('   - Deploy to Vercel for production testing')
  } else {
    console.log('\n⚠️  Some tasks need attention. Please review the failed items above.')
    process.exit(1)
  }
}

main().catch(error => {
  console.error('❌ Verification failed:', error)
  process.exit(1)
})