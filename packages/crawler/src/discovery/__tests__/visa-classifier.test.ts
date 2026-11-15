import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifySponsorshipTwoTier,
  scoreJobTokenizedRelevance,
} from '../visa-classifier.ts';
import {
  KnownSponsorRegistry,
  knownSponsorRegistry,
} from '../known-sponsors.ts';

describe('Phase 2: Two-Tier Sponsorship Verification & Known Sponsor Registry', () => {
  describe('1. Tier 1 Explicit Permit Taxonomy (VISA_SPONSORED)', () => {
    const permitCases: Array<{
      label: string;
      description: string;
      expectedSchemePattern: RegExp;
    }> = [
      {
        label: 'UK Skilled Worker',
        description: 'We offer UK Skilled Worker visa sponsorship for international engineers.',
        expectedSchemePattern: /skilled worker/i,
      },
      {
        label: 'Tier 2',
        description: 'Company provides Tier 2 sponsorship for qualified software engineers.',
        expectedSchemePattern: /tier\s*2/i,
      },
      {
        label: 'EU Blue Card',
        description: 'Join our Berlin team with full EU Blue Card visa support.',
        expectedSchemePattern: /blue card/i,
      },
      {
        label: 'kennismigrant / IND',
        description: 'Amsterdam role with kennismigrant / IND sponsorship provided.',
        expectedSchemePattern: /kennismigrant|highly skilled migrant|ind/i,
      },
      {
        label: 'Critical Skills Employment Permit',
        description: 'Dublin engineering hub sponsors Critical Skills Employment Permit.',
        expectedSchemePattern: /critical skills/i,
      },
      {
        label: 'Subclass 482',
        description: 'Sydney role eligible for Subclass 482 sponsorship.',
        expectedSchemePattern: /482/i,
      },
      {
        label: 'Employment Pass',
        description: 'Singapore team sponsors Employment Pass for senior hires.',
        expectedSchemePattern: /employment pass/i,
      },
    ];

    for (const { label, description, expectedSchemePattern } of permitCases) {
      it(`classifies "${label}" as VISA_SPONSORED with matched scheme tag`, () => {
        const result = classifySponsorshipTwoTier({
          title: 'Senior Backend Engineer',
          companyName: 'Unknown Startup Ltd',
          location: 'Remote',
          description,
        });

        assert.equal(result.category, 'VISA_SPONSORED');
        assert.equal(result.tier, 'TIER_1_EXPLICIT');
        assert.equal(result.sponsorsVisa, true);
        assert.ok(result.confidence >= 0.85, `Expected high confidence >= 0.85, got ${result.confidence}`);
        assert.ok(result.matchedSchemes.length > 0, 'Expected at least one matched scheme tag');
        assert.ok(
          result.matchedSchemes.some((s) => expectedSchemePattern.test(s)),
          `Expected matchedSchemes ${JSON.stringify(result.matchedSchemes)} to match ${expectedSchemePattern}`,
        );
      });
    }
  });

  describe('2. Tier 1 Relocation Signal (RELOCATION_PROVIDED)', () => {
    const relocationSnippets = [
      'We provide full relocation assistance to join our Amsterdam engineering hub.',
      'Competitive salary, equity, and a generous relocation package for international hires.',
      'We support international relocation for senior backend engineers.',
    ];

    for (const description of relocationSnippets) {
      it(`classifies "${description.slice(0, 55)}..." as RELOCATION_PROVIDED (not UNCLEAR)`, () => {
        const result = classifySponsorshipTwoTier({
          title: 'Staff Backend Engineer',
          companyName: 'Unknown Tech Corp',
          location: 'Amsterdam, Netherlands',
          description,
        });

        assert.equal(result.category, 'RELOCATION_PROVIDED');
        assert.equal(result.tier, 'TIER_1_EXPLICIT');
        assert.equal(result.relocationSupport, true);
        assert.equal(result.sponsorsVisa, true);
        assert.notEqual(result.category, 'UNCLEAR');
        assert.ok(result.confidence >= 0.8);
      });
    }
  });

  describe('3. Tier 2 Known Sponsor Silent Snippet Rescue (KNOWN_SPONSOR_SILENT)', () => {
    it('rescues a brief 120-char silent snippet for Monzo without explicit visa keywords', () => {
      const snippet = 'Build distributed banking systems in Go and Cassandra.';
      assert.ok(snippet.length <= 120);

      const result = classifySponsorshipTwoTier({
        title: 'Senior Staff Backend Engineer',
        companyName: 'Monzo',
        location: 'London, UK',
        description: snippet,
      });

      assert.equal(result.category, 'KNOWN_SPONSOR_SILENT');
      assert.equal(result.tier, 'TIER_2_REGISTRY');
      assert.equal(result.sponsorsVisa, true);
      assert.ok(result.confidence >= 0.8, `Expected high visa confidence >= 0.8, got ${result.confidence}`);
      assert.equal(result.registryMatch?.canonicalName, 'Monzo');
    });

    it('covers all 14 core global visa sponsors in KnownSponsorRegistry', () => {
      const coreSponsors = [
        'Monzo',
        'Booking.com',
        'Adyen',
        'Zalando',
        'Delivery Hero',
        'Revolut',
        'Wise',
        'Spotify',
        'Klarna',
        'Canva',
        'Atlassian',
        'Grab',
        'N26',
        'HelloFresh',
      ];

      for (const companyName of coreSponsors) {
        const match = knownSponsorRegistry.lookup({ companyName });
        assert.ok(match, `KnownSponsorRegistry must contain "${companyName}"`);

        const result = classifySponsorshipTwoTier({
          title: 'Software Engineer',
          companyName,
          description: 'Build reliable backend microservices and distributed APIs.',
        });

        assert.equal(
          result.category,
          'KNOWN_SPONSOR_SILENT',
          `Expected "${companyName}" silent snippet to classify as KNOWN_SPONSOR_SILENT`,
        );
        assert.ok(result.confidence >= 0.8);
      }
    });

    it('resolves company aliases and ATS board slugs via KnownSponsorRegistry', () => {
      const registry = new KnownSponsorRegistry();

      assert.equal(registry.lookup({ companyName: 'Booking.com B.V.' })?.canonicalName, 'Booking.com');
      assert.equal(registry.lookup({ companyName: 'TransferWise' })?.canonicalName, 'Wise');
      assert.equal(registry.lookup({ companyName: 'Monzo Bank Ltd' })?.canonicalName, 'Monzo');

      const atsSlugMatch = registry.lookup({
        companyName: 'Unknown Display Name',
        sourceUrl: 'https://job-boards.greenhouse.io/monzo/jobs/6036797',
      });
      assert.equal(atsSlugMatch?.canonicalName, 'Monzo');

      const silentAtsResult = classifySponsorshipTwoTier({
        title: 'Backend Engineer',
        companyName: 'Tech Employer',
        sourceUrl: 'https://jobs.lever.co/spotify/123456',
        description: 'Build high-scale audio streaming services.',
      });
      assert.equal(silentAtsResult.category, 'KNOWN_SPONSOR_SILENT');
      assert.equal(silentAtsResult.registryMatch?.canonicalName, 'Spotify');
      assert.equal(silentAtsResult.registryMatch?.matchedBy, 'ats_slug');

      assert.equal(
        registry.lookup({ sourceUrl: 'https://jobs.smartrecruiters.com/Wise/743999123' })?.canonicalName,
        'Wise',
      );
      assert.equal(
        registry.lookup({ sourceUrl: 'https://booking.wd5.myworkdayjobs.com/en-US/external/job/1' })?.canonicalName,
        'Booking.com',
      );
    });

    it('classifies unknown companies with silent snippets as UNCLEAR', () => {
      const result = classifySponsorshipTwoTier({
        title: 'Backend Engineer',
        companyName: 'Local Boutique Agency LLC',
        location: 'London, UK',
        description: 'Build web applications in Node.js and PostgreSQL.',
      });

      assert.equal(result.category, 'UNCLEAR');
      assert.equal(result.tier, 'NONE');
      assert.equal(result.sponsorsVisa, false);
    });

    it('rescues silent snippets via Prisma company.visaSponsorshipPolicy', () => {
      const result = classifySponsorshipTwoTier({
        title: 'Platform Engineer',
        location: 'Berlin, Germany',
        description: 'Scale Kubernetes clusters and Terraform pipelines.',
        company: {
          name: 'Bespoke EuroTech GmbH',
          visaSponsorshipPolicy: 'SPONSORS_EU_BLUE_CARD_AND_RELOCATION',
        },
      });

      assert.equal(result.category, 'KNOWN_SPONSOR_SILENT');
      assert.equal(result.tier, 'TIER_2_REGISTRY');
      assert.equal(result.sponsorsVisa, true);
      assert.ok(result.confidence >= 0.8);
      assert.equal(result.registryMatch?.matchedBy, 'company_policy');
    });
  });

  describe('4. Scoped Negative Refusal (NOT_SPONSORED)', () => {
    const refusalCases = [
      {
        companyName: 'Atlassian',
        description: 'US Citizens only due to federal compliance requirements.',
      },
      {
        companyName: 'Monzo',
        description: 'Security Clearance required for this infrastructure role.',
      },
      {
        companyName: 'Booking.com',
        description: 'We offer a relocation package locally, but cannot provide visa sponsorship.',
      },
      {
        companyName: 'Revolut',
        description: 'Applicants must already hold valid right to work without sponsorship.',
      },
    ];

    for (const { companyName, description } of refusalCases) {
      it(`classifies "${description.slice(0, 50)}..." at ${companyName} as NOT_SPONSORED despite registry match`, () => {
        const result = classifySponsorshipTwoTier({
          title: 'Senior Backend Engineer',
          companyName,
          location: 'London, UK',
          description,
        });

        assert.equal(result.category, 'NOT_SPONSORED');
        assert.equal(result.sponsorsVisa, false);
        assert.ok(result.confidence >= 0.85);
      });
    }

    it('overrides positive company.visaSponsorshipPolicy when job text explicitly refuses sponsorship', () => {
      const result = classifySponsorshipTwoTier({
        title: 'Senior Backend Engineer',
        companyName: 'Acme Robotics',
        company: {
          name: 'Acme Robotics',
          visaSponsorshipPolicy: 'SPONSORS',
        },
        description: 'Unfortunately we cannot provide visa sponsorship for this role.',
      });
      assert.equal(result.category, 'NOT_SPONSORED');
      assert.equal(result.sponsorsVisa, false);
    });
  });

  describe('5. Tokenized Relevance Fix (scoreJobTokenizedRelevance)', () => {
    it('scores "Backend Engineer" >= 75 against "Staff Software Engineer, Core Backend"', () => {
      const result = scoreJobTokenizedRelevance(
        {
          title: 'Staff Software Engineer, Core Backend',
          description: '',
          skills: [],
        },
        'Backend Engineer',
      );

      assert.equal(result.isRelevant, true);
      assert.ok(
        result.score >= 75,
        `Expected score >= 75 for "Staff Software Engineer, Core Backend", got ${result.score}`,
      );
    });

    it('scores "Backend Engineer" >= 75 against "Senior Distributed Systems Engineer"', () => {
      const result = scoreJobTokenizedRelevance(
        {
          title: 'Senior Distributed Systems Engineer',
          description: '',
          skills: [],
        },
        'Backend Engineer',
      );

      assert.equal(result.isRelevant, true);
      assert.ok(
        result.score >= 75,
        `Expected score >= 75 for "Senior Distributed Systems Engineer", got ${result.score}`,
      );
    });

    it('rejects unrelated frontend or non-technical roles', () => {
      const frontendResult = scoreJobTokenizedRelevance(
        {
          title: 'Senior Frontend React Engineer',
          description: 'Build UI design systems with React and CSS.',
          skills: ['React', 'CSS'],
        },
        'Backend Engineer',
      );
      assert.equal(frontendResult.isRelevant, false);
      assert.ok(frontendResult.score < 50);

      const salesResult = scoreJobTokenizedRelevance(
        {
          title: 'Account Executive',
          description: 'Sell backend engineer tooling to enterprise accounts.',
          skills: [],
        },
        'Backend Engineer',
      );
      assert.equal(salesResult.isRelevant, false);
      assert.equal(salesResult.score, 0);
    });
  });
});
