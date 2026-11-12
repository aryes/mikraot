import { describe, expect, it } from 'vitest';
import { emptyStats, hardest, readStats, recordAnswer, recordRound } from './quiz-stats';

/** The answers a quiz knows: all but one dropped since the stats were saved. */
const known = (id: string) => id !== 'gone';

describe('quiz stats', () => {
  it('count answers, misses by answer, rounds and the best round', () => {
    let stats = emptyStats();
    stats = recordAnswer(stats, 'מונח', true);
    stats = recordAnswer(stats, 'מהפך', false);
    stats = recordRound(recordRound(stats, 7), 4);
    expect(stats).toEqual({
      rounds: 2,
      asked: 2,
      right: 1,
      best: 7,
      answers: { מונח: { asked: 1, missed: 0 }, מהפך: { asked: 1, missed: 1 } },
    });
  });

  it('name the answers missed most, once asked often enough', () => {
    let stats = emptyStats();
    const answer = (id: string, correct: boolean, times: number) => {
      for (let i = 0; i < times; i++) stats = recordAnswer(stats, id, correct);
    };
    answer('מונח', false, 2); // asked twice only: not yet
    answer('מהפך', false, 3);
    answer('פשטא', true, 3);
    answer('פשטא', false, 1);
    answer('קדמא', true, 5);
    expect(hardest(stats)).toEqual(['מהפך', 'פשטא']);
  });

  it('read back only what they wrote, for answers the quiz knows, as counts that can be', () => {
    expect(readStats(null, known)).toEqual(emptyStats());
    const saved = {
      rounds: -1,
      asked: 2,
      right: 5,
      answers: { x: { asked: 2, missed: 'a' }, y: { asked: 1, missed: 4 }, gone: { asked: 9 } },
    };
    expect(readStats(saved, known)).toEqual({
      ...emptyStats(),
      asked: 2,
      right: 2,
      answers: { x: { asked: 2, missed: 0 }, y: { asked: 1, missed: 1 } },
    });
  });
});
