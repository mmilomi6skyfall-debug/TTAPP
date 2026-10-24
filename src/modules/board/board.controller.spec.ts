import { describe, expect, it, jest } from '@jest/globals';
import { BoardController } from './board.controller';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';

describe('BoardController', () => {
  it('returns aggregate metrics scoped to the caller organization', async () => {
    const query = jest.fn<(...args: any[]) => Promise<any[]>>();
    query.mockResolvedValueOnce([{ status: 'CLOSED', count: 2 }]);
    query.mockResolvedValueOnce([{ status: 'OPEN', count: 1 }]);
    query.mockResolvedValueOnce([{ amount: '120.50' }]);
    query.mockResolvedValueOnce([{ amount: '12.05' }]);
    const db = { query };
    const controller = new BoardController(db as any);
    const actor = { id: 'board-user', role: 'BOARD', organizationId: 'org-a', permissions: ['board.summary.view'] } as AuthenticatedUser;
    await expect(controller.summary(actor)).resolves.toEqual({
      tripsByStatus: { CLOSED: 2 },
      panicAlertsByStatus: { OPEN: 1 },
      manuallyConfirmedAmount: 120.5,
      accruedCommission: 12.05,
    });
    expect(query).toHaveBeenCalledTimes(4);
    for (const call of query.mock.calls) expect(call[1]).toEqual(['org-a']);
  });
});
