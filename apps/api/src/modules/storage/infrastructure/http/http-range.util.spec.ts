import { parseSingleRange, sanitizeFilename } from './http-range.util';

describe('parseSingleRange', () => {
  const total = 1000;

  it('parses a closed range', () => {
    expect(parseSingleRange('bytes=0-499', total)).toEqual({
      start: 0,
      end: 499,
    });
  });

  it('parses an open-ended range as up to the last byte', () => {
    expect(parseSingleRange('bytes=500-', total)).toEqual({
      start: 500,
      end: 999,
    });
  });

  it('parses a suffix range as the last N bytes', () => {
    expect(parseSingleRange('bytes=-200', total)).toEqual({
      start: 800,
      end: 999,
    });
  });

  it('clamps a suffix larger than the resource to the whole resource', () => {
    expect(parseSingleRange('bytes=-5000', total)).toEqual({
      start: 0,
      end: 999,
    });
  });

  it('clamps an end beyond the resource size', () => {
    expect(parseSingleRange('bytes=990-5000', total)).toEqual({
      start: 990,
      end: 999,
    });
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseSingleRange('  bytes=0-0 ', total)).toEqual({
      start: 0,
      end: 0,
    });
  });

  it('rejects a start past the end of the resource', () => {
    expect(parseSingleRange('bytes=1000-1200', total)).toBeNull();
  });

  it('rejects a start greater than the end', () => {
    expect(parseSingleRange('bytes=500-100', total)).toBeNull();
  });

  it('rejects a zero-length suffix', () => {
    expect(parseSingleRange('bytes=-0', total)).toBeNull();
  });

  it('rejects an empty / malformed spec', () => {
    expect(parseSingleRange('bytes=-', total)).toBeNull();
    expect(parseSingleRange('bytes=abc-def', total)).toBeNull();
    expect(parseSingleRange('items=0-10', total)).toBeNull();
  });

  it('rejects multi-range requests', () => {
    expect(parseSingleRange('bytes=0-99,200-299', total)).toBeNull();
  });
});

describe('sanitizeFilename', () => {
  it('strips quotes and newlines that would break the header', () => {
    expect(sanitizeFilename('in"voice\r\n.pdf')).toBe('in_voice__.pdf');
  });

  it('leaves a normal name untouched', () => {
    expect(sanitizeFilename('foto-perfil.png')).toBe('foto-perfil.png');
  });
});
