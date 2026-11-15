import { Test, TestingModule } from '@nestjs/testing';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { VisaIntelligenceService } from './intelligence/visa-intelligence.service';
import { jobRepository } from '@visapilot/database';
import { JobSource, JobType, WorkMode, VisaSponsorshipStatus } from '@visapilot/shared';

declare const jest: any;
declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;

const MOCK_JOB = {
  id: 'job-monzo-6036797',
  title: 'Backend Engineer - Core Banking',
  company: 'Monzo',
  location: 'London, UK',
  country: 'UK',
  description: 'Build distributed core banking transaction systems in Go and Cassandra at Monzo.',
  requirements: 'Go, Kafka, Cassandra, Distributed Systems, microservices',
  url: 'https://job-boards.greenhouse.io/monzo/jobs/6036797',
  source: JobSource.GREENHOUSE,
  type: JobType.FULL_TIME,
  workMode: WorkMode.HYBRID,
  visaSponsorship: true,
  visaSponsorshipStatus: VisaSponsorshipStatus.SPONSORS,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const MOCK_FORM_HTML = `
<form id="application_form">
  <input type="text" id="first_name" name="first_name" required="required" />
  <input type="text" id="last_name" name="last_name" required="required" />
  <input type="email" id="email" name="email" required="required" />
  <input type="file" id="resume" name="resume" required="required" />
  <label for="work_auth">Are you legally authorised to work in the UK?</label>
  <select id="work_auth" name="work_auth">
    <option value="">Select</option>
    <option value="1">Yes</option>
    <option value="0">No</option>
  </select>
  <label for="visa_sponsorship">Will you require visa sponsorship to work in the UK?</label>
  <select id="visa_sponsorship" name="visa_sponsorship">
    <option value="">Select</option>
    <option value="1">Yes</option>
    <option value="0">No</option>
  </select>
  <label for="why_monzo">Why Monzo?</label>
  <textarea id="why_monzo" name="why_monzo"></textarea>
</form>
`;

describe('Phase 6: JobsController & JobsService - Prepare Application API', () => {
  let controller: JobsController;
  let service: JobsService;

  beforeEach(async () => {
    jest.spyOn(jobRepository, 'findById').mockResolvedValue(MOCK_JOB as any);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobsController],
      providers: [
        JobsService,
        {
          provide: 'SearchAgent',
          useValue: { execute: jest.fn() },
        },
        {
          provide: VisaIntelligenceService,
          useValue: {
            buildCandidateProfile: jest.fn(),
            discoverAndRankJobs: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<JobsController>(JobsController);
    service = module.get<JobsService>(JobsService);
  });

  it('1. prepareApplication returns tailored resume URL, form answers, and autofill plan', async () => {
    const result = await controller.prepareApplication('job-monzo-6036797', {
      formHtml: MOCK_FORM_HTML,
      candidateProfile: {
        fullName: 'Arjun Sharma',
        firstName: 'Arjun',
        lastName: 'Sharma',
        email: 'arjun@example.com',
        currentCity: 'Noida',
        currentCountry: 'India',
        currentCountryCode: 'IN',
        requiresVisaSponsorship: true,
      },
    });

    expect(result.success).toBe(true);
    expect(result.data.jobId).toBe('job-monzo-6036797');
    expect(result.data.persona.id).toBe('BACKEND_DISTRIBUTED');
    expect(result.data.tailoredResumePdfUrl).toBeDefined();

    // Verify answers
    const answers = result.data.formAnswers;
    expect(answers.length).toBeGreaterThanOrEqual(5);

    const firstNameAns = answers.find((a: any) => a.fieldId === 'first_name');
    expect(firstNameAns?.suggestedAnswer).toBe('Arjun');

    // Work auth must be NO for India-based candidate applying to UK
    const workAuthAns = answers.find((a: any) => a.fieldId === 'work_auth');
    expect(workAuthAns?.suggestedAnswer).toBe('No');
    expect(workAuthAns?.selectedOptionValue).toBe('0');

    // Visa sponsorship must be YES
    const visaAns = answers.find((a: any) => a.fieldId === 'visa_sponsorship');
    expect(visaAns?.suggestedAnswer).toBe('Yes');
    expect(visaAns?.selectedOptionValue).toBe('1');

    // Why Monzo should be filled
    const whyMonzoAns = answers.find((a: any) => a.fieldId === 'why_monzo');
    expect(whyMonzoAns?.suggestedAnswer).toBeDefined();
    expect(whyMonzoAns?.category).toBe('OPEN_ENDED_TECHNICAL_OR_MOTIVATION');

    // Autofill plan
    const plan = result.data.autofillPlan;
    expect(plan.actions.length).toBeGreaterThanOrEqual(5);
    expect(plan.requiresHumanReview).toBe(false);

    const resumeAction = plan.actions.find((a: any) => a.action === 'upload');
    expect(resumeAction).toBeDefined();
  });

  it('2. flags requiresHumanReview = true when form contains CAPTCHA challenge', async () => {
    const captchaHtml = MOCK_FORM_HTML + `<div class="g-recaptcha" data-sitekey="xyz"></div>`;

    const result = await controller.prepareApplication('job-monzo-6036797', {
      formHtml: captchaHtml,
    });

    expect(result.success).toBe(true);
    expect(result.data.autofillPlan.requiresHumanReview).toBe(true);
    expect(result.data.autofillPlan.reviewReason).toMatch(/CAPTCHA/i);
  });
});
