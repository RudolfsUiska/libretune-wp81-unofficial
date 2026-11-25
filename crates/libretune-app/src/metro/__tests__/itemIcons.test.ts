import {
  BatteryMedium,
  BookOpen,
  Cable,
  Droplets,
  Ear,
  Flame,
  Fuel,
  Grid3x3,
  Hourglass,
  Key,
  ListChecks,
  Microscope,
  Palette,
  SlidersHorizontal,
  ThermometerSun,
  Thermometer,
  TrendingDown,
  Wind,
  Zap,
} from 'lucide-react';
import { iconForLabel, iconForMenuType } from '../itemIcons';

describe('list row icons', () => {
  it.each([
    ['VE Table', Fuel],
    ['Ignition advance', Zap],
    ['Dwell Table', Zap],
    ['Max knock retard', Ear],
    ['Idle Target RPM Ignition advance', Hourglass],
    ['Target AFR', Droplets],
    ['Boost Control', Wind],
    ['Cranking settings', Key],
    ['After-start enrichment', ThermometerSun],
    ['Manual Warmup enrichment(CLT)', ThermometerSun],
    ['Deceleration fuel cutoff (DFCO)', TrendingDown],
    ['Accelerator pedal', SlidersHorizontal],
    ['Coolant Temperature (CLT)', Thermometer],
    ['Battery and alternator', BatteryMedium],
    ['Tooth Logger', Microscope],
    ['Burn to ECU', Flame],
    ['user manual', BookOpen],
    ['connection', Cable],
    ['start+theme', Palette],
  ])('%s', (label, icon) => {
    expect(iconForLabel(label)).toBe(icon);
  });

  it('falls back to the item kind when no word matches', () => {
    expect(iconForLabel('Zyxw', iconForMenuType('Table'))).toBe(Grid3x3);
    expect(iconForLabel('Zyxw', iconForMenuType('Dialog'))).toBe(ListChecks);
  });
});
