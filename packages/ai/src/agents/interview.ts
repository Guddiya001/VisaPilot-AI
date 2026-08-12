import { ollamaClient } from '../ollama/client';
import type { IAgent, AgentOutput } from '@visapilot/shared';
import type { AgentContext } from '../types';
import { AgentType } from '@visapilot/shared';
import { InterviewQuestionSchema, InterviewFeedbackSchema } from '../types';

export class InterviewAgent implements IAgent {
  readonly name = 'Interview Agent';
  readonly type = AgentType.INTERVIEW;

  validate(input: Record<string, unknown>): boolean {
    return !!input.jobDescription || !!input.interviewQuestion;
  }

  async process(input: Record<string, unknown>): Promise<AgentOutput> {
    try {
      const context = input as unknown as AgentContext;
      const jobDescription = context.jobDescription || '';

      // Check if we're answering a question or generating questions
      if (context.interviewAnswer) {
        return await this.evaluateAnswer(context);
      }

      // Generate interview questions
      return await this.generateQuestions(jobDescription, context);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Interview agent failed',
        confidence: 0,
      };
    }
  }

  private async generateQuestions(
    jobDescription: string,
    context: AgentContext,
  ): Promise<AgentOutput> {
    // Step 1: Analyze job requirements
    const requirements = await this.analyzeRequirements(jobDescription);

    // Step 2: Generate questions by category
    const questions = await this.generateQuestionSet(jobDescription, requirements);

    // Step 3: Generate preparation tips
    const preparationTips = await this.generatePreparationTips(
      jobDescription,
      context.companyName || '',
    );

    return {
      success: true,
      data: {
        questions,
        categories: requirements.categories,
        preparationTips,
        totalQuestions: questions.length,
        difficulty: requirements.overallDifficulty,
        companyName: context.companyName,
        jobTitle: requirements.jobTitle,
      },
      confidence: 0.8,
      metadata: {
        questionsGenerated: questions.length,
        categories: requirements.categories.length,
        difficulty: requirements.overallDifficulty,
      },
    };
  }

  private async evaluateAnswer(
    context: AgentContext,
  ): Promise<AgentOutput> {
    const question = context.interviewQuestion || '';
    const answer = context.interviewAnswer || '';

    // Step 1: Analyze the answer
    const analysis = await this.analyzeAnswer(question, answer);

    // Step 2: Generate feedback
    const feedback = await this.generateFeedback(question, answer, analysis);

    // Step 3: Generate a sample ideal answer
    const sampleAnswer = await this.generateSampleAnswer(
      question,
      context.jobDescription || '',
    );

    const result = {
      score: feedback.score,
      strengths: feedback.strengths,
      improvements: feedback.improvements,
      sampleAnswer,
    };

    // Validate
    InterviewFeedbackSchema.parse(result);

    return {
      success: true,
      data: {
        ...result,
        originalQuestion: question,
        originalAnswer: answer,
        analysis,
        suggestedFollowUp: await this.generateFollowUpQuestions(question, answer),
        tips: await this.generateQuestionSpecificTips(question),
      },
      confidence: 0.75,
      metadata: {
        answerLength: answer.length,
        keyPointsCovered: analysis.keyPoints.length,
      },
    };
  }

  private async analyzeRequirements(
    jobDescription: string,
  ): Promise<{
    categories: string[];
    overallDifficulty: string;
    jobTitle: string;
    keyAreas: string[];
  }> {
    const prompt = `Analyze this job description for interview preparation.

Job Description:
${jobDescription.slice(0, 3000)}

Return JSON with:
1. categories: array of interview categories needed (e.g., "Technical", "Behavioral", "System Design", "Culture Fit")
2. overallDifficulty: "entry" | "mid" | "senior" | "lead" | "executive"
3. jobTitle: the inferred job title
4. keyAreas: array of key areas to focus on

Return ONLY valid JSON:`;

    try {
      const response = await ollamaClient.generateCompletion(prompt, {
        temperature: 0.1,
        maxTokens: 500,
      });
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          categories: Array.isArray(parsed.categories) ? parsed.categories : ['General'],
          overallDifficulty: String(parsed.overallDifficulty || 'mid'),
          jobTitle: String(parsed.jobTitle || 'Unknown Role'),
          keyAreas: Array.isArray(parsed.keyAreas) ? parsed.keyAreas : [],
        };
      }
    } catch {
      // fall through
    }

    return { categories: ['General'], overallDifficulty: 'mid', jobTitle: '', keyAreas: [] };
  }

  private async generateQuestionSet(
    jobDescription: string,
    requirements: { categories: string[]; overallDifficulty: string },
  ): Promise<Array<Record<string, unknown>>> {
    const questions: Array<Record<string, unknown>> = [];

    for (const category of requirements.categories.slice(0, 4)) {
      const numberOfQuestions = category === 'Technical' ? 3 : 2;

      const prompt = `Generate ${numberOfQuestions} interview questions for the ${category} category.

Job Description:
${jobDescription.slice(0, 1500)}
Difficulty Level: ${requirements.overallDifficulty}

For each question, provide:
1. question: the interview question
2. category: ${category}
3. difficulty: EASY | MEDIUM | HARD
4. expectedKeywords: array of keywords/points the answer should cover
5. tips: preparation tips for this question

Return as JSON array:`;

      try {
        const response = await ollamaClient.generateCompletion(prompt, {
          temperature: 0.5,
          maxTokens: 1500,
        });
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;
          questions.push(...parsed);
        }
      } catch {
        // Skip failed category
      }
    }

    // Validate each question
    return questions
      .filter((q) => {
        try {
          InterviewQuestionSchema.parse(q);
          return true;
        } catch {
          return false;
        }
      })
      .slice(0, 10);
  }

  private async generatePreparationTips(
    jobDescription: string,
    companyName: string,
  ): Promise<string[]> {
    const prompt = `Generate 5 interview preparation tips for this job.

Job Description:
${jobDescription.slice(0, 1500)}
Company: ${companyName || 'Unknown'}

Return as a JSON array of strings:`;

    try {
      const response = await ollamaClient.generateCompletion(prompt, {
        temperature: 0.4,
        maxTokens: 500,
      });
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as string[];
      }
    } catch {
      // fall through
    }

    return [
      'Research the company culture and recent news',
      'Prepare specific examples from your past experience using the STAR method',
      'Review the job description and align your skills with their requirements',
      'Prepare thoughtful questions to ask the interviewer',
      'Practice your responses out loud to improve delivery',
    ];
  }

  private async analyzeAnswer(
    question: string,
    answer: string,
  ): Promise<{ keyPoints: string[]; completeness: number; relevance: number }> {
    const prompt = `Analyze this interview answer for completeness and relevance.

Question: ${question}
Answer: ${answer}

Return JSON with:
1. keyPoints: array of key points covered in the answer
2. completeness: how complete the answer is (0-100)
3. relevance: how relevant the answer is to the question (0-100)

Return ONLY valid JSON:`;

    try {
      const response = await ollamaClient.generateCompletion(prompt, {
        temperature: 0.1,
        maxTokens: 300,
      });
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
          completeness: Math.min(100, Math.max(0, Number(parsed.completeness) || 50)),
          relevance: Math.min(100, Math.max(0, Number(parsed.relevance) || 50)),
        };
      }
    } catch {
      // fall through
    }

    return { keyPoints: [], completeness: 50, relevance: 50 };
  }

  private async generateFeedback(
    question: string,
    answer: string,
    analysis: { keyPoints: string[]; completeness: number; relevance: number },
  ): Promise<{ score: number; strengths: string[]; improvements: string[] }> {
    const score = Math.round((analysis.completeness * 0.5 + analysis.relevance * 0.5));

    const prompt = `Provide interview feedback for this answer.

Question: ${question}
Answer: ${answer}
Completeness: ${analysis.completeness}%
Relevance: ${analysis.relevance}%

Return JSON with:
1. strengths: array of 2-3 things done well
2. improvements: array of 2-3 specific suggestions for improvement

Return ONLY valid JSON:`;

    try {
      const response = await ollamaClient.generateCompletion(prompt, {
        temperature: 0.3,
        maxTokens: 400,
      });
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          score,
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ['Answer provided'],
          improvements: Array.isArray(parsed.improvements) ? parsed.improvements : ['Could be more specific'],
        };
      }
    } catch {
      // fall through
    }

    return {
      score,
      strengths: ['Answer was provided'],
      improvements: ['Could be more structured', 'Add specific examples'],
    };
  }

  private async generateSampleAnswer(
    question: string,
    jobDescription: string,
  ): Promise<string> {
    const prompt = `Write a model answer for this interview question.

Question: ${question}
Job Context: ${jobDescription.slice(0, 1000)}

Write a comprehensive, well-structured answer that demonstrates:
1. Clear understanding of the question
2. Specific example using STAR method (Situation, Task, Action, Result)
3. Relevant skills and experience
4. Professional tone

Return ONLY the answer:`;

    try {
      return await ollamaClient.generateCompletion(prompt, {
        temperature: 0.5,
        maxTokens: 500,
      });
    } catch {
      return 'Model answer generation unavailable. Focus on providing a specific example using the STAR method.';
    }
  }

  private async generateFollowUpQuestions(
    question: string,
    answer: string,
  ): Promise<string[]> {
    const prompt = `Based on this interview Q&A, suggest 2-3 natural follow-up questions.

Question: ${question}
Answer: ${answer}

Return as a JSON array of strings:`;

    try {
      const response = await ollamaClient.generateCompletion(prompt, {
        temperature: 0.4,
        maxTokens: 300,
      });
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as string[];
      }
    } catch {
      // fall through
    }

    return [];
  }

  private async generateQuestionSpecificTips(
    question: string,
  ): Promise<string[]> {
    const prompt = `Provide 3 tips for answering this interview question effectively.

Question: ${question}

Return as a JSON array of strings:`;

    try {
      const response = await ollamaClient.generateCompletion(prompt, {
        temperature: 0.4,
        maxTokens: 300,
      });
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as string[];
      }
    } catch {
      // fall through
    }

    return ['Use the STAR method', 'Be specific with examples', 'Keep it concise'];
  }
}

export const interviewAgent = new InterviewAgent();

