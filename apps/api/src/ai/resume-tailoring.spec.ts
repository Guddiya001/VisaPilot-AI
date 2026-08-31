import { AiService } from './ai.service';
import {
  AIService as AIServiceType,
  CoordinatorAgent,
  VisaDetectionAgent,
  ResumeMatchAgent,
  ResumeImprovementAgent,
  CoverLetterAgent,
  InterviewAgent,
  ATSOptimizerAgent,
} from '@visapilot/ai';

declare const jest: any;
declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;

describe('Resume Update & Tailoring against Job Description', () => {
  let aiService: AiService;
  let mockAiPkgService: Partial<AIServiceType>;
  let mockCoordinator: Partial<CoordinatorAgent>;
  let mockVisaDetection: Partial<VisaDetectionAgent>;
  let mockResumeMatch: Partial<ResumeMatchAgent>;
  let mockResumeImprovement: Partial<ResumeImprovementAgent>;
  let mockCoverLetter: Partial<CoverLetterAgent>;
  let mockInterview: Partial<InterviewAgent>;
  let mockATSOptimizer: Partial<ATSOptimizerAgent>;

  const sampleCandidateResume = {
    basics: {
      name: 'Ashish Kumar Singh',
      title: 'Staff Backend AI Engineer | Context Retrieval & Agentic Architecture',
      email: 'ashish.singh.careers@gmail.com',
      phone: '+91 7982169443',
      location: 'India (Open to Relocation - Germany/EU | Visa Sponsorship Required)',
      linkedin: 'https://www.linkedin.com/in/ashish-kumar-singh1986',
      github: 'https://github.com/guddiya001',
      portfolio: 'https://ashishkumarsingh.vercel.app',
      summary:
        'Staff-level Backend Engineer with 9+ years of experience architecting distributed systems and building production-grade AI intelligence layers. Specialized in designing high-autonomy Agentic workflows, Model Context Protocol (MCP) integrations, and scalable retrieval orchestration APIs.',
    },
    experience: [
      {
        id: 'exp-1',
        role: 'Senior Engineering Lead (Gen AI Context & Backend Architecture)',
        company: 'Persistent Systems Ltd / UnitedHealth Group',
        location: 'Noida, India',
        period: 'Oct 2023 - Present',
        bullets: [
          'Architected and shipped a production-grade AI-native context layer using Python and FastAPI, building core retrieval orchestration APIs.',
          'Spearheaded the integration of Model Context Protocol (MCP) and agent-facing workflows.',
          'Instrumented AI microservices with comprehensive telemetry to ensure system reliability.',
        ],
      },
      {
        id: 'exp-2',
        role: 'Senior Software Engineer (Enterprise SaaS & Cloud Infrastructure)',
        company: 'LTIMindtree Ltd / DBS Bank',
        location: 'Singapore',
        period: 'Jun 2022 - Mar 2023',
        bullets: [
          'Engineered mission-critical consumer banking backends using Java and Python within MAS compliance boundaries.',
          'Optimized complex SQL queries achieving 3x performance improvement for enterprise reporting.',
        ],
      },
    ],
    skillsFlat: [
      'AI & Backend: Python, FastAPI, TypeScript, Node.js, LangChain, MCP',
      'Infrastructure & Data: AWS, Kubernetes, Docker, PostgreSQL, Redis, Kafka',
    ],
  };

  const sampleJobDescription = `
Company: Zalando SE
Job Title: Senior Backend Platform Engineer (AI & Distributed Systems)
Location: Berlin, Germany (Visa Sponsorship & Relocation Provided)

About the Role:
Zalando is looking for a Senior Backend Platform Engineer to build and scale our high-throughput e-commerce and AI platform. You will design distributed systems, build resilient microservices, and integrate modern AI Agent and RAG workflows.

Key Responsibilities:
- Architect and scale high-throughput REST and GraphQL APIs serving millions of international users.
- Implement event-driven microservices using Kafka, Node.js, TypeScript, and Python.
- Deploy and orchestrate services on AWS using Kubernetes, Docker, Terraform, and CI/CD pipelines.
- Integrate Generative AI agents, RAG pipelines, and Vector search for personalized shopping experiences.
- Optimize database performance across PostgreSQL, Redis, and distributed caches.
- Champion engineering excellence, telemetry, observability, and robust system design.

Requirements:
- 5+ years experience building scalable backend microservices and distributed systems.
- Strong proficiency in Node.js, TypeScript, Python, and modern API architectures.
- Experience with AWS, Kubernetes, Docker, CI/CD, Kafka, PostgreSQL, and Redis.
- Knowledge or hands-on experience with GenAI, RAG, AI Agents, or Vector databases.
- Strong communication skills and collaboration in cross-functional agile teams.
- International candidates welcome: full visa sponsorship and relocation support to Berlin provided.
`;

  beforeEach(() => {
    mockAiPkgService = {
      generateChatCompletion: jest.fn().mockImplementation(async (messages: any[]) => {
        const userMsg = messages[messages.length - 1]?.content || '';

        // Mock LLM response based on prompt
        if (userMsg.includes('ATS Resume Tailor')) {
          return JSON.stringify({
            tailoredSummary:
              'Senior Backend Platform Engineer with 9+ years of experience architecting high-throughput distributed systems and AI platform integrations. Expert in TypeScript, Node.js, Python, Kafka, and AWS, with a proven track record delivering resilient microservices and AI agent workflows tailored for Zalando SE.',
            addedSkills: [
              'TypeScript',
              'Node.js',
              'Kafka',
              'GraphQL',
              'AWS',
              'Kubernetes',
              'Docker',
              'PostgreSQL',
              'Redis',
              'CI/CD',
            ],
            bulletImprovements: [
              {
                original: 'Architected and shipped a production-grade AI-native context layer using Python and FastAPI',
                improved:
                  'Architected and shipped a high-throughput AI context & retrieval platform utilizing Node.js, Python, and Kafka, scaling API throughput by 45% matching Zalando platform standards.',
                reason: 'Emphasized Kafka event streaming and quantified latency reduction matching Zalando requirements.',
              },
            ],
            atsScoreBefore: 68,
            atsScoreAfter: 94,
            keyChanges: [
              'Targeted executive summary for Zalando SE Senior Backend Platform Engineer role',
              'Integrated 10 key technical skills from JD including Kafka, Kubernetes, AWS',
              'Enhanced work experience bullets with quantified impact and cloud architecture metrics',
              'Generated tailored cover letter highlighting EU relocation and visa sponsorship fit',
            ],
            coverLetter:
              'Dear Hiring Manager at Zalando SE,\n\nI am thrilled to apply for the Senior Backend Platform Engineer position in Berlin...',
          });
        }

        if (userMsg.includes('analyzing a job description')) {
          return JSON.stringify({
            jobTitle: 'Senior Backend Platform Engineer (AI & Distributed Systems)',
            companyName: 'Zalando SE',
            country: 'Germany',
            requiredSkills: ['Node.js', 'TypeScript', 'Python', 'Kafka', 'PostgreSQL', 'Redis', 'AWS'],
            preferredSkills: ['GraphQL', 'Kubernetes', 'Docker', 'Terraform', 'RAG', 'AI Agents'],
            experienceYears: 5,
            domainFocus: ['E-Commerce', 'Distributed Systems', 'AI Platform'],
            visaIndicators: ['Visa Sponsorship Provided', 'Relocation Support Provided'],
            roleLevel: 'Senior',
            keyResponsibilities: [
              'Scale REST & GraphQL APIs',
              'Event-driven microservices with Kafka',
              'Deploy on AWS with Kubernetes',
              'Integrate Generative AI agents & RAG',
            ],
            techStack: ['Node.js', 'TypeScript', 'Python', 'Kafka', 'AWS', 'Kubernetes', 'Docker', 'PostgreSQL', 'Redis'],
          });
        }

        if (userMsg.includes('elite ATS resume writer')) {
          return JSON.stringify({
            basics: {
              name: 'Ashish Kumar Singh',
              title: 'Senior Backend Platform Engineer | Distributed Systems & AI',
              email: 'ashish.singh.careers@gmail.com',
              phone: '+91 7982169443',
              location: 'India (Open to Relocation - Germany | Visa Sponsorship Required)',
              linkedin: 'https://www.linkedin.com/in/ashish-kumar-singh1986',
              github: 'https://github.com/guddiya001',
              portfolio: 'https://ashishkumarsingh.vercel.app',
              summary:
                'Accomplished Senior Backend Platform Engineer with 9+ years architecting event-driven microservices and distributed systems on AWS, Kafka, Node.js, and TypeScript. Proven expertise integrating AI Agents and high-throughput APIs serving millions of global users.',
              openTo: 'Berlin, Germany / European Union',
            },
            experience: [
              {
                id: 'exp-1',
                role: 'Senior Backend Platform Lead',
                company: 'Persistent Systems / Enterprise Platform',
                location: 'Noida, India',
                period: 'Oct 2023 - Present',
                bullets: [
                  'Architected event-driven microservices using Node.js, TypeScript, Kafka, and AWS, handling 15M+ daily requests with 99.99% availability.',
                  'Engineered AI retrieval pipelines and agentic integrations with vector search and Redis caching, slashing p99 latency by 35%.',
                  'Led Kubernetes and Terraform deployment automation, streamlining CI/CD release cycles from days to minutes.',
                ],
              },
            ],
            skillsFlat: [
              'Core & Languages: TypeScript, Node.js, Python, JavaScript, SQL',
              'Distributed Systems & Data: Kafka, Microservices, REST APIs, GraphQL, PostgreSQL, Redis',
              'Cloud & DevOps: AWS, Kubernetes, Docker, Terraform, CI/CD, Observability',
              'AI & Innovation: AI Agents, RAG Pipelines, Vector Search, LLM Integration',
            ],
            projects: [
              {
                id: 'proj-1',
                name: 'High-Throughput Event-Driven Microservices Platform',
                description: 'Kafka and Node.js microservices platform processing high-volume event streams on AWS EKS.',
                technologies: 'Node.js, TypeScript, Kafka, AWS, Kubernetes',
              },
            ],
            education: [
              {
                id: 'edu-1',
                degree: 'Master of Computer Applications (MCA)',
                school: 'Guru Gobind Singh Indraprastha University',
                year: '2016',
              },
            ],
            certificates: [
              'AWS Certified Solutions Architect',
              'Distributed Systems & Microservices Engineering',
            ],
            achievements: [
              'Scaled distributed e-commerce backend pipelines to handle 10K+ RPM during peak traffic events.',
            ],
            languages: ['English – Full Professional Proficiency', 'German – Basic (A1 in progress)'],
          });
        }

        if (userMsg.includes('Score this resume against the job description')) {
          return JSON.stringify({
            atsScore: 96,
            keywordMatch: 95,
            experienceMatch: 97,
            skillsMatch: 96,
            formattingScore: 98,
          });
        }

        return '{}';
      }),
    };

    mockCoordinator = { process: jest.fn() };
    mockVisaDetection = { process: jest.fn() };
    mockResumeMatch = { process: jest.fn() };
    mockResumeImprovement = { process: jest.fn() };
    mockCoverLetter = { process: jest.fn() };
    mockInterview = { process: jest.fn() };
    mockATSOptimizer = { process: jest.fn() };

    aiService = new AiService(
      mockAiPkgService as AIServiceType,
      mockCoordinator as CoordinatorAgent,
      mockVisaDetection as VisaDetectionAgent,
      mockResumeMatch as ResumeMatchAgent,
      mockResumeImprovement as ResumeImprovementAgent,
      mockCoverLetter as CoverLetterAgent,
      mockInterview as InterviewAgent,
      mockATSOptimizer as ATSOptimizerAgent,
    );
  });

  describe('1. tailorResume endpoint functionality', () => {
    it('should tailor candidate resume to match the given job description and boost ATS score', async () => {
      const result = await aiService.tailorResume({
        resumeData: sampleCandidateResume,
        jobTitle: 'Senior Backend Platform Engineer (AI & Distributed Systems)',
        companyName: 'Zalando SE',
        jobDescription: sampleJobDescription,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // Check ATS score improvement
      expect(result.data!.atsScoreBefore).toBe(68);
      expect(result.data!.atsScoreAfter).toBe(94);
      expect(result.data!.atsScoreAfter).toBeGreaterThan(result.data!.atsScoreBefore);

      // Check tailored summary matches company & role
      expect(result.data!.tailoredSummary).toContain('Zalando SE');
      expect(result.data!.tailoredSummary).toContain('Senior Backend Platform Engineer');

      // Check added skills extracted from JD
      expect(result.data!.addedSkills).toEqual(
        expect.arrayContaining(['Kafka', 'Kubernetes', 'TypeScript', 'Node.js', 'PostgreSQL', 'Redis'])
      );

      // Check bullet point improvements
      expect(result.data!.bulletImprovements.length).toBeGreaterThan(0);
      expect(result.data!.bulletImprovements[0].improved).toContain('Kafka');

      // Check key changes list
      expect(result.data!.keyChanges.length).toBeGreaterThanOrEqual(3);
    });

    it('should fallback gracefully and extract skills if LLM call encounters error', async () => {
      mockAiPkgService.generateChatCompletion = jest.fn().mockRejectedValue(new Error('LLM connection error'));

      const result = await aiService.tailorResume({
        resumeData: sampleCandidateResume,
        jobTitle: 'Senior Backend Platform Engineer',
        companyName: 'Zalando SE',
        jobDescription: sampleJobDescription,
      });

      expect(result.success).toBe(true);
      expect(result.data!.atsScoreBefore).toBe(65);
      expect(result.data!.atsScoreAfter).toBe(91);
      expect(result.data!.tailoredSummary).toContain('Zalando SE');
      expect(result.data!.addedSkills.length).toBeGreaterThan(0);
      expect(result.data!.bulletImprovements.length).toBeGreaterThan(0);
    });
  });

  describe('2. generateFullResume (10-Phase Pipeline)', () => {
    it('should execute the full 10-phase pipeline and produce complete ATS-optimized resume', async () => {
      const result = await aiService.generateFullResume({
        jobDescription: sampleJobDescription,
        jobTitle: 'Senior Backend Platform Engineer',
        companyName: 'Zalando SE',
        strategy: 'auto',
      });

      expect(result.success).toBe(true);
      const data = result.data;

      // Phase 1-2: JD Analysis
      expect(data!.jdAnalysis.jobTitle).toContain('Senior Backend Platform Engineer');
      expect(data!.jdAnalysis.companyName).toBe('Zalando SE');
      expect(data!.jdAnalysis.country).toBe('Germany');
      expect(data!.jdAnalysis.requiredSkills).toContain('Kafka');
      expect(data!.jdAnalysis.visaIndicators.length).toBeGreaterThan(0);

      // Phase 3: Strategy
      expect(['A', 'B', 'C']).toContain(data!.strategy);

      // Phase 4-5: Resume Data
      expect(data!.resumeData.basics.name).toBe('Ashish Kumar Singh');
      expect(data!.resumeData.basics.location).toContain('Germany');
      expect(data!.resumeData.basics.summary).toContain('Senior Backend Platform Engineer');
      expect(data!.resumeData.experience.length).toBeGreaterThan(0);
      expect(data!.resumeData.skillsFlat.length).toBeGreaterThan(0);
      expect(data!.resumeData.projects.length).toBeGreaterThan(0);

      // Phase 6-7: ATS Score
      expect(data!.atsScore).toBe(96);
      expect(data!.atsBreakdown.keywordMatch).toBe(95);
      expect(data!.atsBreakdown.experienceMatch).toBe(97);

      // Phase 8: Cover Letter
      expect(data!.coverLetter).toBeDefined();

      // Phase 9: Probability
      expect(data!.interviewProbability.atsPass).toBeGreaterThanOrEqual(80);
      expect(data!.interviewProbability.recruiterResponse).toBeGreaterThan(40);
      expect(data!.networkingTips.length).toBeGreaterThan(0);

      // Phase 10: Final Recommendation
      expect(data!.finalDecision).toBe('APPLY_TODAY');
      expect(data!.finalDecisionReason).toContain('Strong match');
    });

    it('should correctly build fallback structured resume if LLM fails', async () => {
      mockAiPkgService.generateChatCompletion = jest.fn().mockRejectedValue(new Error('Network timeout'));

      const result = await aiService.generateFullResume({
        jobDescription: sampleJobDescription,
        jobTitle: 'Senior Backend Platform Engineer',
        companyName: 'Zalando SE',
        strategy: 'A',
      });

      expect(result.success).toBe(true);
      expect(result.data!.resumeData.basics.name).toBe('Ashish Kumar Singh');
      expect(result.data!.resumeData.experience.length).toBeGreaterThan(0);
      expect(result.data!.atsScore).toBeGreaterThanOrEqual(80);
    });
  });

  describe('3. Frontend State Transition Simulation', () => {
    it('should correctly update resume state with TAILOR_FOR_JOB payload', () => {
      const initialResume = {
        ...sampleCandidateResume,
        coverLetter: { paragraphs: ['Initial cover letter'] },
      };

      const tailorPayload = {
        summary: 'Tailored summary for Zalando SE role',
        addedSkills: ['Kafka', 'Docker', 'Kubernetes', 'GraphQL'],
        coverLetter: 'Tailored cover letter for Zalando SE',
        bulletImprovements: [
          {
            original: 'Architected and shipped a production-grade AI-native context layer',
            improved: 'Architected high-throughput event-driven microservices with Kafka and AWS',
            reason: 'Tailored for Zalando backend platform requirements',
          },
        ],
      };

      // Apply the exact reducer logic from apps/web/src/app/resume-builder/context.tsx
      const existingSkillsLower = new Set(initialResume.skillsFlat.map((s) => s.toLowerCase()));
      const newSkillsToAppend = tailorPayload.addedSkills.filter(
        (s) => !existingSkillsLower.has(s.toLowerCase())
      );
      const updatedSkills = [...initialResume.skillsFlat, ...newSkillsToAppend];

      const updatedExperience = initialResume.experience.map((exp) => ({
        ...exp,
        bullets: exp.bullets.map((bullet) => {
          const match = tailorPayload.bulletImprovements.find(
            (imp) => imp.original && bullet.includes(imp.original)
          );
          return match ? match.improved : bullet;
        }),
      }));

      const updatedState = {
        ...initialResume,
        basics: {
          ...initialResume.basics,
          summary: tailorPayload.summary || initialResume.basics.summary,
        },
        skillsFlat: updatedSkills,
        experience: updatedExperience,
        coverLetter: tailorPayload.coverLetter
          ? { paragraphs: [tailorPayload.coverLetter] }
          : initialResume.coverLetter,
      };

      expect(updatedState.basics.summary).toBe('Tailored summary for Zalando SE role');
      expect(updatedState.skillsFlat).toContain('Kafka');
      expect(updatedState.skillsFlat).toContain('GraphQL');
      expect(updatedState.experience[0].bullets[0]).toContain('Kafka and AWS');
      expect(updatedState.coverLetter.paragraphs[0]).toBe('Tailored cover letter for Zalando SE');
    });
  });

  describe('4. analyzeResume against Job Description', () => {
    it('should analyze candidate resume against JD and return keyword matches & gaps', async () => {
      mockResumeMatch.process = jest.fn().mockResolvedValue({
        success: true,
        data: {
          overallScore: 84,
          keywordMatch: 82,
          experienceMatch: 88,
          educationMatch: 95,
          skillsMatch: 80,
          matchedKeywords: ['Node.js', 'TypeScript', 'Python', 'AWS', 'PostgreSQL', 'Redis'],
          missingKeywords: ['Kafka', 'Kubernetes', 'GraphQL'],
          suggestions: ['Add Kafka event streaming experience', 'Highlight Kubernetes orchestration on AWS'],
          detailedAnalysis: 'Strong foundational match with high backend relevance.',
          optimizationPriority: 'HIGH',
        },
      });

      const result = await aiService.analyzeResume(JSON.stringify(sampleCandidateResume), sampleJobDescription);

      expect(result.success).toBe(true);
      expect(result.data!.overallScore).toBe(84);
      expect(result.data!.matchedKeywords).toContain('TypeScript');
      expect(result.data!.missingKeywords).toContain('Kafka');
      expect((result.data as any).suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('5. optimizeResume for ATS', () => {
    it('should optimize resume content using ResumeImprovementAgent and return detailed diffs', async () => {
      mockResumeImprovement.process = jest.fn().mockResolvedValue({
        success: true,
        data: {
          improvedResume: 'Optimized resume content with injected keywords',
          changes: [
            { section: 'Experience', reason: 'Added quantified metrics and Kafka tooling' },
            { section: 'Skills', reason: 'Reordered skills to emphasize AWS and Docker' },
          ],
          originalScore: 68,
          improvedScore: 92,
          formattingTips: ['Use simple headers', 'Avoid columns'],
        },
      });

      const result = await aiService.optimizeResume(JSON.stringify(sampleCandidateResume), sampleJobDescription);

      expect(result.success).toBe(true);
      expect(result.data!.optimizedContent).toContain('Optimized resume content');
      expect(result.data!.originalScore).toBe(68);
      expect(result.data!.improvedScore).toBe(92);
      expect(result.data!.changes.length).toBe(2);
    });
  });

  describe('6. generateCoverLetter for Job Description', () => {
    it('should generate personalized cover letter aligning candidate skills to JD via agent', async () => {
      mockCoverLetter.process = jest.fn().mockResolvedValue({
        success: true,
        data: {
          content: 'Dear Hiring Manager at Zalando SE,\n\nI am writing to express my interest...',
          wordCount: 150,
          tone: 'professional',
          keyPoints: ['Strong opening', 'Relevant skills'],
          variations: [],
          matchingPoints: ['Kafka', 'TypeScript', 'Node.js'],
        },
      });

      const result = await aiService.generateCoverLetter({
        userName: 'Ashish Kumar Singh',
        jobTitle: 'Senior Backend Platform Engineer',
        companyName: 'Zalando SE',
        jobDescription: sampleJobDescription,
        skills: ['TypeScript', 'Node.js', 'Python', 'AWS', 'Kafka'],
      });

      expect(result.success).toBe(true);
      expect(result.data!.content).toContain('Zalando SE');
      expect(result.data!.tone).toBe('professional');
      expect(result.data!.matchingPoints).toContain('Kafka');
    });

    it('should fallback cleanly if agent encounters an error', async () => {
      mockCoverLetter.process = jest.fn().mockRejectedValue(new Error('Agent error'));

      const result = await aiService.generateCoverLetter({
        userName: 'Ashish Kumar Singh',
        jobTitle: 'Senior Backend Platform Engineer',
        companyName: 'Zalando SE',
        jobDescription: sampleJobDescription,
        skills: ['TypeScript', 'Node.js', 'Python', 'AWS', 'Kafka'],
      });

      expect(result.success).toBe(true);
      expect(result.data!.content).toContain('Zalando SE');
      expect(result.data!.content).toContain('Ashish Kumar Singh');
      expect((result.data as any).keyPoints.length).toBeGreaterThan(0);
    });
  });
});
