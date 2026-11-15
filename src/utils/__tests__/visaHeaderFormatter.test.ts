import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatVisaLocationHeader,
  parseJobLocationPolicy,
  normalizeCountry,
  hasDuplicateVisaSubHeader,
  removeDuplicateVisaSubHeaders,
} from '../visaHeaderFormatter.ts';
import { validateVisaLocationClarity } from '../../validators/atsResumeValidators.ts';

describe('Universal Visa & Location Header Formatter', () => {

  describe('Jurisdiction-Specific Formatting', () => {
    it('formats UK roles with Skilled Worker Visa sponsorship (e.g. Monzo)', () => {
      const header = formatVisaLocationHeader('Noida, India', {
        country: 'UK',
        workMode: 'remote',
        sponsorsVisa: true,
      });

      assert.equal(
        header,
        'Noida, India (Open to UK Relocation | Skilled Worker Visa Sponsorship Required)'
      );

      const validation = validateVisaLocationClarity('UK', 'Remote within UK', header);
      assert.equal(validation.isValid, true);
      assert.deepEqual(validation.errors, []);
    });

    it('formats United Kingdom aliases (e.g. "United Kingdom", "great britain", "england") properly', () => {
      const aliases = ['United Kingdom', 'great britain', 'england', 'scotland'];
      for (const alias of aliases) {
        const header = formatVisaLocationHeader('Noida, India', {
          country: alias,
          workMode: 'hybrid',
          sponsorsVisa: true,
        });

        assert.equal(
          header,
          'Noida, India (Open to UK Relocation | Skilled Worker Visa Sponsorship Required)'
        );

        const validation = validateVisaLocationClarity(alias, 'Hybrid in London', header);
        assert.equal(validation.isValid, true);
      }
    });

    it('formats EU/Schengen Germany roles with EU Blue Card sponsorship', () => {
      const header = formatVisaLocationHeader('Noida, India', {
        country: 'Germany',
        workMode: 'hybrid',
        sponsorsVisa: true,
      });

      assert.equal(
        header,
        'Noida, India (Open to Germany Relocation | EU Blue Card / Visa Sponsorship Required)'
      );

      const validation = validateVisaLocationClarity('Germany', 'Hybrid in Berlin', header);
      assert.equal(validation.isValid, true);
      assert.deepEqual(validation.errors, []);
    });

    it('formats EU/Schengen Netherlands roles with EU Blue Card sponsorship', () => {
      const header = formatVisaLocationHeader('Noida, India', {
        country: 'Netherlands',
        workMode: 'remote',
        sponsorsVisa: true,
      });

      assert.equal(
        header,
        'Noida, India (Open to Netherlands Relocation | EU Blue Card / Visa Sponsorship Required)'
      );

      const validation = validateVisaLocationClarity('Netherlands', 'Remote in Netherlands', header);
      assert.equal(validation.isValid, true);
      assert.deepEqual(validation.errors, []);
    });

    it('formats other EU/Schengen countries (Ireland, France, Spain, Sweden, Poland, Switzerland)', () => {
      const euCountries = ['Ireland', 'France', 'Spain', 'Sweden', 'Poland', 'Switzerland'];
      for (const country of euCountries) {
        const header = formatVisaLocationHeader('Noida, India', {
          country,
          workMode: 'hybrid',
          sponsorsVisa: true,
        });

        assert.equal(
          header,
          `Noida, India (Open to ${country} Relocation | EU Blue Card / Visa Sponsorship Required)`
        );
      }
    });

    it('formats US/Canada roles with standard relocation and visa sponsorship', () => {
      // US role
      const headerUS = formatVisaLocationHeader('Noida, India', {
        country: 'USA',
        workMode: 'hybrid',
        sponsorsVisa: true,
      });

      assert.equal(
        headerUS,
        'Noida, India (Open to Relocation | Visa Sponsorship Required)'
      );

      const validationUS = validateVisaLocationClarity('USA', 'Hybrid in New York', headerUS);
      assert.equal(validationUS.isValid, true);

      // Canada role
      const headerCanada = formatVisaLocationHeader('Noida, India', {
        country: 'Canada',
        workMode: 'remote',
        sponsorsVisa: true,
      });

      assert.equal(
        headerCanada,
        'Noida, India (Open to Relocation | Visa Sponsorship Required)'
      );

      const validationCanada = validateVisaLocationClarity('Canada', 'Remote in Toronto', headerCanada);
      assert.equal(validationCanada.isValid, true);
    });

    it('formats Singapore roles with Employment Pass sponsorship', () => {
      const header = formatVisaLocationHeader('Noida, India', {
        country: 'Singapore',
        workMode: 'onsite',
        sponsorsVisa: true,
      });

      assert.equal(
        header,
        'Noida, India (Open to Singapore Relocation | Employment Pass / Visa Sponsorship Required)'
      );

      const validation = validateVisaLocationClarity('Singapore', 'Onsite in Singapore', header);
      assert.equal(validation.isValid, true);
      assert.deepEqual(validation.errors, []);
    });

    it('formats other international countries (e.g. Australia, Japan) with country relocation', () => {
      const headerAustralia = formatVisaLocationHeader('Noida, India', {
        country: 'Australia',
        workMode: 'hybrid',
        sponsorsVisa: true,
      });

      assert.equal(
        headerAustralia,
        'Noida, India (Open to Australia Relocation | Visa Sponsorship Required)'
      );

      const validationAustralia = validateVisaLocationClarity('Australia', 'Hybrid in Sydney', headerAustralia);
      assert.equal(validationAustralia.isValid, true);

      const headerJapan = formatVisaLocationHeader('Noida, India', {
        country: 'Japan',
        workMode: 'onsite',
        sponsorsVisa: true,
      });

      assert.equal(
        headerJapan,
        'Noida, India (Open to Japan Relocation | Visa Sponsorship Required)'
      );
    });

    it('formats Global / Worldwide Remote roles with candidate timezone', () => {
      const headerWorldwide = formatVisaLocationHeader('Noida, India', {
        country: 'Worldwide',
        workMode: 'remote',
        sponsorsVisa: false,
      });

      assert.equal(
        headerWorldwide,
        'Noida, India (Open to Global Remote | UTC+5:30)'
      );

      const validationWorldwide = validateVisaLocationClarity('Worldwide', 'Global Remote', headerWorldwide);
      assert.equal(validationWorldwide.isValid, true);

      const headerGlobal = formatVisaLocationHeader('Noida, India', {
        country: 'Global',
        workMode: 'remote',
        sponsorsVisa: false,
      });
      assert.equal(headerGlobal, 'Noida, India (Open to Global Remote | UTC+5:30)');
    });

    it('supports custom candidate location city', () => {
      const header = formatVisaLocationHeader('Bengaluru, India', {
        country: 'UK',
        workMode: 'remote',
        sponsorsVisa: true,
      });

      assert.equal(
        header,
        'Bengaluru, India (Open to UK Relocation | Skilled Worker Visa Sponsorship Required)'
      );
    });
  });

  describe('Universal JD Parsing & Location Extraction', () => {
    it('parses target country, city, and sponsorship directly from raw Monzo UK JD text', () => {
      const rawJd = `
        Senior Staff Backend Engineer
        Company: Monzo Bank
        Location: London, United Kingdom (Remote within the UK)
        We offer visa sponsorship for this role (Skilled Worker Visa) and relocation support.
      `;

      const policy = parseJobLocationPolicy(rawJd);
      assert.equal(policy.country, 'UK');
      assert.equal(policy.city, 'London');
      assert.equal(policy.workMode, 'remote');
      assert.equal(policy.sponsorsVisa, true);

      const header = formatVisaLocationHeader('Noida, India', rawJd);
      assert.equal(
        header,
        'Noida, India (Open to UK Relocation | Skilled Worker Visa Sponsorship Required)'
      );
    });

    it('parses target country and EU Blue Card sponsorship from Berlin Germany JD text', () => {
      const rawJd = `
        Staff Infrastructure Engineer at Delivery Hero
        Location: Berlin, Germany
        Work arrangement: 2 days in office (Hybrid)
        Relocation package and EU Blue Card sponsorship provided.
      `;

      const policy = parseJobLocationPolicy(rawJd);
      assert.equal(policy.country, 'Germany');
      assert.equal(policy.city, 'Berlin');
      assert.equal(policy.workMode, 'hybrid');
      assert.equal(policy.sponsorsVisa, true);

      const header = formatVisaLocationHeader('Noida, India', rawJd);
      assert.equal(
        header,
        'Noida, India (Open to Germany Relocation | EU Blue Card / Visa Sponsorship Required)'
      );
    });

    it('parses Toronto Canada JD and formats for US/Canada jurisdiction', () => {
      const rawJd = `
        Staff Software Engineer at Shopify
        Location: Toronto, Canada (Remote in Canada)
        Visa sponsorship available for qualifying candidates.
      `;

      const policy = parseJobLocationPolicy(rawJd);
      assert.equal(policy.country, 'Canada');
      assert.equal(policy.city, 'Toronto');
      assert.equal(policy.workMode, 'remote');
      assert.equal(policy.sponsorsVisa, true);

      const header = formatVisaLocationHeader('Noida, India', rawJd);
      assert.equal(
        header,
        'Noida, India (Open to Relocation | Visa Sponsorship Required)'
      );
    });

    it('parses New York USA JD and formats for US jurisdiction', () => {
      const rawJd = `
        Principal Distributed Systems Engineer
        Company: Datadog
        Location: New York, USA | Hybrid
        We are open to candidates requiring visa sponsorship.
      `;

      const policy = parseJobLocationPolicy(rawJd);
      assert.equal(policy.country, 'USA');
      assert.equal(policy.city, 'New York');
      assert.equal(policy.workMode, 'hybrid');
      assert.equal(policy.sponsorsVisa, true);

      const header = formatVisaLocationHeader('Noida, India', rawJd);
      assert.equal(
        header,
        'Noida, India (Open to Relocation | Visa Sponsorship Required)'
      );
    });

    it('parses Worldwide Global Remote JD with zero country requirement', () => {
      const rawJd = `
        Backend Engineer at GitLab
        Location: Worldwide Remote / Anywhere
        Work from anywhere in the world.
      `;

      const policy = parseJobLocationPolicy(rawJd);
      assert.equal(policy.country, 'Worldwide');
      assert.equal(policy.workMode, 'remote');

      const header = formatVisaLocationHeader('Noida, India', rawJd);
      assert.equal(header, 'Noida, India (Open to Global Remote | UTC+5:30)');
    });

    it('detects negative visa sponsorship policies ("no sponsorship / must be authorized")', () => {
      const rawJd = `
        Senior Software Engineer
        Location: Austin, USA
        Applicants must have permanent work authorization. No visa sponsorship provided.
      `;

      const policy = parseJobLocationPolicy(rawJd);
      assert.equal(policy.country, 'USA');
      assert.equal(policy.sponsorsVisa, false);

      const header = formatVisaLocationHeader('Noida, India', policy);
      assert.ok(!header.includes('Visa Sponsorship Required'));
    });

    it('parses UAE (Dubai), Denmark (Copenhagen), Remote - US, and Remote - EU accurately', () => {
      const dubaiPolicy = parseJobLocationPolicy('Staff Platform Engineer at Careem - Dubai (Relocation + Visa provided)');
      assert.equal(dubaiPolicy.country, 'UAE');
      assert.equal(dubaiPolicy.city, 'Dubai');
      assert.equal(
        formatVisaLocationHeader('Noida, India', dubaiPolicy),
        'Noida, India (Open to UAE Relocation | Visa Sponsorship Required)'
      );

      const cphPolicy = parseJobLocationPolicy('Senior Backend Engineer in Copenhagen, Hybrid');
      assert.equal(cphPolicy.country, 'Denmark');
      assert.equal(cphPolicy.workMode, 'hybrid');
      assert.equal(
        formatVisaLocationHeader('Noida, India', cphPolicy),
        'Noida, India (Open to Denmark Relocation | EU Blue Card / Visa Sponsorship Required)'
      );

      const usRemotePolicy = parseJobLocationPolicy('Principal Engineer - Remote (US). Join us to scale systems.');
      assert.equal(usRemotePolicy.country, 'USA');
      assert.equal(
        formatVisaLocationHeader('Noida, India', usRemotePolicy),
        'Noida, India (Open to Relocation | Visa Sponsorship Required)'
      );

      const euRemotePolicy = parseJobLocationPolicy('Lead AI Engineer - Remote (EU)');
      assert.equal(euRemotePolicy.country, 'EU');
      assert.equal(
        formatVisaLocationHeader('Noida, India', euRemotePolicy),
        'Noida, India (Open to EU Relocation | EU Blue Card / Visa Sponsorship Required)'
      );
    });
  });

  describe('Deduplication & Defect Catching', () => {
    it('detects and eliminates duplicate location/visa sub-headers from raw resume header', () => {
      const rawHeaderWithDuplicates = `
        Ashish Kumar Singh
        Senior Staff Backend Engineer
        Noida, India (Open to UK Relocation | Skilled Worker Visa Sponsorship Required)
        Email: ashish.singh.careers@gmail.com | Phone: +91 7982169443
        LinkedIn: linkedin.com/in/ashish-kumar-singh1986 | GitHub: github.com/guddiya001
        Open to: Remote Visa Sponsorship Required
      `;

      assert.equal(hasDuplicateVisaSubHeader(rawHeaderWithDuplicates), true);

      const deduplicated = removeDuplicateVisaSubHeaders(rawHeaderWithDuplicates);
      assert.equal(hasDuplicateVisaSubHeader(deduplicated), false);
      assert.ok(!deduplicated.includes('Open to: Remote Visa Sponsorship Required'));
      assert.ok(
        deduplicated.includes('Noida, India (Open to UK Relocation | Skilled Worker Visa Sponsorship Required)')
      );
    });

    it('deduplicates secondary Open to lines on Global Remote headers', () => {
      const globalWithDup = `
        Ashish Kumar Singh
        Noida, India (Open to Global Remote | UTC+5:30)
        Open to: Remote Visa Sponsorship Required
      `;

      assert.equal(hasDuplicateVisaSubHeader(globalWithDup), true);
      const deduplicated = removeDuplicateVisaSubHeaders(globalWithDup);
      assert.equal(hasDuplicateVisaSubHeader(deduplicated), false);
      assert.ok(deduplicated.includes('Noida, India (Open to Global Remote | UTC+5:30)'));
      assert.ok(!deduplicated.includes('Open to: Remote Visa Sponsorship Required'));
    });

    it('catches flawed ambiguous header and passes validateVisaLocationClarity with clean replacement', () => {
      const flawedHeader = 'Noida, India (Open to Relocation: Remote | Visa Sponsorship Required)';
      const flawedValidation = validateVisaLocationClarity('UK', 'Remote within UK', flawedHeader);
      assert.equal(flawedValidation.isValid, false);
      assert.ok(flawedValidation.errors.length > 0);

      // Clean replacement passes 100%
      const cleanHeader = formatVisaLocationHeader('Noida, India', {
        country: 'UK',
        workMode: 'remote',
        sponsorsVisa: true,
      });
      const cleanValidation = validateVisaLocationClarity('UK', 'Remote within UK', cleanHeader);
      assert.equal(cleanValidation.isValid, true);
      assert.deepEqual(cleanValidation.errors, []);
    });
  });
});
