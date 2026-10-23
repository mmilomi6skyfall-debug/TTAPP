import { describe, expect, it, jest } from '@jest/globals';
import { BoardController } from './board.controller';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';

describe('BoardController', () => {
  it('returns aggregate metrics scoped to the caller organization', async () => {
    const db = {
      query: jest.fn()
        .mockResolvedValueOnce([{ status: 'CLOSED', count: 2 }])
        .mockResolvedValueOnce([{ status: 'OPEN', count: 1 }])
        .mockResolvedValueOnce([{ amount: '120.50' }])
        .mockResolvedValueOnce([{ amount: '12.05' }]),
    };
    const controller = new BoardController(db as any);
    const actor = { id: 'board-user', role: 'BOARD', organizationId: 'org-a', permissions: ['board.summary.view'] } as AuthenticatedUser;
    await expect(controller.summary(actor)).resolves.toEqual({
      tripsByStatus: { CLOSED: 2 },
      panicAlertsByStatus: { OPEN: 1 },
      manuallyConfirmedAmount: 120.5,
      accruedCommission: 12.05,
    });
    expect(db.query).toHaveBeenCalledTimes(4);
    for (const call of (db.query as any).mock.calls) expect(call[1]).toEqual(['org-a']);
  });
});
