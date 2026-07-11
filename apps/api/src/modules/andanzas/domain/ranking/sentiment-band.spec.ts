import { bandFor, sentimentForScore } from './sentiment-band';

describe('sentiment-band', () => {
  it('expone las tres bandas sin huecos ni solapes', () => {
    expect(bandFor('DISLIKED')).toEqual({ min: 0, max: 4.9 });
    expect(bandFor('NEUTRAL')).toEqual({ min: 5, max: 6.9 });
    expect(bandFor('LIKED')).toEqual({ min: 7, max: 10 });
  });

  it('clasifica un score en su banda por los límites inferiores', () => {
    expect(sentimentForScore(0)).toBe('DISLIKED');
    expect(sentimentForScore(4.9)).toBe('DISLIKED');
    expect(sentimentForScore(5)).toBe('NEUTRAL');
    expect(sentimentForScore(6.9)).toBe('NEUTRAL');
    expect(sentimentForScore(7)).toBe('LIKED');
    expect(sentimentForScore(10)).toBe('LIKED');
  });
});
