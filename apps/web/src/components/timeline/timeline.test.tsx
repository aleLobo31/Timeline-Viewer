import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TimelineView } from './TimelineView';
import { BAR_STEP, layoutTimeline, niceStep, type Item } from './layout';

const event = (id: string, year: number, over: Partial<Item> = {}): Item =>
  ({
    kind: 'EVENT',
    id,
    year,
    icon: 'CROWN',
    name: `Event ${id}`,
    description: `Description of ${id}`,
    month: null,
    day: null,
    imageUrl: null,
    ...over,
  }) as Item;
const range = (kind: 'PERIOD' | 'PROCESS', id: string, startYear: number, endYear: number): Item =>
  ({
    kind,
    id,
    startYear,
    endYear,
    name: `${kind} ${id}`,
    description: null,
    color: 'blue',
  }) as Item;

describe('layoutTimeline', () => {
  it('stacks overlapping bars so they never overlap (identical ranges included)', () => {
    const items = [
      range('PROCESS', 'a', 1500, 1600),
      range('PROCESS', 'b', 1500, 1600),
      range('PERIOD', 'p', 1500, 1600),
    ];
    const l = layoutTimeline(items, null, 900);
    expect(l.processes.map((b) => b.top).sort()).toEqual([0, BAR_STEP]);
    expect(l.periods).toHaveLength(1);
    expect(l.processesHeight).toBe(2 * BAR_STEP);
  });

  it('puts periods above processes above the axis, events below the axis', () => {
    const l = layoutTimeline(
      [range('PERIOD', 'p', 1, 9), range('PROCESS', 'q', 1, 9), event('e', 5)],
      null,
      900,
    );
    const periodBottom = l.periodsHeight;
    expect(periodBottom).toBeGreaterThan(0);
    expect(l.axisY).toBeGreaterThan(l.periodsHeight + l.processesHeight);
    expect(l.height).toBeGreaterThan(l.axisY);
  });

  it('moves colliding event labels to another row', () => {
    const l = layoutTimeline([event('a', 1500), event('b', 1501), event('c', 1600)], null, 900);
    const offsets = new Map(l.events.map((e) => [e.item.id, e.offset]));
    expect(offsets.get('a')).not.toBe(offsets.get('b'));
    expect(offsets.get('c')).toBe(offsets.get('a'));
  });

  it('cuts to the window and clips bars at the edges (US-F1.6)', () => {
    const items = [event('in', 1530), event('out', 1580), range('PERIOD', 'p', 1500, 1540)];
    const l = layoutTimeline(items, { from: 1520, to: 1550 }, 900);
    expect(l.events.map((e) => e.item.id)).toEqual(['in']);
    expect(l.periods[0]).toMatchObject({ left: 0, clippedStart: true, clippedEnd: false });
    expect(l.ticks.every((t) => t.year >= 1520 && t.year <= 1550)).toBe(true);
  });

  it('handles single point timelines and picks readable tick steps', () => {
    expect(layoutTimeline([event('a', 1492)], null, 800).events).toHaveLength(1);
    expect(niceStep(100, 800)).toBeGreaterThanOrEqual(10);
    expect(niceStep(5, 800)).toBe(1);
  });
});

describe('TimelineView', () => {
  const items = [
    event('1', 1492, {
      icon: 'SWORDS',
      name: 'Discovery',
      description: 'Ships arrive',
      month: 10,
      day: 12,
    }),
    range('PERIOD', 'p', 1400, 1600),
    range('PROCESS', 'q', 1450, 1550),
  ];

  it('shows year, icon and name and drops down the rest of the information when selected', async () => {
    render(<TimelineView items={items} />);
    const point = screen.getByRole('button', { name: /Event: Discovery/ });
    expect(point).toHaveTextContent('1492');
    expect(point).toHaveTextContent('Discovery');
    expect(screen.queryByTestId('timeline-details')).not.toBeInTheDocument();

    await userEvent.click(point);
    const details = screen.getByTestId('timeline-details');
    expect(within(details).getByText('Ships arrive')).toBeInTheDocument();
    expect(details).toHaveTextContent('12 Oct 1492');
    expect(point).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(point);
    expect(screen.queryByTestId('timeline-details')).not.toBeInTheDocument();
  });

  it('shows details of processes and periods', async () => {
    render(<TimelineView items={items} />);
    await userEvent.click(screen.getByRole('button', { name: /Period: PERIOD p/ }));
    expect(screen.getByTestId('timeline-details')).toHaveTextContent('1400 \u2013 1600');
  });

  it('hides the selection when its element is cut out of the view', async () => {
    const { rerender } = render(<TimelineView items={items} />);
    await userEvent.click(screen.getByRole('button', { name: /Event: Discovery/ }));
    rerender(<TimelineView items={items} window={{ from: 1500, to: 1550 }} />);
    expect(screen.queryByRole('button', { name: /Event: Discovery/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId('timeline-details')).not.toBeInTheDocument();
  });
});
