import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { HabitsChecklist } from '@/components/dashboard/HabitsChecklist';
import { LogActivitySheet } from '@/components/dashboard/LogActivitySheet';
import { MedsDueCard } from '@/components/dashboard/MedsDueCard';
import { WeeklyReportCard } from '@/components/WeeklyReportCard';
import { MedicationSchedule, WeeklyReport } from '@/lib/types';

describe('HabitsChecklist', () => {
  const habits = [
    { id: 1, title: 'Walk', category: 'fitness', icon: '', completed: true },
    { id: 2, title: 'Meditate', category: 'mindfulness', icon: '', completed: false },
    { id: 3, title: 'Read', category: 'mindfulness', icon: '', completed: false },
  ];

  it('toggles a habit and respects the limit', () => {
    const onToggle = jest.fn();
    render(<HabitsChecklist habits={habits} onToggle={onToggle} limit={2} />);
    expect(screen.queryByText('Read')).toBeNull();
    fireEvent.press(screen.getByRole('checkbox', { name: 'Meditate' }));
    expect(onToggle).toHaveBeenCalledWith(habits[1]);
    expect(screen.getByRole('checkbox', { name: 'Walk' }).props.accessibilityState.checked).toBe(true);
  });
});

describe('ActivityFeed', () => {
  it('shows an empty state', () => {
    render(<ActivityFeed logs={[]} onDelete={jest.fn()} />);
    expect(screen.getByText('Nothing logged yet today')).toBeTruthy();
  });

  it('formats values and deletes', () => {
    const onDelete = jest.fn();
    const log = {
      id: 7,
      user_id: 'u',
      activity_type: 'water' as const,
      details: 'Glass',
      value: 0.25,
      timestamp: '2026-01-01T09:00:00',
    };
    render(<ActivityFeed logs={[log]} onDelete={onDelete} />);
    expect(screen.getByText('250 ml')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Delete Glass'));
    expect(onDelete).toHaveBeenCalledWith(log);
  });
});

describe('MedsDueCard', () => {
  const base: MedicationSchedule = {
    date: '2026-01-01',
    total: 2,
    taken: 0,
    adherence: 0,
    next_dose: null,
    doses: [
      {
        medication_id: 1,
        name: 'Metformin',
        dosage: '500 mg',
        instructions: '',
        scheduled_time: '08:00',
        taken: false,
        taken_at: null,
        status: 'overdue',
      },
      {
        medication_id: 1,
        name: 'Metformin',
        dosage: '500 mg',
        instructions: '',
        scheduled_time: '20:00',
        taken: false,
        taken_at: null,
        status: 'upcoming',
      },
    ],
  };

  it('renders nothing without medications', () => {
    const { toJSON } = render(
      <MedsDueCard schedule={{ ...base, total: 0, doses: [] }} onToggle={jest.fn()} onOpen={jest.fn()} />
    );
    expect(toJSON()).toBeNull();
  });

  it('prioritises overdue doses and lets you mark them taken', () => {
    const onToggle = jest.fn();
    render(<MedsDueCard schedule={base} onToggle={onToggle} onOpen={jest.fn()} />);
    expect(screen.getByText('overdue')).toBeTruthy();
    expect(screen.queryByText('upcoming')).toBeNull();
    fireEvent.press(screen.getByLabelText('Mark Metformin at 08:00 as taken'));
    expect(onToggle).toHaveBeenCalledWith(base.doses[0]);
  });
});

describe('LogActivitySheet', () => {
  it('validates input before submitting', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<LogActivitySheet type="workout" onClose={jest.fn()} onSubmit={onSubmit} />);
    fireEvent.press(screen.getByRole('button', { name: 'Save entry' }));
    expect(await screen.findByText('Please describe it.')).toBeTruthy();
    expect(screen.getByText('Enter a number greater than 0.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByLabelText('Activity'), 'Evening run');
    fireEvent.changeText(screen.getByLabelText('Duration'), '1000');
    fireEvent.press(screen.getByRole('button', { name: 'Save entry' }));
    expect(await screen.findByText('Must be under 720 min.')).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Duration'), '35');
    fireEvent.press(screen.getByRole('button', { name: 'Save entry' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('workout', 'Evening run', 35));
  });

  it('fills fields from a preset', () => {
    render(<LogActivitySheet type="water" onClose={jest.fn()} onSubmit={jest.fn()} />);
    fireEvent.press(screen.getByText('🍶 500 ml (Bottle)'));
    expect(screen.getByLabelText('Amount').props.value).toBe('0.5');
  });
});

describe('WeeklyReportCard', () => {
  const window = {
    start: '2026-01-01',
    end: '2026-01-07',
    active_days: 5,
    avg_calories: 1850,
    total_workout_minutes: 160,
    workout_sessions: 4,
    avg_water_liters: 2.1,
    avg_sleep_hours: 6.8,
    avg_sleep_quality: 3.5,
    habit_completion_rate: null,
    medication_adherence: null,
    latest_weight: 70,
    weight_change: -0.5,
  };
  const report: WeeklyReport = {
    current: window,
    previous: { ...window, total_workout_minutes: 100, habit_completion_rate: null },
    changes: { total_workout_minutes: 60, active_days: 0 },
    highlights: ['💪 You met the WHO guideline'],
  };

  it('shows metrics, deltas and highlights; hides empty metrics', () => {
    render(<WeeklyReportCard report={report} />);
    expect(screen.getByText('+60 vs last wk')).toBeTruthy();
    expect(screen.getByText('💪 You met the WHO guideline')).toBeTruthy();
    expect(screen.queryByText('Med adherence')).toBeNull();
    expect(screen.getByText('Weight change')).toBeTruthy();
  });
});
