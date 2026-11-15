import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeAtsText,
  sanitizeResumeObject,
  deduplicateResumeHeader,
  stripMarkdownFormatting,
} from '../atsSanitizer.ts';
import { validateAsciiAtsSafety } from '../../validators/atsResumeValidators.ts';

describe('Universal ATS ASCII & PDF Sanitizer', () => {

  describe('Number-Range Arrow Variations & Anti-Smashing', () => {
    it('converts all arrow variations between numbers to explicit "to"', () => {
      // Standard ASCII arrow with spaces
      assert.equal(
        sanitizeAtsText('elevating Lighthouse scores from 62 -> 94'),
        'elevating Lighthouse scores from 62 to 94'
      );

      // Unicode arrow with spaces
      assert.equal(
        sanitizeAtsText('elevating Lighthouse scores from 62 → 94'),
        'elevating Lighthouse scores from 62 to 94'
      );

      // Unicode arrow without spaces
      assert.equal(
        sanitizeAtsText('elevating Lighthouse scores from 62→94'),
        'elevating Lighthouse scores from 62 to 94'
      );

      // Heavy arrow glyph (➔)
      assert.equal(
        sanitizeAtsText('elevating Lighthouse scores from 62➔94'),
        'elevating Lighthouse scores from 62 to 94'
      );

      // Fat arrow (=>)
      assert.equal(
        sanitizeAtsText('scores improved 62 => 94'),
        'scores improved 62 to 94'
      );

      // Long arrow (-->)
      assert.equal(
        sanitizeAtsText('scores improved 62 --> 94'),
        'scores improved 62 to 94'
      );

      // Tilde arrow (~>)
      assert.equal(
        sanitizeAtsText('scores improved 62~>94'),
        'scores improved 62 to 94'
      );

      // Triangles and pointer arrows (►, ▶, ❯, ›)
      assert.equal(
        sanitizeAtsText('scores improved 62 ► 94'),
        'scores improved 62 to 94'
      );
      assert.equal(
        sanitizeAtsText('scores improved 62 ❯ 94'),
        'scores improved 62 to 94'
      );
    });

    it('converts percentages, time units (s, ms), and volume units (k, M) with arrows', () => {
      // Percentages
      assert.equal(
        sanitizeAtsText('slashing bundle sizes by 35% -> 50%'),
        'slashing bundle sizes by 35% to 50%'
      );
      assert.equal(
        sanitizeAtsText('boosting throughput by 45% → 70%'),
        'boosting throughput by 45% to 70%'
      );

      // Seconds & milliseconds
      assert.equal(
        sanitizeAtsText('reducing LCP from 1.8s → 0.6s'),
        'reducing LCP from 1.8s to 0.6s'
      );
      assert.equal(
        sanitizeAtsText('cutting API latency from 250ms -> 35ms'),
        'cutting API latency from 250ms to 35ms'
      );

      // Metrics with k and M
      assert.equal(
        sanitizeAtsText('scaling event throughput from 10k -> 50k events/sec'),
        'scaling event throughput from 10k to 50k events/sec'
      );
      assert.equal(
        sanitizeAtsText('handling user growth from 5M → 25M daily users'),
        'handling user growth from 5M to 25M daily users'
      );

      // Multipliers and storage units & capitalized "From"
      assert.equal(
        sanitizeAtsText('accelerated throughput 2x -> 5x and cache 100GB ➔ 450GB'),
        'accelerated throughput 2x to 5x and cache 100GB to 450GB'
      );
      assert.equal(
        sanitizeAtsText('From 62 ⟹ 94 on production audits'),
        'From 62 to 94 on production audits'
      );
    });

    it('fixes accidental concatenated number ranges like "6294" or "(6294)" resulting from stripped glyphs', () => {
      assert.equal(
        sanitizeAtsText('Lighthouse Audits (6294)'),
        'Lighthouse Audits (62 to 94)'
      );

      assert.equal(
        sanitizeAtsText('elevating scores from 6294 in production'),
        'elevating scores from 62 to 94 in production'
      );
    });
  });

  describe('Punctuation, Dashes, Quotes, and Non-Standard Glyphs', () => {
    it('converts standalone non-ASCII arrows to standard ASCII "->"', () => {
      assert.equal(
        sanitizeAtsText('Event pipeline: Kafka → Flink → Cassandra'),
        'Event pipeline: Kafka -> Flink -> Cassandra'
      );

      assert.equal(
        sanitizeAtsText('Data flow: Client ➔ Gateway ➔ Microservices'),
        'Data flow: Client -> Gateway -> Microservices'
      );

      assert.equal(
        sanitizeAtsText('Architecture: Browser ➡ CDN ➡ Cloud Load Balancer'),
        'Architecture: Browser -> CDN -> Cloud Load Balancer'
      );
    });

    it('normalizes smart quotes (double & single) to standard ASCII quotes', () => {
      assert.equal(
        sanitizeAtsText('“High-concurrency” systems with ‘zero’ downtime and «banking» grade'),
        '"High-concurrency" systems with \'zero\' downtime and "banking" grade'
      );

      assert.equal(
        sanitizeAtsText('ʻModernʼ architectures with ❝scalable❞ design and ‟resilient” retry'),
        "'Modern' architectures with \"scalable\" design and \"resilient\" retry"
      );
    });

    it('normalizes em-dashes, en-dashes, and horizontal bars to standard hyphens', () => {
      assert.equal(
        sanitizeAtsText('Persistent Systems Ltd. — UnitedHealth Group'),
        'Persistent Systems Ltd. - UnitedHealth Group'
      );

      assert.equal(
        sanitizeAtsText('Oct 2023 – Present'),
        'Oct 2023 - Present'
      );

      assert.equal(
        sanitizeAtsText('Distributed architecture—event driven streaming'),
        'Distributed architecture - event driven streaming'
      );
    });

    it('normalizes non-standard bullets to clean hyphens', () => {
      const raw = `• Spearheaded enterprise architecture
● Designed streaming pipelines
◆ Maintained 99.999% availability
★ Automated deployment workflows`;

      const expected = `- Spearheaded enterprise architecture
- Designed streaming pipelines
- Maintained 99.999% availability
- Automated deployment workflows`;

      assert.equal(sanitizeAtsText(raw), expected);

      assert.equal(
        sanitizeAtsText('Docker ● Kubernetes ◆ Kafka ★ Terraform'),
        'Docker - Kubernetes - Kafka - Terraform'
      );
    });

    it('strips zero-width characters and replaces non-breaking spaces', () => {
      const dirty = 'React\u00A018\u200B and\u200C TypeScript\uFEFF\u200E';
      assert.equal(sanitizeAtsText(dirty), 'React 18 and TypeScript');
    });

    it('cleans HTML entity leaks (&amp;, &lt;, &gt;, &quot;, &#39;, &nbsp;, &mdash;)', () => {
      const entityStr = 'CI/CD &amp; Testing &lt;TypeScript &gt; &quot;Production&quot; &mdash; 99.99% &nbsp;uptime';
      assert.equal(
        sanitizeAtsText(entityStr),
        'CI/CD & Testing <TypeScript > "Production" - 99.99%  uptime'
      );
    });

    it('cleans leaked HTML tags, inline bold/italic markdown, and code backticks while preserving snake_case', () => {
      const htmlStr = 'Engineered **microservices** with `TypeScript`, __Kafka__, *low latency* in backend_distributed_systems<br/>cutting latency.';
      assert.equal(
        sanitizeAtsText(htmlStr),
        'Engineered microservices with TypeScript, Kafka, low latency in backend_distributed_systems\ncutting latency.'
      );
    });

    it('strips markdown formatting via stripMarkdownFormatting', () => {
      const markdown = '### Experience\n- **Led** [Team](https://example.com) with *speed*.';
      assert.equal(
        stripMarkdownFormatting(markdown),
        'Experience\n- Led Team (https://example.com) with speed.'
      );
    });
  });

  describe('Header Deduplication & Structured Object Sanitization', () => {
    it('deduplicates redundant visa/relocation lines in raw resume header', () => {
      const rawHeader = `Ashish Kumar Singh
Senior Staff Backend Engineer
Noida, India (Open to UK Relocation | Skilled Worker Visa Sponsorship Required)
Email: ashish.singh.careers@gmail.com | Phone: +91 7982169443
LinkedIn: linkedin.com/in/ashish-kumar-singh1986 | GitHub: github.com/guddiya001
Open to: Remote Visa Sponsorship Required`;

      const cleaned = deduplicateResumeHeader(rawHeader);
      assert.ok(!cleaned.includes('Open to: Remote Visa Sponsorship Required'));
      assert.ok(
        cleaned.includes('Noida, India (Open to UK Relocation | Skilled Worker Visa Sponsorship Required)')
      );

      const validation = validateAsciiAtsSafety(cleaned);
      assert.equal(validation.isValid, true);
      assert.deepEqual(validation.errors, []);
    });

    it('deeply sanitizes complex resume objects via sanitizeResumeObject', () => {
      const resumeObj = {
        basics: {
          name: 'Ashish Kumar Singh',
          location: 'Noida, India (Open to UK Relocation | Skilled Worker Visa Sponsorship Required)',
          openTo: 'Remote Visa Sponsorship Required',
          summary: 'Architecting distributed systems “from ground up” with 62 → 94 Lighthouse performance &amp; `Kafka`.',
        },
        experience: [
          {
            company: 'Persistent Systems Ltd. — UnitedHealth Group',
            period: 'Oct 2023 – Present',
            bullets: [
              'Elevated performance metrics from 62➔94 (Lighthouse Audits 6294).',
              '• Orchestrated Kafka → Flink event pipeline with latency 250ms -> 35ms.',
            ],
          },
        ],
        skills: {
          'Cloud & DevOps': ['AWS', 'GCP', 'Docker\u00A0K8s'],
        },
      };

      const sanitized = sanitizeResumeObject(resumeObj);

      // Redundant basics.openTo is cleared because basics.location already states visa sponsorship
      assert.equal(sanitized.basics.openTo, '');
      assert.equal(
        sanitized.basics.summary,
        'Architecting distributed systems "from ground up" with 62 to 94 Lighthouse performance & Kafka.'
      );
      assert.equal(
        sanitized.experience[0].company,
        'Persistent Systems Ltd. - UnitedHealth Group'
      );
      assert.equal(sanitized.experience[0].period, 'Oct 2023 - Present');
      assert.equal(
        sanitized.experience[0].bullets[0],
        'Elevated performance metrics from 62 to 94 (Lighthouse Audits 62 to 94).'
      );
      assert.equal(
        sanitized.experience[0].bullets[1],
        '- Orchestrated Kafka -> Flink event pipeline with latency 250ms to 35ms.'
      );
      assert.equal(sanitized.skills['Cloud & DevOps'][2], 'Docker K8s');
    });

    it('transforms the flawed Monzo resume text to pass validateAsciiAtsSafety 100%', () => {
      const flawedRawResumeText = `# Ashish Kumar Singh
Senior Staff Backend Engineer
Noida, India (Open to Relocation: Remote | Visa Sponsorship Required)
Email: ashish.singh.careers@gmail.com | Phone: +91 7982169443
LinkedIn: linkedin.com/in/ashish-kumar-singh1986 | GitHub: github.com/guddiya001
Open to: Remote Visa Sponsorship Required

---

## PROFESSIONAL SUMMARY
Staff- and Senior-level Frontend & Web Platform Engineer with 10+ years of experience architecting high-performance enterprise user interfaces. Driving dramatic performance optimizations: elevating Lighthouse scores from 62 → 94.

---

## CORE TECHNICAL SKILLS
- **Core Languages:** TypeScript, JavaScript, HTML5, CSS
- **Web Performance & UI:** Core Web Vitals, Lighthouse Audits (6294)

---

## WORK EXPERIENCE
### Persistent Systems Ltd. — UnitedHealth Group
Senior Engineering Lead | Oct 2023 – Present
- Engineered systematic web performance optimizations, elevating Google Lighthouse scores from 62 → 94 (Lighthouse Audits 6294).
`;

      // Before sanitization: fails on arrows, 6294, duplicate header
      const beforeValidation = validateAsciiAtsSafety(flawedRawResumeText);
      assert.equal(beforeValidation.isValid, false);
      assert.ok(beforeValidation.errors.length >= 2);

      // After sanitization
      const sanitizedText = sanitizeAtsText(flawedRawResumeText);
      const afterValidation = validateAsciiAtsSafety(sanitizedText);

      assert.equal(afterValidation.isValid, true);
      assert.deepEqual(afterValidation.errors, []);
      assert.ok(!sanitizedText.includes('6294'));
      assert.ok(!sanitizedText.includes('→'));
      assert.ok(sanitizedText.includes('62 to 94'));
    });
  });
});
