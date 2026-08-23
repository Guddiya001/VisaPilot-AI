/**
 * Coding and architecture prompts.
 *
 * Recommended models:
 *   - architecture / system-design   → Claude Opus 5
 *   - coding-assistance               → Claude Opus 4.8
 *   - difficult coding problems       → Claude Opus 5
 */

import { extendSystemPrompt, buildBaseMessages } from './base';

const CODING_SYSTEM_PROMPT = extendSystemPrompt(`
You are a senior software engineer specializing in production-quality code and system design.

For technical questions:
1. Give the direct answer first.
2. Explain the underlying concept.
3. Provide a practical production example.
4. Include production considerations (error handling, security, scalability).
5. Mention trade-offs when relevant.

For architecture questions, ALWAYS provide:
1. Architecture overview
2. ASCII architecture diagram
3. Component responsibilities
4. Request/data flow
5. Scaling strategy
6. Failure handling
7. Security considerations
8. Observability (metrics, logging, tracing)
9. Trade-offs

Example diagram format:
Client
   |
   v
API Gateway
   |
   +----> Auth Service
   |
   +----> Application Service
              |
              +----> Redis
              |
              +----> PostgreSQL

Coding rules:
- Prefer production-quality code.
- Use modern JavaScript/TypeScript with async/await.
- Handle errors explicitly.
- Validate inputs.
- Avoid hardcoded secrets — use environment variables.
- Include useful comments only where they improve maintainability.
- Prefer reusable functions and services.
- Include installation and execution commands when necessary.
- For Node.js: handle API failures, add timeout handling, add retry handling where appropriate.
- Never expose API keys or secrets in logs.
`);

export interface CodingContext {
  question: string;
  language?: string;
  framework?: string;
  existingCode?: string;
  constraints?: string[];
}

export interface ArchitectureContext {
  requirement: string;
  scale?: string;
  techStack?: string[];
  constraints?: string[];
}

export function buildCodingMessages(context: CodingContext) {
  const parts: string[] = [];

  if (context.language) parts.push(`Language: ${context.language}`);
  if (context.framework) parts.push(`Framework: ${context.framework}`);
  if (context.constraints?.length) parts.push(`Constraints: ${context.constraints.join(', ')}`);

  parts.push(`Problem/Question:\n${context.question}`);

  if (context.existingCode) {
    parts.push(`Existing code (do not unnecessarily rewrite unrelated parts):\n\`\`\`\n${context.existingCode}\n\`\`\``);
  }

  return buildBaseMessages(parts.join('\n\n'), CODING_SYSTEM_PROMPT);
}

export function buildArchitectureMessages(context: ArchitectureContext) {
  const parts: string[] = [];

  if (context.scale) parts.push(`Scale requirements: ${context.scale}`);
  if (context.techStack?.length) parts.push(`Preferred tech stack: ${context.techStack.join(', ')}`);
  if (context.constraints?.length) parts.push(`Constraints: ${context.constraints.join(', ')}`);

  parts.push(`Architecture requirement:\n${context.requirement}`);

  parts.push(`
Provide:
1. Architecture overview
2. ASCII diagram
3. Component responsibilities
4. Request/data flow
5. Scaling strategy
6. Failure handling
7. Security considerations
8. Observability
9. Trade-offs`);

  return buildBaseMessages(parts.join('\n\n'), CODING_SYSTEM_PROMPT);
}

export { CODING_SYSTEM_PROMPT };
