import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button, EmptyState, Field, ProgressBar, Segmented, StatusPill } from '@/components/ui';

describe('UI primitives', () => {
  it('Button calls onPress and is disabled while loading', () => {
    const onPress = jest.fn();
    const { rerender } = render(<Button label="Save" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalledTimes(1);

    rerender(<Button label="Save" onPress={onPress} loading />);
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('EmptyState renders an optional action', () => {
    const onAction = jest.fn();
    render(<EmptyState title="Nothing here" message="Add something" actionLabel="Add" onAction={onAction} />);
    expect(screen.getByText('Nothing here')).toBeTruthy();
    fireEvent.press(screen.getByText('Add'));
    expect(onAction).toHaveBeenCalled();
  });

  it('Field shows error instead of hint', () => {
    const { rerender } = render(<Field label="Weight" hint="in kg" />);
    expect(screen.getByText('in kg')).toBeTruthy();
    rerender(<Field label="Weight" hint="in kg" error="Required" />);
    expect(screen.getByText('Required')).toBeTruthy();
    expect(screen.queryByText('in kg')).toBeNull();
  });

  it('ProgressBar describes progress for screen readers', () => {
    render(<ProgressBar label="Protein" value={45.4} target={120} unit="g" color="red" />);
    expect(screen.getByLabelText('Protein: 45 of 120 g')).toBeTruthy();
    expect(screen.getByText('45 / 120 g')).toBeTruthy();
  });

  it('Segmented reports selection', () => {
    const onChange = jest.fn();
    render(
      <Segmented
        options={[
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta' },
        ]}
        value="a"
        onChange={onChange}
      />
    );
    fireEvent.press(screen.getByText('Beta'));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('StatusPill falls back to the status text', () => {
    render(<StatusPill status="overdue" />);
    expect(screen.getByText('overdue')).toBeTruthy();
  });
});
