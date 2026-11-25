import {
    extractTextFromResumeBuffer,
    parseResumeTextToPersona,
    type ParsedPersonaData,
    type ParsedWorkHistoryEntry,
    type ParsedEducationEntry,
} from './parser.ts';

export type { ParsedPersonaData, ParsedWorkHistoryEntry, ParsedEducationEntry };

export async function POST(request: Request): Promise<Response> {
    try {
        const contentType = request.headers.get('content-type') || '';
        let rawText = '';

        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            const file = formData.get('file');

            if (!file || typeof file === 'string') {
                return Response.json(
                    { ok: false, error: 'Missing uploaded resume file in FormData.' },
                    { status: 400 }
                );
            }

            const fileObj = file as File;
            const arrayBuf = await fileObj.arrayBuffer();
            rawText = extractTextFromResumeBuffer(
                Buffer.from(arrayBuf),
                fileObj.name || 'resume.pdf'
            );
        } else {
            const body = (await request.json()) as {
                rawText?: string;
                base64?: string;
                fileName?: string;
            };
            if (body.rawText) {
                rawText = body.rawText;
            } else if (body.base64) {
                rawText = extractTextFromResumeBuffer(
                    Buffer.from(body.base64, 'base64'),
                    body.fileName ?? 'resume.pdf'
                );
            }
        }

        if (!rawText.trim()) {
            return Response.json(
                { ok: false, error: 'Could not extract readable text from resume.' },
                { status: 400 }
            );
        }

        const personaData = parseResumeTextToPersona(rawText);

        return Response.json(
            {
                ok: true,
                personaData,
            },
            { status: 200 }
        );
    } catch (err) {
        return Response.json(
            {
                ok: false,
                error:
                    err instanceof Error ? err.message : 'Failed to parse resume file.',
            },
            { status: 500 }
        );
    }
}
