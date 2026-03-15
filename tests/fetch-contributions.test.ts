import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@octokit/graphql', () => ({
  graphql: vi.fn(),
}));

import { fetchContributions } from '../src/fetch-contributions.js';
import { graphql } from '@octokit/graphql';

const mockedGraphql = vi.mocked(graphql);

function makeResponse(weeks: { contributionDays: any[] }[]) {
  return {
    user: {
      contributionsCollection: {
        contributionCalendar: { weeks },
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchContributions', () => {
  it('parses valid response with 2 weeks of data', async () => {
    mockedGraphql.mockResolvedValueOnce(
      makeResponse([
        {
          contributionDays: [
            { contributionCount: 5, contributionLevel: 'FIRST_QUARTILE', date: '2024-01-01', weekday: 1 },
            { contributionCount: 0, contributionLevel: 'NONE', date: '2024-01-02', weekday: 2 },
          ],
        },
        {
          contributionDays: [
            { contributionCount: 12, contributionLevel: 'FOURTH_QUARTILE', date: '2024-01-08', weekday: 1 },
          ],
        },
      ]) as any,
    );

    const cells = await fetchContributions('testuser', 'ghp_token123');
    expect(cells).toHaveLength(3);

    expect(cells[0]).toEqual({ x: 0, y: 1, date: '2024-01-01', count: 5, level: 1 });
    expect(cells[1]).toEqual({ x: 0, y: 2, date: '2024-01-02', count: 0, level: 0 });
    expect(cells[2]).toEqual({ x: 1, y: 1, date: '2024-01-08', count: 12, level: 4 });
  });

  it('maps all contribution levels correctly', async () => {
    mockedGraphql.mockResolvedValueOnce(
      makeResponse([
        {
          contributionDays: [
            { contributionCount: 0, contributionLevel: 'NONE', date: '2024-01-01', weekday: 0 },
            { contributionCount: 1, contributionLevel: 'FIRST_QUARTILE', date: '2024-01-02', weekday: 1 },
            { contributionCount: 3, contributionLevel: 'SECOND_QUARTILE', date: '2024-01-03', weekday: 2 },
            { contributionCount: 6, contributionLevel: 'THIRD_QUARTILE', date: '2024-01-04', weekday: 3 },
            { contributionCount: 10, contributionLevel: 'FOURTH_QUARTILE', date: '2024-01-05', weekday: 4 },
          ],
        },
      ]) as any,
    );

    const cells = await fetchContributions('user', 'token');
    expect(cells.map(c => c.level)).toEqual([0, 1, 2, 3, 4]);
  });

  it('handles unknown contribution level by defaulting to 0', async () => {
    mockedGraphql.mockResolvedValueOnce(
      makeResponse([
        {
          contributionDays: [
            { contributionCount: 1, contributionLevel: 'UNKNOWN_LEVEL', date: '2024-06-01', weekday: 5 },
          ],
        },
      ]) as any,
    );

    const cells = await fetchContributions('user', 'token');
    expect(cells[0].level).toBe(0);
  });

  it('passes correct auth header to graphql', async () => {
    mockedGraphql.mockResolvedValueOnce(makeResponse([]) as any);

    await fetchContributions('octocat', 'ghp_secret');

    expect(mockedGraphql).toHaveBeenCalledOnce();
    const callArgs = mockedGraphql.mock.calls[0];
    expect(callArgs[1]).toMatchObject({
      login: 'octocat',
      headers: { authorization: 'token ghp_secret' },
    });
  });

  it('handles empty weeks array', async () => {
    mockedGraphql.mockResolvedValueOnce(makeResponse([]) as any);

    const cells = await fetchContributions('user', 'token');
    expect(cells).toEqual([]);
  });
});
