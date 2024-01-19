import { asTime, timeDateTime } from './helpers';

describe('asTime', () => {
  it('can format undefined times (and default to 0:00)', () => {
    expect(asTime(undefined)).toBe('0:00');
  });

  it('can format 0', () => {
    expect(asTime(0)).toBe('0:00');
  });

  it('minutes doesnt have leading zero if there is no hour', () => {
    expect(asTime(0)).toBe('0:00');
    expect(asTime(60)).toBe('1:00');
  });

  it('minutes have leading zero if there is hour specified', () => {
    expect(asTime(3800).split(':')[1]).toBe('03');
  });

  it('seconds under 10 have leading zeros', () => {
    expect(asTime(65).split(':')[1]).toBe('05');
    expect(asTime(6).split(':')[1]).toBe('06');
  });

  it('seconds over 10 does not have leading zeros', () => {
    expect(asTime(3800).split(':')[2]).toBe('20');
  });

  it('can format some integers to times', () => {
    expect(asTime(60)).toBe('1:00');
    expect(asTime(180)).toBe('3:00');
    expect(asTime(666)).toBe('11:06');
  });

  it('can handle strings too', () => {
    expect(asTime('0')).toBe(asTime(0));
    expect(asTime('50')).toBe(asTime(50));
    expect(asTime('999')).toBe(asTime(999));
  });

  it('floating point numbers are converted (not rounded)', () => {
    expect(asTime(62.82312)).toBe('1:02');
  });
});

describe('timeDateTime', () => {
  it('can format undefined times (and default to 0:00)', () => {
    expect(timeDateTime(undefined)).toBe('PM0');
  });

  it('can format 0', () => {
    expect(timeDateTime(0)).toBe('PM0');
  });

  it('minutes doesnt have leading zero if there is no hour', () => {
    expect(timeDateTime(0)).toBe('PM0');
    expect(timeDateTime(60)).toBe('PM1');
  });

  it('can format some integers to times', () => {
    expect(timeDateTime(60)).toBe('PM1');
    expect(timeDateTime(180)).toBe('PM3');
    expect(timeDateTime(666)).toBe('PM11S6');
  });

  it('can handle strings too', () => {
    expect(timeDateTime('0')).toBe(timeDateTime(0));
    expect(timeDateTime('50')).toBe(timeDateTime(50));
    expect(timeDateTime('999')).toBe(timeDateTime(999));
  });
});
