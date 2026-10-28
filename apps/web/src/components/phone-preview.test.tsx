import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PhonePreview } from './PhonePreview';
import type { Item } from './timeline/layout';

const items = [
  {
    kind: 'EVENT',
    id: 'e',
    year: 1500,
    icon: null,
    name: 'Coronation',
    description: 'A king is crowned',
    month: null,
    day: null,
    imageUrl: null,
  },
  {
    kind: 'PERIOD',
    id: 'p',
    startYear: 1400,
    endYear: 1600,
    name: 'Golden age',
    description: 'Long description',
    color: 'blue',
  },
  {
    kind: 'PROCESS',
    id: 'q',
    startYear: 1450,
    endYear: 1550,
    name: 'Expansion',
    description: null,
    color: 'teal',
  },
] as Item[];

afterEach(() => vi.restoreAllMocks());

describe('PhonePreview', () => {
  it('moves the timeline in the four directions with its buttons', async () => {
    const scrollBy = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollBy', {
      configurable: true,
      writable: true,
      value: scrollBy,
    });
    render(<PhonePreview title="Spain" items={items} />);
    expect(screen.getByText('Spain')).toBeInTheDocument();

    const direction = (label: string) => {
      scrollBy.mockClear();
      return userEvent.click(screen.getByRole('button', { name: label })).then(() => {
        const arg = scrollBy.mock.calls[0]?.[0] as { left: number; top: number };
        return arg;
      });
    };
    expect((await direction('Move timeline left')).left).toBeLessThan(0);
    expect((await direction('Move timeline right')).left).toBeGreaterThan(0);
    expect((await direction('Move timeline up')).top).toBeLessThan(0);
    expect((await direction('Move timeline down')).top).toBeGreaterThan(0);
  });

  it('shows periods and processes by name only; the rest appears when pressed', async () => {
    render(<PhonePreview title="Spain" items={items} />);
    const period = screen.getByRole('button', { name: /Period: Golden age/ });
    expect(period).toHaveTextContent('Golden age');
    expect(period).not.toHaveTextContent('1400');
    expect(period).toHaveClass('tl-bar-period');
    expect(screen.getByRole('button', { name: /Process: Expansion/ })).toHaveClass(
      'tl-bar-process',
    );

    await userEvent.click(period);
    const details = screen.getByTestId('timeline-details');
    expect(details).toHaveTextContent('Long description');
    expect(details).toHaveTextContent('1400');
  });

  it('draws an event without icon as year + name only', () => {
    render(<PhonePreview title="Spain" items={items} />);
    const event = screen.getByRole('button', { name: /Event: Coronation/ });
    expect(event.querySelector('.tl-event-icon')).toBeNull();
    expect(event).toHaveTextContent('1500');
  });

  it('asks for content while there is nothing valid to show and disables the buttons', () => {
    render(<PhonePreview title="" items={[]} />);
    expect(screen.getByText(/Complete an event, process or period/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move timeline up' })).toBeDisabled();
  });
});
