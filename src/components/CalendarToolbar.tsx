import type { CalendarView } from '../types';

interface CalendarToolbarProps {
  view: CalendarView;
  label: string;
  subtitle: string;
  onViewChange: (view: CalendarView) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onToday: () => void;
}

const VIEW_OPTIONS: CalendarView[] = ['week', 'month'];

export function CalendarToolbar({
  view,
  label,
  subtitle,
  onViewChange,
  onNavigate,
  onToday,
}: CalendarToolbarProps) {
  return (
    <div className="surface-card toolbar" role="region" aria-label="Calendar controls">
      <div className="toolbar-title">
        <h1>{label}</h1>
        <span>{subtitle}</span>
      </div>
      <div className="toolbar-actions">
        <div className="segmented-control" role="tablist" aria-label="Calendar view">
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={option === view}
              className={option === view ? 'active' : ''}
              onClick={() => onViewChange(option)}
            >
              {option === 'week' ? 'Week' : 'Month'}
            </button>
          ))}
        </div>
        <button type="button" className="btn" onClick={() => onNavigate('prev')} aria-label="Previous">
          ←
        </button>
        <button type="button" className="btn" onClick={onToday}>
          Today
        </button>
        <button type="button" className="btn" onClick={() => onNavigate('next')} aria-label="Next">
          →
        </button>
      </div>
    </div>
  );
}
