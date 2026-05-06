#!/usr/bin/env tsx

/**
 * Performance Optimization Test Script
 * Tests navigation timing and middleware cache performance
 */

import { performance } from 'perf_hooks'

const BASE_URL = 'http://localhost:3002'

interface NavigationTest {
  route: string
  expectedTime: number // milliseconds
  description: string
}

const NAVIGATION_TESTS: NavigationTest[] = [
  { route: '/dashboard', expectedTime: 200, description: 'Dashboard page' },
  { route: '/users', expectedTime: 200, description: 'Users management' },
  { route: '/units', expectedTime: 200, description: 'Units management' },
  { route: '/kpi-config', expectedTime: 200, description: 'KPI Configuration' },
  { route: '/pool', expectedTime: 200, description: 'Pool management' },
  { route: '/settings', expectedTime: 200, description: 'Settings page' },
]

async function testNavigationTiming(route: string): Promise<number> {
  const start = performance.now()
  
  try {
    const response = await fetch(`${BASE_URL}${route}`, {
      method: 'HEAD', // Only get headers, not full content
      headers: {
        'User-Agent': 'Performance-Test-Script'
      }
    })
    
    const end = performance.now()
    const duration = end - start
    
    if (!response.ok) {
      console.warn(`⚠️  Route ${route} returned ${response.status}`)
    }
    
    return duration
  } catch (error) {
    console.error(`❌ Failed to test ${route}:`, error)
    return -1
  }
}

async function testMiddlewareCache(): Promise<void> {
  console.log('\n🔄 Testing middleware cache performance...')
  
  const testRoute = '/dashboard'
  const iterations = 5
  const times: number[] = []
  
  for (let i = 0; i < iterations; i++) {
    const time = await testNavigationTiming(testRoute)
    if (time > 0) {
      times.push(time)
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  if (times.length === 0) {
    console.log('❌ No successful cache tests')
    return
  }
  
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length
  const minTime = Math.min(...times)
  const maxTime = Math.max(...times)
  
  console.log(`📊 Cache performance results:`)
  console.log(`   Average: ${avgTime.toFixed(2)}ms`)
  console.log(`   Min: ${minTime.toFixed(2)}ms`)
  console.log(`   Max: ${maxTime.toFixed(2)}ms`)
  
  if (avgTime < 50) {
    console.log('✅ Middleware cache performance is excellent (<50ms)')
  } else if (avgTime < 100) {
    console.log('⚠️  Middleware cache performance is acceptable (50-100ms)')
  } else {
    console.log('❌ Middleware cache performance needs improvement (>100ms)')
  }
}

async function testRoutePerformance(): Promise<void> {
  console.log('\n🚀 Testing route navigation performance...')
  
  let passedTests = 0
  let totalTests = NAVIGATION_TESTS.length
  
  for (const test of NAVIGATION_TESTS) {
    const time = await testNavigationTiming(test.route)
    
    if (time < 0) {
      console.log(`❌ ${test.description} (${test.route}): Failed to connect`)
      continue
    }
    
    const status = time <= test.expectedTime ? '✅' : '⚠️ '
    const timeStr = `${time.toFixed(2)}ms`
    const expectedStr = `(expected <${test.expectedTime}ms)`
    
    console.log(`${status} ${test.description} (${test.route}): ${timeStr} ${expectedStr}`)
    
    if (time <= test.expectedTime) {
      passedTests++
    }
  }
  
  console.log(`\n📈 Performance Summary: ${passedTests}/${totalTests} tests passed`)
  
  if (passedTests === totalTests) {
    console.log('🎉 All performance tests passed!')
  } else {
    console.log('⚠️  Some performance tests failed. Consider optimization.')
  }
}

async function checkServerStatus(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/api/health`, {
      method: 'GET',
      timeout: 5000
    } as any)
    
    return response.ok
  } catch (error) {
    return false
  }
}

async function main(): Promise<void> {
  console.log('🔍 JASPEL KPI System - Performance Optimization Test')
  console.log('=' .repeat(60))
  
  // Check if server is running
  console.log('🔌 Checking server status...')
  const serverRunning = await checkServerStatus()
  
  if (!serverRunning) {
    console.log('❌ Server is not running or not responding')
    console.log('💡 Please start the server first:')
    console.log('   npm run dev (for development)')
    console.log('   npm run start:prod (for production)')
    process.exit(1)
  }
  
  console.log('✅ Server is running and responding')
  
  // Run performance tests
  await testMiddlewareCache()
  await testRoutePerformance()
  
  console.log('\n🏁 Performance testing completed!')
  console.log('\n💡 Tips for better performance:')
  console.log('   - Use production build (npm run start:prod)')
  console.log('   - Enable route prefetching in navigation')
  console.log('   - Monitor middleware cache hit rates')
  console.log('   - Optimize database queries')
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error)
  process.exit(1)
})

// Run the test
main().catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})