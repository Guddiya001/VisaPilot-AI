import { z } from 'zod';

/**
 * Universal Engineering Domain Enum
 * Covers all modern software engineering tracks to eliminate role-persona mismatch.
 */
export const UniversalDomainSchema = z.enum([
  'backend_distributed_systems',
  'ai_llm_architecture',
  'frontend_web_platform',
  'devops_cloud_infra',
  'fullstack_general',
  'engineering_leadership',
]);

export type UniversalDomain = z.infer<typeof UniversalDomainSchema>;

/**
 * Engineering Persona Enum
 * Extended to encompass all universal domains with backward-compatible aliases.
 */
export const EngineeringPersonaSchema = z.enum([
  'backend_distributed_systems',
  'ai_llm_architecture',
  'frontend_web_platform',
  'devops_cloud_infra',
  'fullstack_general',
  'engineering_leadership',
  'fullstack_platform', // backward-compatibility alias
]);

export type EngineeringPersona = z.infer<typeof EngineeringPersonaSchema>;

export type DomainWeightDistribution = Record<EngineeringPersona, number>;

/**
 * Persona Variant for a Work Experience Entry
 */
export const ExperiencePersonaVariantSchema = z.object({
  roleTitle: z.string(),
  bullets: z.array(z.string().min(10)),
  techStack: z.array(z.string()),
});

export type ExperiencePersonaVariant = z.infer<typeof ExperiencePersonaVariantSchema>;

/**
 * Work Experience Entry Schema
 */
export const WorkExperienceEntrySchema = z.object({
  id: z.string(),
  company: z.string(),
  client: z.string().optional(),
  location: z.string(),
  period: z.string(),
  personaVariants: z.record(EngineeringPersonaSchema, ExperiencePersonaVariantSchema),
});

export type WorkExperienceEntry = z.infer<typeof WorkExperienceEntrySchema>;

/**
 * Project Entry Schema
 * Modular achievement blocks tagged by universal engineering domains.
 */
export const ProjectEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  personas: z.array(EngineeringPersonaSchema),
  domains: z.array(UniversalDomainSchema).optional(),
  description: z.string(),
  technologies: z.string(),
  bullets: z.array(z.string().min(10)),
  achievementBlocks: z
    .record(EngineeringPersonaSchema, z.array(z.string().min(10)))
    .optional(),
});

export type ProjectEntry = z.infer<typeof ProjectEntrySchema>;

/**
 * Education Entry Schema
 */
export const EducationEntrySchema = z.object({
  degree: z.string(),
  school: z.string(),
  year: z.string(),
  location: z.string().optional(),
});

export type EducationEntry = z.infer<typeof EducationEntrySchema>;

/**
 * Candidate Basics Schema
 */
export const CandidateBasicsSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  location: z.string(),
  linkedin: z.string(),
  github: z.string(),
  portfolio: z.string(),
  openTo: z.string().optional(),
});

export type CandidateBasics = z.infer<typeof CandidateBasicsSchema>;

/**
 * Candidate Master Profile Schema
 * Multi-persona architecture supporting tailored variants for each engineering track.
 */
export const CandidateMasterProfileSchema = z.object({
  basics: CandidateBasicsSchema,
  summaries: z.record(EngineeringPersonaSchema, z.string().min(20)),
  skillsByPersona: z.record(
    EngineeringPersonaSchema,
    z.record(z.string(), z.array(z.string()))
  ),
  experiences: z.array(WorkExperienceEntrySchema),
  projects: z.array(ProjectEntrySchema),
  education: z.array(EducationEntrySchema),
  certifications: z.array(z.string()),
  languages: z.array(z.string()),
});

export type CandidateMasterProfile = z.infer<typeof CandidateMasterProfileSchema>;

/**
 * Filtered Candidate Profile Interface
 * Profile scoped strictly to the selected persona prior to LLM prompt injection.
 */
export interface FilteredCandidateProfile {
  persona: EngineeringPersona;
  secondaryPersona?: EngineeringPersona;
  basics: {
    name: string;
    title: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    github: string;
    portfolio: string;
    summary: string;
    openTo?: string;
  };
  skillsSection: Record<string, string[]>;
  experience: Array<{
    role: string;
    company: string;
    client?: string;
    location: string;
    period: string;
    bullets: string[];
    techStack: string[];
  }>;
  projects: Array<{
    name: string;
    description: string;
    technologies: string;
    bullets: string[];
  }>;
  education: EducationEntry[];
  certifications: string[];
  languages: string[];
}

