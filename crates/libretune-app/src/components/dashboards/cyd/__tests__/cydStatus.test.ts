import { lampColor, lampIsAlarm } from '../cydLogic';

describe('status lamp colours', () => {
  it('turns plain white/black "on" colours into the dash accent', () => {
    expect(lampColor('#ffffff')).toBe('var(--cyd-accent)');
    expect(lampColor('#000000')).toBe('var(--cyd-accent)');
    expect(lampColor('#00ff00')).toBe('#00ff00');
  });

  it('treats red as an alarm, green and yellow as not', () => {
    expect(lampIsAlarm('#ff0000')).toBe(true);
    expect(lampIsAlarm('red')).toBe(true);
    expect(lampIsAlarm('#00ff00')).toBe(false);
    expect(lampIsAlarm('#ffff00')).toBe(false);
  });
});
