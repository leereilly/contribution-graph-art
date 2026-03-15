import { ContributionCell, ContributionLevel } from './types.js';

const CONTRIBUTION_QUERY = `
query ($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        weeks {
          contributionDays {
            contributionCount
            contributionLevel
            date
            weekday
          }
        }
      }
    }
  }
}
`;

const LEVEL_MAP: Record<string, ContributionLevel> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

export async function fetchContributions(
  username: string,
  token: string
): Promise<ContributionCell[]> {
  const { graphql } = await import('@octokit/graphql');

  const response: any = await graphql(CONTRIBUTION_QUERY, {
    login: username,
    headers: {
      authorization: `token ${token}`,
    },
  });

  const weeks = response.user.contributionsCollection.contributionCalendar.weeks;
  const cells: ContributionCell[] = [];

  for (let weekIndex = 0; weekIndex < weeks.length; weekIndex++) {
    const week = weeks[weekIndex];
    for (const day of week.contributionDays) {
      cells.push({
        x: weekIndex,
        y: day.weekday,
        date: day.date,
        count: day.contributionCount,
        level: LEVEL_MAP[day.contributionLevel] ?? 0,
      });
    }
  }

  return cells;
}
