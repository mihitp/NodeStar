import { NextResponse } from 'next/server';
import { loadSkills } from '@/lib/skills';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const skills = loadSkills();
    // Strip contextMarkdown from the listing response (too heavy)
    const listing = skills.map(({ contextMarkdown: _, ...s }) => s);
    return NextResponse.json({ skills: listing });
  } catch (err) {
    console.error('[skills] GET error', err);
    return NextResponse.json({ error: 'Failed to load skills' }, { status: 500 });
  }
}
