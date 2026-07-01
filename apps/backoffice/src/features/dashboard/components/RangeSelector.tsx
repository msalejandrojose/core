import { cn } from '@/lib/utils';
import { RANGE_PRESETS, type RangePreset } from '../hooks/use-kpi-series';

interface RangeSelectorProps {
  value: RangePreset;
  onChange: (preset: RangePreset) => void;
}

export function RangeSelector({ value, onChange }: RangeSelectorProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border p-1">
      {RANGE_PRESETS.map((preset) => (
        <button
          key={preset.label}
          onClick={() => onChange(preset)}
          className={cn(
            'rounded-md px-3 py-1 text-sm font-medium transition-colors',
            preset.label === value.label
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
