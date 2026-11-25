export interface ParsedWorkHistoryEntry {
    jobTitle: string;
    company: string;
    startDate: string;
    endDate: string;
    currentlyWorking: boolean;
    description: string;
}

export interface ParsedEducationEntry {
    degree: string;
    institution: string;
    startDate: string;
    endDate: string;
}

export interface ParsedPersonaData {
    name: string;
    contactInfo: {
        firstName: string;
        lastName: string;
        fullName: string;
        email: string;
        phone: string;
        locationLabel: string;
        linkedinUrl: string;
        githubUrl: string;
    };
    workHistory: ParsedWorkHistoryEntry[];
    education: ParsedEducationEntry[];
    skills: {
        all: string[];
    };
    lockedFacts: {
        currentEmployer: string;
        highestDegree: string;
        email: string;
        phone: string;
    };
}

const KNOWN_TECH_SKILLS = [
    'Python',
    'TypeScript',
    'JavaScript',
    'Java',
    'SQL',
    'FastAPI',
    'React',
    'Next.js',
    'Node.js',
    'Spring Boot',
    'LangChain',
    'LangGraph',
    'MCP',
    'pgvector',
    'Pinecone',
    'PostgreSQL',
    'Docker',
    'Kubernetes',
    'AWS',
    'GCP',
    'Azure',
    'Redis',
    'Celery',
    'Vitest',
    'Pytest',
];

/**
 * Extracts readable text from PDF streams, DOCX XML bodies, or plain text buffers.
 */
export function extractTextFromResumeBuffer(
    buffer: Buffer,
    fileName: string = 'resume.pdf'
): string {
    const raw = buffer.toString('utf-8');

    // If the buffer is a PDF with "(...) Tj" text operators, extract those tokens cleanly
    if (raw.startsWith('%PDF-') || fileName.toLowerCase().endsWith('.pdf')) {
        const tjMatches = Array.from(raw.matchAll(/\(([^()]+)\)\s*Tj/g)).map(
            (m) => m[1]
        );
        if (tjMatches.length > 0) {
            return tjMatches.join('\n');
        }
    }

    // If XML tags exist (e.g., unpacked DOCX document.xml stream), strip tags into lines
    if (raw.includes('<w:t') || raw.includes('</w:t>')) {
        return raw
            .replace(/<\/w:p>/g, '\n')
            .replace(/<[^>]+>/g, ' ')
            .replace(/[ \t]+/g, ' ')
            .trim();
    }

    return raw.trim();
}

/**
 * Parses unstructured resume text into VisaPilot's structured PersonaData schema.
 */
export function parseResumeTextToPersona(rawText: string): ParsedPersonaData {
    const lines = rawText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

    // 1. Extract Full Name from the first non-header line
    const fullName = lines[0] ?? 'Candidate Name';
    const nameTokens = fullName.split(/\s+/);
    const firstName = nameTokens[0] ?? 'Candidate';
    const lastName =
        nameTokens.length > 1 ? nameTokens[nameTokens.length - 1] : '';

    // 2. Extract Contact Info (Email, Phone, LinkedIn, GitHub, Location)
    const emailMatch = rawText.match(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
    );
    const phoneMatch = rawText.match(
        /(?:\+\d{1,3}[-.\s]?)?\(?\d{3,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}/
    );
    const linkedinMatch = rawText.match(
        /https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i
    );
    const githubMatch = rawText.match(
        /https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/i
    );
    const locationMatch = rawText.match(/Location:\s*([^\n|]+)/i);

    // 3. Extract Work History entries matching "Title | Company | Start - End"
    const workHistory: ParsedWorkHistoryEntry[] = [];
    const roleHeaderRegex =
        /^([^|\n]+)\|\s*([^|\n]+)\|\s*(\d{4}(?:-\d{2})?)\s*-\s*(Present|\d{4}(?:-\d{2})?)$/i;

    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(roleHeaderRegex);
        if (!match) continue;

        const jobTitle = match[1].trim();
        const company = match[2].trim();
        const startDate = match[3].trim();
        const endDate = match[4].trim();

        // Exclude education rows that match the pipe pattern (e.g., MCA | University | 2013 - 2016)
        if (
            /master|bachelor|university|college|institute|b\.tech|mca|bca|degree/i.test(
                `${jobTitle} ${company}`
            )
        ) {
            continue;
        }

        const bulletLines: string[] = [];
        for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].startsWith('- ') || lines[j].startsWith('• ')) {
                bulletLines.push(lines[j].replace(/^[-•]\s*/, ''));
            } else if (roleHeaderRegex.test(lines[j]) || /^[A-Z ]{4,}$/.test(lines[j])) {
                break;
            }
        }

        workHistory.push({
            jobTitle,
            company,
            startDate,
            endDate,
            currentlyWorking: /present|current/i.test(endDate),
            description: bulletLines.join(' '),
        });
    }

    // Sort reverse-chronologically (currentlyWorking first, then descending startDate)
    workHistory.sort((a, b) => {
        if (a.currentlyWorking && !b.currentlyWorking) return -1;
        if (!a.currentlyWorking && b.currentlyWorking) return 1;
        return b.startDate.localeCompare(a.startDate);
    });

    // 4. Extract Education
    const education: ParsedEducationEntry[] = [];
    for (const line of lines) {
        const match = line.match(roleHeaderRegex);
        if (
            match &&
            /master|bachelor|university|college|institute|b\.tech|mca|bca|degree/i.test(
                `${match[1]} ${match[2]}`
            )
        ) {
            education.push({
                degree: match[1].trim(),
                institution: match[2].trim(),
                startDate: match[3].trim(),
                endDate: match[4].trim(),
            });
        }
    }

    // 5. Extract Skills
    const matchedSkills = KNOWN_TECH_SKILLS.filter((skill) => {
        const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(?:^|[^a-zA-Z0-9])${escaped}(?:$|[^a-zA-Z0-9])`, 'i').test(
            rawText
        );
    });

    const currentEmployer = workHistory[0]?.company ?? '';
    const highestDegree = education[0]?.degree ?? '';

    return {
        name: `${fullName} — Imported Persona`,
        contactInfo: {
            firstName,
            lastName,
            fullName,
            email: emailMatch ? emailMatch[0].trim() : '',
            phone: phoneMatch ? phoneMatch[0].trim() : '',
            locationLabel: locationMatch ? locationMatch[1].trim() : '',
            linkedinUrl: linkedinMatch ? linkedinMatch[0].trim() : '',
            githubUrl: githubMatch ? githubMatch[0].trim() : '',
        },
        workHistory,
        education,
        skills: {
            all: matchedSkills,
        },
        lockedFacts: {
            currentEmployer,
            highestDegree,
            email: emailMatch ? emailMatch[0].trim() : '',
            phone: phoneMatch ? phoneMatch[0].trim() : '',
        },
    };
}
