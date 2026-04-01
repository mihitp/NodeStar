import fs from 'fs';
import path from 'path';

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  tags: string[];
  contextMarkdown: string;
}

const SKILLS_DIR = path.join(process.cwd(), 'skills');

function parseFrontmatter(raw: string): { meta: Record<string, unknown>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };

  const meta: Record<string, unknown> = {};
  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const rawVal = line.slice(colon + 1).trim();
    // Array values like [a, b, c]
    if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
      meta[key] = rawVal
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim());
    } else {
      meta[key] = rawVal;
    }
  }
  return { meta, body: match[2].trim() };
}

export function loadSkills(): Skill[] {
  if (!fs.existsSync(SKILLS_DIR)) return [];

  const skills: Skill[] = [];
  const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const contextPath = path.join(SKILLS_DIR, entry.name, 'context.md');
    if (!fs.existsSync(contextPath)) continue;

    const raw = fs.readFileSync(contextPath, 'utf-8');
    const { meta, body } = parseFrontmatter(raw);

    skills.push({
      id: String(meta.id ?? entry.name),
      name: String(meta.name ?? entry.name),
      description: String(meta.description ?? ''),
      icon: String(meta.icon ?? 'default'),
      tags: Array.isArray(meta.tags) ? (meta.tags as string[]) : [],
      contextMarkdown: body,
    });
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

export function loadSkillById(id: string): Skill | null {
  const skills = loadSkills();
  return skills.find((s) => s.id === id) ?? null;
}
