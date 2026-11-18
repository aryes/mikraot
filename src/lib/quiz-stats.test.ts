import { describe, expect, it } from 'vitest';
import { addStats, emptyStats, hardest, readStats, recordAnswer, recordRound } from './quiz-stats';

/** The answers a quiz knows: all but one dropped since the stats were saved. */
const known = (id: string) => id !== 'gone';

describe('quiz stats', () => {
  it('count answers, misses by answer, rounds and the best round', () => {
    let stats = emptyStats();
    stats = recordAnswer(stats, 'מונח', true, 10);
    stats = recordAnswer(stats, 'מהפך', false, null);
    stats = recordRound(recordRound(stats, 7, 10), 4, null);
    expect(stats).toEqual({
      rounds: 2,
      asked: 2,
      right: 1,
      best: 7,
      answers: { מונח: { asked: 1, missed: 0 }, מהפך: { asked: 1, missed: 1 } },
      byLimit: {
        '10': { rounds: 1, asked: 1, right: 1, best: 7 },
        none: { rounds: 1, asked: 1, right: 0, best: 4 },
      },
    });
  });

  it('name the answers missed most, once asked often enough', () => {
    let stats = emptyStats();
    const answer = (id: string, correct: boolean, times: number) => {
      for (let i = 0; i < times; i++) stats = recordAnswer(stats, id, correct, null);
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
      // A limit no longer offered is dropped.
      byLimit: { '5': { rounds: 1, asked: 3, right: 4, best: 2 }, '15': { rounds: 1 } },
    };
    expect(readStats(saved, known)).toEqual({
      ...emptyStats(),
      asked: 2,
      right: 2,
      answers: { x: { asked: 2, missed: 0 }, y: { asked: 1, missed: 1 } },
      byLimit: { '5': { rounds: 1, asked: 3, right: 3, best: 2 } },
    });
  });
});

describe('addStats', () => {
  it("adds two devices' results: counts summed, the better best", () => {
    const a = recordRound(recordAnswer(emptyStats(), 'x', true, null), 8, null);
    const b = recordRound(
      recordAnswer(recordAnswer(emptyStats(), 'x', false, 5), 'y', true, 5),
      6,
      5,
    );
    expect(addStats(a, b)).toEqual({
      rounds: 2,
      asked: 3,
      right: 2,
      best: 8,
      answers: { x: { asked: 2, missed: 1 }, y: { asked: 1, missed: 0 } },
      byLimit: {
        none: { rounds: 1, asked: 1, right: 1, best: 8 },
        '5': { rounds: 1, asked: 2, right: 1, best: 6 },
      },
    });
    expect(addStats(a, emptyStats())).toEqual(a);
  });
});
