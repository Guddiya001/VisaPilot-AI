import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePersistableSearchResults } from '../apps/api/src/jobs/ai-search-results.ts';

test('normalizes rag results into persistable job payloads', () => {
  const results = normalizePersistableSearchResults({
    webResults: [],
    ragResults: [
      {
        title: 'Senior Backend Engineer',
        companyName: 'Acme Labs',
        description: 'Build resilient APIs',
        location: 'Remote',
        country: 'US',
        remote: true,
        source: 'GREENHOUSE',
        sourceUrl: 'https://example.com/job/1',
      },
    ],
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].title, 'Senior Backend Engineer');
  assert.equal(results[0].companyName, 'Acme Labs');
  assert.equal(results[0].source, 'GREENHOUSE');
});
