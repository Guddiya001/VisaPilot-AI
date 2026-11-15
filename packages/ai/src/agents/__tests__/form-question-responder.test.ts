import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractApplicationForm,
  type ExtractedFormField,
  type ExtractedApplicationForm,
} from '@visapilot/crawler';
import {
  FormQuestionResponder,
  classifyFormQuestion,
  type CandidateProfile,
  type FormQuestionCategory,
  BANNED_AI_WORDS,
} from '../form-question-responder.ts';
import { selectPersonaForJob, ENGINEERING_PERSONAS } from '../persona-router.ts';

const MOCK_MONZO_GREENHOUSE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head><title>Backend Engineer - Core Banking at Monzo</title></head>
<body>
  <div id="header">
    <h1 class="app-title">Backend Engineer - Core Banking</h1>
    <span class="company-name">Monzo</span>
    <div class="location">London, UK</div>
  </div>
  <form id="application_form" action="https://boards.greenhouse.io/monzo/jobs/6036797" method="POST">
    <div class="field">
      <label for="first_name">First Name <span class="asterisk">*</span></label>
      <input type="text" id="first_name" name="first_name" required="required" />
    </div>
    <div class="field">
      <label for="last_name">Last Name <span class="asterisk">*</span></label>
      <input type="text" id="last_name" name="last_name" required="required" />
    </div>
    <div class="field">
      <label for="email">Email <span class="asterisk">*</span></label>
      <input type="email" id="email" name="email" required="required" />
    </div>
    <div class="field">
      <label for="phone">Phone</label>
      <input type="tel" id="phone" name="phone" />
    </div>
    <div class="field">
      <label for="resume">Resume/CV <span class="asterisk">*</span></label>
      <input type="file" id="resume" name="resume" required="required" />
    </div>
    <div class="field">
      <label for="linkedin_url">LinkedIn Profile</label>
      <input type="text" id="linkedin_url" name="job_application[answers_attributes][0][text_value]" />
    </div>
    <div class="field">
      <label for="job_application_answers_attributes_1_boolean_value">
        Are you legally authorised to work in the UK? <span class="asterisk">*</span>
      </label>
      <select id="job_application_answers_attributes_1_boolean_value" name="job_application[answers_attributes][1][boolean_value]" required="required">
        <option value="">-- Please select --</option>
        <option value="1">Yes</option>
        <option value="0">No</option>
      </select>
    </div>
    <div class="field">
      <label for="job_application_answers_attributes_2_boolean_value">
        Will you require visa sponsorship to work in the UK? <span class="asterisk">*</span>
      </label>
      <select id="job_application_answers_attributes_2_boolean_value" name="job_application[answers_attributes][2][boolean_value]" required="required">
        <option value="">-- Please select --</option>
        <option value="1">Yes</option>
        <option value="0">No</option>
      </select>
    </div>
    <div class="field">
      <label for="job_application_answers_attributes_3_text_value">
        Why Monzo? What excites you about our mission?
      </label>
      <textarea id="job_application_answers_attributes_3_text_value" name="job_application[answers_attributes][3][text_value]"></textarea>
    </div>
    <div class="field">
      <label for="job_application_answers_attributes_4_text_value">
        Tell us about a distributed systems challenge you solved.
      </label>
      <textarea id="job_application_answers_attributes_4_text_value" name="job_application[answers_attributes][4][text_value]"></textarea>
    </div>
    <div class="field">
      <label for="gender">Gender</label>
      <select id="gender" name="job_application[gender]">
        <option value="">-- Please select --</option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
        <option value="Prefer not to say">Prefer not to say</option>
      </select>
    </div>
    <div class="field">
      <label for="notice_period">What is your notice period?</label>
      <input type="text" id="notice_period" name="job_application[notice_period]" />
    </div>
    <button type="submit" id="submit_app">Submit Application</button>
  </form>
