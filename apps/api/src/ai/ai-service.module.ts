import { Global, Module } from '@nestjs/common';
import {
  AIService,
  CoordinatorAgent,
  SearchAgent,
  VisaDetectionAgent,
  ResumeMatchAgent,
  ResumeImprovementAgent,
  CoverLetterAgent,
  InterviewAgent,
  LearningAgent,
  RAGService,
  embeddingService,
} from '@visapilot/ai';

// NestJS wrapper providers for the AI package services
const aiServiceProvider = {
  provide: 'AIService',
  useValue: new AIService(),
};

const coordinatorAgentProvider = {
  provide: 'CoordinatorAgent',
  useValue: new CoordinatorAgent(),
};

const searchAgentProvider = {
  provide: 'SearchAgent',
  useValue: new SearchAgent(),
};

const visaDetectionAgentProvider = {
  provide: 'VisaDetectionAgent',
  useValue: new VisaDetectionAgent(),
};

const resumeMatchAgentProvider = {
  provide: 'ResumeMatchAgent',
  useValue: new ResumeMatchAgent(),
};

const resumeImprovementAgentProvider = {
  provide: 'ResumeImprovementAgent',
  useValue: new ResumeImprovementAgent(),
};

const coverLetterAgentProvider = {
  provide: 'CoverLetterAgent',
  useValue: new CoverLetterAgent(),
};

const interviewAgentProvider = {
  provide: 'InterviewAgent',
  useValue: new InterviewAgent(),
};

const learningAgentProvider = {
  provide: 'LearningAgent',
  useValue: new LearningAgent(),
};

const ragServiceProvider = {
  provide: 'RAGService',
  useValue: new RAGService(),
};

const embeddingServiceProvider = {
  provide: 'EmbeddingService',
  useValue: embeddingService,
};

@Global()
@Module({
  providers: [
    aiServiceProvider,
    coordinatorAgentProvider,
    searchAgentProvider,
    visaDetectionAgentProvider,
    resumeMatchAgentProvider,
    resumeImprovementAgentProvider,
    coverLetterAgentProvider,
    interviewAgentProvider,
    learningAgentProvider,
    ragServiceProvider,
    embeddingServiceProvider,
  ],
  exports: [
    aiServiceProvider,
    coordinatorAgentProvider,
    searchAgentProvider,
    visaDetectionAgentProvider,
    resumeMatchAgentProvider,
    resumeImprovementAgentProvider,
    coverLetterAgentProvider,
    interviewAgentProvider,
    learningAgentProvider,
    ragServiceProvider,
    embeddingServiceProvider,
  ],
})
export class AIServiceModule {}

