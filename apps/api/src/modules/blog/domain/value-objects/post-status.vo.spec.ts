import { canArchive, canPublish, POST_STATUSES } from './post-status.vo';

describe('post-status.vo', () => {
  it('expone los cuatro estados editoriales', () => {
    expect(POST_STATUSES).toEqual([
      'DRAFT',
      'SCHEDULED',
      'PUBLISHED',
      'ARCHIVED',
    ]);
  });

  describe('canPublish', () => {
    it('permite publicar desde cualquier estado (incluye re-publicar archivados)', () => {
      expect(canPublish('DRAFT')).toBe(true);
      expect(canPublish('SCHEDULED')).toBe(true);
      expect(canPublish('ARCHIVED')).toBe(true);
      expect(canPublish('PUBLISHED')).toBe(true);
    });
  });

  describe('canArchive', () => {
    it('permite archivar salvo lo que ya está archivado', () => {
      expect(canArchive('DRAFT')).toBe(true);
      expect(canArchive('SCHEDULED')).toBe(true);
      expect(canArchive('PUBLISHED')).toBe(true);
      expect(canArchive('ARCHIVED')).toBe(false);
    });
  });
});
