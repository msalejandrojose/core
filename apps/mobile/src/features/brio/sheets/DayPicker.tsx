import { useMemo } from 'react';
import { dayChipLabel, recentDays } from './day-pick';

interface DayPickerProps {
  value: string;
  today: string;
  onChange: (day: string) => void;
  label?: string;
}

/**
 * «Cuándo» de los sheets de registro: la última semana a un toque y, para lo
 * de antes, el calendario del sistema. Nunca deja elegir un día futuro.
 */
export function DayPicker({ value, today, onChange, label = 'Día' }: DayPickerProps) {
  const days = useMemo(() => recentDays(today, 7), [today]);
  const older = !days.includes(value);

  return (
    <div className="daypick" role="group" aria-label={label}>
      {days.map((d) => (
        <button
          key={d}
          type="button"
          className="workout__chip daypick__chip"
          aria-pressed={value === d}
          onClick={() => onChange(d)}
        >
          {dayChipLabel(d, today)}
        </button>
      ))}
      <label className={`workout__chip daypick__chip daypick__other${older ? ' is-on' : ''}`}>
        {older ? dayChipLabel(value, today) : 'Otro día'}
        <input
          type="date"
          className="daypick__input"
          aria-label="Elegir otra fecha"
          max={today}
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (v && v <= today) onChange(v);
          }}
        />
      </label>
    </div>
  );
}
