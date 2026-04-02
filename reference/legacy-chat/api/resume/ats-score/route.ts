import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import { generateText } from 'ai';
import { getArtifactModel } from '@/lib/ai/providers';

const AtsScoreSchema = z.object({
  resumeText: z.string().min(10, 'Resume text is too short'),
  jobDescription: z.string().optional().default(''),
});

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = AtsScoreSchema.safeParse(body);

    if (!validatedData.success) {
      const errorMessage = validatedData.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      return NextResponse.json(
        { error: `Validation failed: ${errorMessage}` },
        { status: 400 }
      );
    }

    const { resumeText, jobDescription } = validatedData.data;

    const system = `You are an assistant that analyzes resumes for ATS (applicant tracking system) compatibility and job fit. Return a single JSON object that exactly matches the schema described below. Do not output any other text or commentary.

Schema keys and types:
- atsScore: integer 0-100
- jobMatchPercent: integer 0-100
- matchedKeywords: array of strings
- missingKeywords: array of strings
- weakKeywords: array of strings
- skills: array of objects { category: string, matchPercent: integer 0-100, note: string }
- experience: object { requiredYears: number, actualYears: number, roleRelevance: "Low"|"Medium"|"High", roleReason: string, roleBadgeColor: "danger"|"warning"|"success" }
- readabilityScore: integer 0-10
- parsingIssues: array of strings
- riskFactors: array of strings
- strengths: array of strings
- gaps: array of strings
- recommendations: object { keywordsToAdd: string[], sectionsToImprove: string[], bulletSuggestions: string[] }
- finalVerdict: object { result: "Pass"|"Borderline"|"Reject", confidence: integer 0-100, summary: string }
- verdictBadgeColor: one of "success","warning","danger"
- verdictBg: string (short css color token)
`;

    const prompt = `Resume:\n${resumeText}\n\nJob:\n${jobDescription ?? ""}\n\nReturn the JSON object now.`;

    const { text } = await generateText({
      model: getArtifactModel(),
      system,
      prompt,
    });

    // Parse JSON response
    const tryParseJson = (s: string) => {
      try {
        return JSON.parse(s);
      } catch (_) {
        const start = s.indexOf('{');
        const end = s.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          const sub = s.slice(start, end + 1);
          try {
            return JSON.parse(sub);
          } catch (_e) {
            return null;
          }
        }
        return null;
      }
    };

    const result = tryParseJson(text);

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to parse ATS score response' },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[ATS Score API] Error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to calculate ATS score',
      },
      { status: 500 }
    );
  }
}
