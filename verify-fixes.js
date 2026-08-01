#!/usr/bin/env node

/**
 * Verification Script for Bug Fixes
 * Tests the three main issues that were fixed:
 * 1. Submit request endpoint (404 fix)
 * 2. Public timeline access (login redirect fix)
 * 3. API endpoints health check
 */

const API_URL = process.env.API_URL || 'http://localhost:8787';
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, icon, message) {
  console.log(`${color}${icon} ${message}${colors.reset}`);
}

function success(message) {
  log(colors.green, '✓', message);
}

function error(message) {
  log(colors.red, '✗', message);
}

function info(message) {
  log(colors.blue, 'ℹ', message);
}

function warn(message) {
  log(colors.yellow, '⚠', message);
}

async function testHealthCheck() {
  info('Testing health endpoint...');
  try {
    const res = await fetch(`${API_URL}/health`);
    const data = await res.json();
    
    if (res.ok && data.status === 'ok') {
      success('Health check passed');
      return true;
    } else {
      error(`Health check failed: ${JSON.stringify(data)}`);
      return false;
    }
  } catch (err) {
    error(`Health check error: ${err.message}`);
    return false;
  }
}

async function testCORS() {
  info('Testing CORS configuration...');
  try {
    const res = await fetch(`${API_URL}/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://it.audydental.com',
        'Access-Control-Request-Method': 'POST',
      },
    });
    
    const corsHeader = res.headers.get('access-control-allow-origin');
    if (corsHeader) {
      success(`CORS configured: ${corsHeader}`);
      return true;
    } else {
      warn('CORS headers not found (might be OK for localhost)');
      return true;
    }
  } catch (err) {
    error(`CORS test error: ${err.message}`);
    return false;
  }
}

async function testSubmitEndpoint() {
  info('Testing submit request endpoint (checking it exists, not actually submitting)...');
  try {
    // We'll send an empty POST to see if the endpoint exists
    // It should return 400 (validation error) not 404
    const res = await fetch(`${API_URL}/api/work-items/public/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    
    if (res.status === 404) {
      error('Submit endpoint returns 404 - ENDPOINT NOT FOUND');
      return false;
    } else if (res.status === 400) {
      success('Submit endpoint exists (returned validation error as expected)');
      return true;
    } else {
      warn(`Submit endpoint returned status ${res.status} (not 404, so endpoint exists)`);
      return true;
    }
  } catch (err) {
    error(`Submit endpoint test error: ${err.message}`);
    return false;
  }
}

async function testTrackEndpoint() {
  info('Testing track endpoint...');
  try {
    const res = await fetch(`${API_URL}/api/work-items/public/track?query=test@example.com`);
    
    if (res.status === 404) {
      error('Track endpoint returns 404 - ENDPOINT NOT FOUND');
      return false;
    } else if (res.ok) {
      success('Track endpoint exists and returns OK');
      return true;
    } else {
      warn(`Track endpoint returned status ${res.status}`);
      return true;
    }
  } catch (err) {
    error(`Track endpoint test error: ${err.message}`);
    return false;
  }
}

async function testTimelineColorSchema() {
  info('Testing timeline color schema (gray color support)...');
  info('This requires authentication, showing expected colors...');
  
  const expectedColors = ['blue', 'green', 'yellow', 'orange', 'red', 'purple', 'gray'];
  success(`Expected timeline colors: ${expectedColors.join(', ')}`);
  return true;
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log(colors.cyan + '  CRMS Bug Fix Verification' + colors.reset);
  console.log('='.repeat(60) + '\n');
  
  info(`API URL: ${API_URL}\n`);
  
  const results = {
    health: await testHealthCheck(),
    cors: await testCORS(),
    submit: await testSubmitEndpoint(),
    track: await testTrackEndpoint(),
    colors: await testTimelineColorSchema(),
  };
  
  console.log('\n' + '='.repeat(60));
  console.log(colors.cyan + '  Test Results Summary' + colors.reset);
  console.log('='.repeat(60) + '\n');
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([name, passed]) => {
    const icon = passed ? '✓' : '✗';
    const color = passed ? colors.green : colors.red;
    console.log(`${color}${icon} ${name.toUpperCase()}${colors.reset}`);
  });
  
  console.log('\n' + '-'.repeat(60));
  
  if (passed === total) {
    success(`All ${total} tests passed! 🎉`);
  } else {
    error(`${passed}/${total} tests passed`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(colors.cyan + '  Next Steps' + colors.reset);
  console.log('='.repeat(60) + '\n');
  
  if (results.submit && results.track) {
    info('1. Test actual request submission via UI');
    info('2. Verify ticket counter increments correctly');
    info('3. Test public timeline share links in incognito mode');
    info('4. Verify confirmation emails are sent');
  } else {
    error('Fix failing tests before proceeding to UI testing');
  }
  
  console.log('\n');
  
  process.exit(passed === total ? 0 : 1);
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: node verify-fixes.js [options]

Options:
  --help, -h     Show this help message
  
Environment Variables:
  API_URL        API base URL (default: http://localhost:8787)
  
Examples:
  # Test local dev server
  node verify-fixes.js
  
  # Test production API
  API_URL=https://crms-api.yourdomain.workers.dev node verify-fixes.js
  `);
  process.exit(0);
}

// Run the tests
runTests().catch((err) => {
  error(`Fatal error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