</body>
</html>
`;

const CANDIDATE_PROFILE: CandidateProfile = {
  fullName: 'Arjun Sharma',
  firstName: 'Arjun',
  lastName: 'Sharma',
  email: 'arjun.sharma@example.com',
  phone: '+91 98765 43210',
  currentCity: 'Noida',
  currentCountry: 'India',
  currentCountryCode: 'IN',
  linkedInUrl: 'https://linkedin.com/in/arjun-sharma-dev',
  githubUrl: 'https://github.com/arjunsharma',
  portfolioUrl: 'https://arjunsharma.dev',
  requiresVisaSponsorship: true,
  targetCountries: ['UK', 'DE', 'NL'],
  noticePeriod: '30 days',
  earliestStartDate: '1 month',
  salaryExpectations: {
    currency: 'GBP',
    minimum: 95000,
    expected: 110000,
  },
  eeoPreferences: {
    gender: 'Prefer not to say',
    ethnicity: 'Prefer not to say',
    veteran: 'Prefer not to say',
    disability: 'Prefer not to say',
  },
  primaryPersona: 'BACKEND_DISTRIBUTED',
  workExperience: [
    {
      company: 'DBS Bank',
      role: 'Senior Backend Engineer',
      highlights: [
        'Architected distributed event-driven payment ledger in Go and Kafka handling 15,000 TPS',
        'Reduced p99 settlement latency from 450ms to 65ms across 12 microservices',
      ],
    },
  ],
};

describe('Phase 6: Application Form Question Analyzer & Auto-Fill Pipeline', () => {
  it('1. ATS Form Extraction: extracts standard fields, custom selects, and textareas from Greenhouse HTML', () => {
    const form: ExtractedApplicationForm = extractApplicationForm(
      MOCK_MONZO_GREENHOUSE_HTML,
      'https://job-boards.greenhouse.io/monzo/jobs/6036797',
    );

    assert.equal(form.atsProvider, 'greenhouse');
    assert.equal(form.hasCaptcha, false);
    assert.ok(form.fields.length >= 8);

    const firstNameField = form.fields.find((f) => f.fieldId === 'first_name');
    assert.ok(firstNameField);
    assert.equal(firstNameField.type, 'text');
    assert.equal(firstNameField.required, true);

    const emailField = form.fields.find((f) => f.fieldId === 'email');
    assert.ok(emailField);
    assert.equal(emailField.required, true);

    const resumeField = form.fields.find((f) => f.fieldId === 'resume');
    assert.ok(resumeField);
    assert.equal(resumeField.type, 'file');
    assert.equal(resumeField.required, true);

    const workAuthField = form.fields.find((f) =>
      /authorised to work in the uk/i.test(f.label),
    );
    assert.ok(workAuthField);
    assert.equal(workAuthField.type, 'select');
    assert.equal(workAuthField.required, true);
    assert.ok(workAuthField.options && workAuthField.options.length >= 2);

    const visaSponsorshipField = form.fields.find((f) =>
      /require visa sponsorship/i.test(f.label),
    );
    assert.ok(visaSponsorshipField);
    assert.equal(visaSponsorshipField.type, 'select');

    const whyMonzoField = form.fields.find((f) => /why monzo/i.test(f.label));
    assert.ok(whyMonzoField);
    assert.equal(whyMonzoField.type, 'textarea');
  });

  it('2. Visa Knockout Safety: strictly answers No to current authorization and Yes to sponsorship needed for India-to-UK candidate', async () => {
    const responder = new FormQuestionResponder();

    // 1. Current Work Auth Question
    const authCategory = classifyFormQuestion(
      'Are you legally authorised to work in the UK?',
      ['Yes', 'No'],
    );
    assert.equal(authCategory, 'VISA_CURRENT_AUTHORIZATION');

    const authAnswer = await responder.answerDeterministicQuestion({
      question: 'Are you legally authorised to work in the UK?',
      category: authCategory,
      fieldType: 'select',
      options: [
        { label: 'Yes', value: '1' },
        { label: 'No', value: '0' },
      ],
      candidateProfile: CANDIDATE_PROFILE,
      jobTargetCountry: 'UK',
    });

    assert.equal(authAnswer.suggestedAnswer, 'No');
    assert.equal(authAnswer.selectedOptionValue, '0');
    assert.equal(authAnswer.isKnockoutRisk, false); // Answering "No" truthfully is compliant

    // Confirm that it NEVER outputs Yes for current authorization
    assert.notEqual(authAnswer.suggestedAnswer.toLowerCase(), 'yes');

    // 2. Visa Sponsorship Needed Question
    const sponsorshipCategory = classifyFormQuestion(
      'Will you require visa sponsorship to work in the UK?',
      ['Yes', 'No'],
    );
    assert.equal(sponsorshipCategory, 'VISA_SPONSORSHIP_NEEDED');

    const sponsorshipAnswer = await responder.answerDeterministicQuestion({
      question: 'Will you require visa sponsorship to work in the UK?',
      category: sponsorshipCategory,
      fieldType: 'select',
      options: [
        { label: 'Yes', value: '1' },
        { label: 'No', value: '0' },
      ],
      candidateProfile: CANDIDATE_PROFILE,
      jobTargetCountry: 'UK',
    });

    assert.equal(sponsorshipAnswer.suggestedAnswer, 'Yes');
    assert.equal(sponsorshipAnswer.selectedOptionValue, '1');

    // 3. Free text sponsorship explanation should be jurisdiction-specific
    const textSponsorshipAnswer = await responder.answerDeterministicQuestion({
      question: 'Please state your visa status or sponsorship requirements:',
      category: 'VISA_SPONSORSHIP_NEEDED',
      fieldType: 'text',
      candidateProfile: CANDIDATE_PROFILE,
      jobTargetCountry: 'UK',
    });

    assert.match(
      textSponsorshipAnswer.suggestedAnswer,
      /UK Skilled Worker|visa sponsorship/i,
    );
  });

  it('3. Persona-Grounded & Human-Toned Open Answers: references backend/distributed systems, bans robotic AI buzzwords, concise', async () => {
    const persona = selectPersonaForJob(
      'Backend Engineer - Core Banking',
      'Build distributed transaction processing systems in Go with Kafka and Cassandra at Monzo.',
    );
    assert.equal(persona.id, 'BACKEND_DISTRIBUTED');

    const responder = new FormQuestionResponder();

    // Mock an LLM response to verify sanitization and persona prompt construction
    const mockLlm = {
      generate: async () => ({
        content: JSON.stringify({
          answers: [
            {
              questionId: 'q_why_monzo',
              answer:
                'I built high-throughput transaction pipelines at DBS Bank handling 15k TPS and admire Monzo’s distributed microservices architecture in Go. Working on high-availability ledger systems matches the systems engineering challenges I enjoy tackling.',
            },
          ],
        }),
        model: 'minimax-m3:cloud',
        durationMs: 45,
      }),
    };

    const results = await responder.answerOpenEndedBatch({
      questions: [
        {
          id: 'q_why_monzo',
          question: 'Why Monzo? What excites you about our mission?',
        },
      ],
      candidateProfile: CANDIDATE_PROFILE,
      persona,
      jobContext: {
        company: 'Monzo',
        title: 'Backend Engineer - Core Banking',
        description: 'Build distributed banking systems in Go and Cassandra.',
      },
      llmClient: mockLlm as any,
    });

    assert.equal(results.length, 1);
    const answer = results[0].answer;

    // First person voice
    assert.match(answer, /\b(I|my|I've|I built|At DBS Bank)\b/i);

    // Backend relevance
    assert.match(answer, /distributed|microservices|transaction|Go|TPS|ledger/i);

    // ZERO frontend contamination
    assert.doesNotMatch(answer, /frontend|react|css|html|lighthouse|tailwind/i);

    // ZERO banned AI buzzwords
    for (const banned of BANNED_AI_WORDS) {
      assert.doesNotMatch(
        answer.toLowerCase(),
        new RegExp(`\\b${banned}\\b`, 'i'),
        `Answer must not contain banned buzzword "${banned}"`,
      );
    }

    // Concise (3-5 sentences max)
    const sentenceCount = answer.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
    assert.ok(sentenceCount >= 1 && sentenceCount <= 5, `Expected 1-5 sentences, got ${sentenceCount}`);
  });

  it('4. Single Batch LLM Call: answers 5 open-ended custom questions in exactly 1 llm.generate() call', async () => {
    const responder = new FormQuestionResponder();
    let generateCalls = 0;

    const mockLlm = {
      generate: async (params: any) => {
        generateCalls++;
        assert.ok(params.responseSchema, 'Must pass responseSchema to LLM call');
        return {
          content: JSON.stringify({
            answers: [
              { questionId: 'q1', answer: 'I built event-driven services in Go at DBS Bank.' },
              { questionId: 'q2', answer: 'I handled network partitions using idempotent Kafka consumers.' },
              { questionId: 'q3', answer: 'I optimized p99 database latency by redesigning indexing.' },
              { questionId: 'q4', answer: 'I write unit tests and integration tests with mocks.' },
              { questionId: 'q5', answer: 'Monzo’s engineering culture and open banking focus aligns with my experience.' },
            ],
          }),
          model: 'minimax-m3:cloud',
          durationMs: 120,
        };
      },
    };

    const questions = [
      { id: 'q1', question: 'Tell us about your backend experience.' },
      { id: 'q2', question: 'How do you handle distributed consistency?' },
      { id: 'q3', question: 'Describe a complex performance issue you solved.' },
      { id: 'q4', question: 'What is your testing philosophy?' },
      { id: 'q5', question: 'Why are you interested in our team?' },
    ];

    const results = await responder.answerOpenEndedBatch({
      questions,
      candidateProfile: CANDIDATE_PROFILE,
      persona: ENGINEERING_PERSONAS.BACKEND_DISTRIBUTED,
      jobContext: {
        company: 'Monzo',
        title: 'Backend Engineer',
        description: 'Distributed Go microservices',
      },
      llmClient: mockLlm as any,
    });

    assert.equal(generateCalls, 1, 'Must execute exactly 1 LLM call for all 5 questions');
    assert.equal(results.length, 5);
  });
});

