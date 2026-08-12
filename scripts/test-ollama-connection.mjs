#!/usr/bin/env node

/**
 * Ollama Connection Test Script
 *
 * Tests:
 * 1. If Ollama is running and reachable
 * 2. Lists available models
 * 3. Tests actual model response generation
 *
 * Usage: node scripts/test-ollama-connection.mjs
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const TEST_MODEL = process.env.OLLAMA_MODEL || 'gemma3:4b';
const TIMEOUT_MS = 15000;

const PASS = '\x1b[32mPASS\x1b[0m';
const FAIL = '\x1b[31mFAIL\x1b[0m';
const INFO = '\x1b[34mINFO\x1b[0m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function log(label, message) {
  console.log('  [' + label + '] ' + message);
}

async function fetchWithTimeout(url, options, timeoutMs) {
  timeoutMs = timeoutMs || TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(function () {
    controller.abort();
  }, timeoutMs);
  try {
    const response = await fetch(url, Object.assign({}, options, { signal: controller.signal }));
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function checkOllamaRunning() {
  console.log('\n' + BOLD + '[1/4] Checking if Ollama is running' + RESET);
  try {
    const response = await fetchWithTimeout(OLLAMA_BASE_URL + '/api/tags', {}, 5000);
    if (response.ok) {
      log(PASS, 'Ollama is running at ' + OLLAMA_BASE_URL);
      return true;
    } else {
      log(FAIL, 'Ollama returned status ' + response.status);
      return false;
    }
  } catch (error) {
    log(FAIL, 'Cannot connect to Ollama at ' + OLLAMA_BASE_URL);
    console.log('        Error: ' + error.message);
    console.log('        Make sure Ollama is installed and running:');
    console.log('        - Download: https://ollama.com/download');
    console.log('        - Start:    ollama serve');
    return false;
  }
}

async function listModels() {
  console.log('\n' + BOLD + '[2/4] Listing available models' + RESET);
  try {
    const response = await fetchWithTimeout(OLLAMA_BASE_URL + '/api/tags', {}, 5000);
    if (!response.ok) {
      log(FAIL, 'Failed to fetch models (HTTP ' + response.status + ')');
      return [];
    }
    const data = await response.json();
    const models = data.models || [];
    if (models.length === 0) {
      log(INFO, 'No models found. You need to pull at least one model.');
      console.log('        Run: ollama pull ' + TEST_MODEL);
    } else {
      log(PASS, 'Found ' + models.length + ' model(s):');
      for (const model of models) {
        const size = (model.size / 1024 / 1024 / 1024).toFixed(2);
        const modified = model.modified_at ? model.modified_at.slice(0, 10) : 'N/A';
        console.log('         - ' + model.name + ' (' + size + ' GB, modified: ' + modified + ')');
      }
    }
    return models.map(function (m) { return m.name; });
  } catch (error) {
    log(FAIL, 'Error listing models: ' + error.message);
    return [];
  }
}

async function checkModelAvailability(models) {
  console.log('\n' + BOLD + '[3/4] Checking if target model "' + TEST_MODEL + '" is available' + RESET);
  const foundModel = models.find(function (m) { return m.startsWith(TEST_MODEL); });
  if (foundModel) {
    log(PASS, 'Model "' + foundModel + '" is available and ready to use');
    return foundModel;
  } else {
    log(FAIL, 'Model "' + TEST_MODEL + '" not found in available models');
    console.log('        Pull it with: ollama pull ' + TEST_MODEL);
    if (models.length > 0) {
      const alternative = models[0];
      console.log('        Alternative: Use "' + alternative + '" by setting OLLAMA_MODEL=' + alternative);
      return alternative;
    }
    return null;
  }
}

async function testResponseGeneration(modelName) {
  console.log('\n' + BOLD + '[4/4] Testing response generation with model "' + modelName + '"' + RESET);
  const testPrompt = 'Respond with exactly: "Hello from VisaPilot AI! Ollama is working correctly." Do not include anything else.';

  try {
    const startTime = Date.now();
    const response = await fetchWithTimeout(OLLAMA_BASE_URL + '/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        prompt: testPrompt,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 100,
        },
      }),
    }, 60000);

    if (!response.ok) {
      const errorText = await response.text();
      log(FAIL, 'Generation failed (HTTP ' + response.status + ')');
      console.log('        Error: ' + errorText.slice(0, 200));
      return false;
    }

    const text = await response.text();
    const lines = text.trim().split('\n');
    const responses = lines.map(function (line) { return JSON.parse(line); });
    const fullResponse = responses.reduce(function (acc, curr) {
      return acc + (curr.response || '');
    }, '');
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const evalCount = responses[responses.length - 1] ? responses[responses.length - 1].eval_count || 'N/A' : 'N/A';

    log(PASS, 'Response received in ' + duration + 's (' + evalCount + ' tokens)');
    console.log('        Response: "' + fullResponse.trim().slice(0, 150) + '"');
    return true;
  } catch (error) {
    log(FAIL, 'Generation request failed: ' + error.message);
    if (error.message.includes('aborted')) {
      console.log('        Request timed out after 60s. The model may still be loading.');
      console.log('        Try running: ollama run ' + modelName + ' (first run loads the model)');
    }
    return false;
  }
}

async function main() {
  console.log('\n' + BOLD + '=== Ollama Connection Test Suite ===' + RESET);
  console.log('  Ollama URL: ' + OLLAMA_BASE_URL);
  console.log('  Test Model: ' + TEST_MODEL);
  console.log('  Timeout:    ' + TIMEOUT_MS + 'ms');

  const running = await checkOllamaRunning();
  if (!running) {
    console.log('\n' + BOLD + '--- RESULT: FAILED ---' + RESET);
    console.log('[' + FAIL + '] Ollama is not running');
    console.log('');
    console.log(BOLD + 'Troubleshooting:' + RESET);
    console.log('  1. Install Ollama: https://ollama.com/download');
    console.log('  2. Start Ollama:   ollama serve');
    console.log('  3. Pull a model:   ollama pull ' + TEST_MODEL);
    process.exit(1);
  }

  const models = await listModels();
  const modelName = await checkModelAvailability(models);

  if (!modelName) {
    console.log('\n' + BOLD + '--- RESULT: FAILED ---' + RESET);
    console.log('[' + FAIL + '] No models available');
    console.log('');
    console.log(BOLD + 'Next steps:' + RESET);
    console.log('  1. Pull a model: ollama pull ' + TEST_MODEL);
    process.exit(1);
  }

  const generationOk = await testResponseGeneration(modelName);

  console.log('\n' + BOLD + '--- RESULT ---' + RESET);
  if (running && generationOk) {
    console.log('[' + PASS + '] ALL TESTS PASSED!');
    console.log('  - Ollama is running');
    console.log('  - Models are available');
    console.log('  - Response generation works');
    console.log('');
    console.log(BOLD + 'Configuration:' + RESET);
    console.log('  Set in .env or config:');
    console.log('  OLLAMA_BASE_URL=' + OLLAMA_BASE_URL);
    console.log('  OLLAMA_MODEL=' + modelName);
    console.log('  AI_PROVIDER=local');
    process.exit(0);
  } else {
    console.log('[' + FAIL + '] SOME TESTS FAILED');
    process.exit(1);
  }
}

main().catch(function (error) {
  console.error('\n[' + FAIL + '] Unexpected error: ' + error.message);
  process.exit(1);
});
