import { GetFeedUseCase } from './get-feed.use-case';

describe('GetFeedUseCase', () => {
  let siteEntries: { listFeed: jest.Mock };
  let follows: { listFollowingIds: jest.Mock };
  let useCase: GetFeedUseCase;

  beforeEach(() => {
    siteEntries = {
      listFeed: jest.fn().mockResolvedValue({ items: ['entry'], nextCursor: null }),
    };
    follows = { listFollowingIds: jest.fn().mockResolvedValue(['user-2', 'user-3']) };
    useCase = new GetFeedUseCase(siteEntries as never, follows as never);
  });

  it('no consulta site entries si no sigues a nadie', async () => {
    follows.listFollowingIds.mockResolvedValue([]);

    const result = await useCase.execute({ userId: 'user-1', limit: 20 });

    expect(result).toEqual({ items: [], nextCursor: null });
    expect(siteEntries.listFeed).not.toHaveBeenCalled();
  });

  it('pide el feed a partir de la gente que sigues', async () => {
    const result = await useCase.execute({ userId: 'user-1', limit: 20, cursor: 'abc' });

    expect(siteEntries.listFeed).toHaveBeenCalledWith({
      userIds: ['user-2', 'user-3'],
      limit: 20,
      cursor: 'abc',
    });
    expect(result).toEqual({ items: ['entry'], nextCursor: null });
  });
});
