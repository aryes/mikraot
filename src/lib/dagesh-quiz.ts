/**
 * The dagesh quiz ("דגש חזק או קל", src/components/DageshQuiz.tsx; from the quiz ideas of
 * 2026-11-11): a word from the Torah with a dagesh marked, חזק or קל? Only dageshes the rules of
 * the site's pages "דגש קל" and "דגש חזק" settle (scripts/quiz/dagesh-words.ts), each by its
 * rule, which the feedback names: "למה קל? אחרי שווא נח." Its list: public/quiz/dagesh-words.json.
 */
import type { QuizKind } from './quiz';

export const DAGESH_KINDS = ['דגש-חזק', 'דגש-קל'] as const;

/** Why, for each group of the list: a דגש קל's rules, then a דגש חזק's. */
export const DAGESH_REASONS: Readonly<Record<string, string>> = {
  'קל-ראש': 'למה קל? בג״ד כפ״ת בראש מילה.',
  'קל-שווא': 'למה קל? בג״ד כפ״ת אחרי שווא נח.',
  'חזק-תנועה': 'למה חזק? בג״ד כפ״ת אחרי תנועה.',
  'חזק-אות': 'למה חזק? אות שאינה בג״ד כפ״ת.',
};

export const DAGESH_GROUPS = Object.keys(DAGESH_REASONS);

/** A round: five of each kind, every rule among them. */
export const DAGESH_PER_GROUP: Readonly<Record<string, number>> = {
  'קל-ראש': 2,
  'קל-שווא': 3,
  'חזק-תנועה': 3,
  'חזק-אות': 2,
};

/** A group's answer. */
export const dageshKind = (group: string) => (group.startsWith('קל') ? 'דגש-קל' : 'דגש-חזק');

export const DAGESH_QUIZ: QuizKind = { ids: DAGESH_KINDS, lookAlikes: [] };

/** The pages on the דגש קל and the דגש חזק, which the feedback links to. */
export const DAGESH_PAGE = '/דגש-קל/';
export const DAGESH_STRONG_PAGE = '/דגש-חזק/';
