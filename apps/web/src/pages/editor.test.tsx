import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderApp } from '../test-utils';
import { LibraryPage } from './LibraryPage';
import { TimelineEditorPage } from './TimelineEditorPage';

const me = {
  'GET /api/auth/me': () => ({ body: { user: { id: 'u', email: 'a@b.c', name: 'Ann' } } }),
};

afterEach(() => vi.unstubAllGlobals());

const renderEditor = (route = '/timelines/new') =>
  renderApp(
    <Routes>
      <Route path="/timelines/new" element={<TimelineEditorPage />} />
      <Route path="/timelines/:id" element={<TimelineEditorPage />} />
      <Route path="/library" element={<LibraryPage />} />
    </Routes>,
    route,
  );

const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');

describe('TimelineEditorPage - create (US-F1.1)', () => {
  it('warns and explains why when mandatory fields are missing, without saving', async () => {
    const calls = mockFetch(me);
    renderEditor();
    await userEvent.click(screen.getByRole('button', { name: 'Save timeline' }));
    const summary = await screen.findByText(/cannot be saved yet/);
    const box = summary.closest('[role=alert]') as HTMLElement;
    expect(within(box).getByText('Timeline name is required.')).toBeInTheDocument();
    expect(within(box).getByText('Description is required.')).toBeInTheDocument();
    expect(within(box).getByText(/needs at least one historical event/)).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST' && c.url === '/api/timelines')).toBe(false);
  });

  it('saves a timeline with name, description and one event', async () => {
    const calls = mockFetch({
      ...me,
      'POST /api/timelines': () => ({
        status: 201,
        body: {
          timeline: {
            id: 'new-id',
            name: 'T',
            description: 'D',
            coverImage: null,
            items: [],
            share: null,
            updatedAt: '',
          },
        },
      }),
    });
    renderEditor();
    await userEvent.type(screen.getByLabelText('Timeline name'), 'Spain');
    await userEvent.type(screen.getByLabelText('Description'), 'History of Spain');
    await userEvent.click(screen.getByRole('button', { name: '+ Add event' }));
    const card = screen.getByRole('group', { name: 'Historical event 1' });
    await userEvent.type(within(card).getByLabelText('Year'), '1492');
    await userEvent.type(within(card).getByLabelText('Event name'), 'Granada');
    await userEvent.type(within(card).getByLabelText(/Event description/), 'Reconquista ends');
    await userEvent.click(within(card).getByRole('button', { name: /Event icon/ }));
    await userEvent.click(within(card).getByRole('radio', { name: 'Crown' }));
    // the phone preview shows the event while editing
    expect(screen.getByRole('button', { name: /Event: Granada/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save timeline' }));

    const post = calls.find((c) => c.method === 'POST' && c.url === '/api/timelines');
    expect(post?.body).toMatchObject({
      name: 'Spain',
      coverImage: null,
      items: [
        { kind: 'EVENT', year: 1492, icon: 'CROWN', name: 'Granada', month: null, day: null },
      ],
    });
  });

  it('lets an event have no icon', async () => {
    const calls = mockFetch({
      ...me,
      'POST /api/timelines': () => ({ status: 400, body: { error: { code: 'X', message: 'x' } } }),
    });
    renderEditor();
    await userEvent.type(screen.getByLabelText('Timeline name'), 'Spain');
    await userEvent.type(screen.getByLabelText('Description'), 'History of Spain');
    await userEvent.click(screen.getByRole('button', { name: '+ Add event' }));
    const card = screen.getByRole('group', { name: 'Historical event 1' });
    await userEvent.type(within(card).getByLabelText('Year'), '1492');
    await userEvent.type(within(card).getByLabelText('Event name'), 'Granada');
    await userEvent.type(within(card).getByLabelText(/Event description/), 'Reconquista ends');
    await userEvent.click(screen.getByRole('button', { name: 'Save timeline' }));
    const post = calls.find((c) => c.method === 'POST' && c.url === '/api/timelines');
    expect(post?.body).toMatchObject({ items: [{ kind: 'EVENT', icon: null }] });
  });

  it('keeps the icon and color pickers collapsed and without text labels', async () => {
    mockFetch(me);
    renderEditor();
    await userEvent.click(screen.getByRole('button', { name: '+ Add event' }));
    const card = screen.getByRole('group', { name: 'Historical event 1' });
    const toggle = within(card).getByRole('button', { name: /Event icon/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(card).queryAllByRole('radio')).toHaveLength(0);
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    // "no icon" plus the five icons
    expect(within(card).getAllByRole('radio')).toHaveLength(6);
    expect(within(card).getByRole('radio', { name: 'No icon' })).toBeChecked();
    // names stay available to assistive technology, but are not visible text
    expect(within(card).getByRole('radio', { name: 'Crown' }).closest('label')).toHaveAttribute(
      'title',
      'Crown',
    );
  });

  it('limits the timeline description to 100 characters and the items to 300 words', async () => {
    mockFetch(me);
    renderEditor();
    expect(screen.getByText('0/100 characters')).toBeInTheDocument();
    const description = screen.getByLabelText('Description');
    expect(description).toHaveAttribute('maxlength', '100');
    // same kind and size of box as the name
    expect(description.tagName).toBe('INPUT');
    expect(screen.getByLabelText('Timeline name').tagName).toBe('INPUT');
    await userEvent.type(description, 'abcde');
    expect(screen.getByText('5/100 characters')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '+ Add event' }));
    expect(screen.getByText('0/300 words')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Event description'), 'one two three');
    expect(screen.getByText('3/300 words')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Event description'));
    await userEvent.paste(words(301));
    await userEvent.click(screen.getByRole('button', { name: 'Save timeline' }));
    expect(
      await screen.findAllByText(/Event description must have at most 300 words/),
    ).not.toHaveLength(0);
  });

  it('collapses the timeline data and shows a summary', async () => {
    mockFetch(me);
    renderEditor();
    await userEvent.type(screen.getByLabelText('Timeline name'), 'Spain');
    const toggle = screen.getByRole('button', { name: /Timeline data/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('Timeline name')).not.toBeInTheDocument();
    expect(toggle).toHaveTextContent('Spain');
    await userEvent.click(toggle);
    expect(screen.getByLabelText('Timeline name')).toHaveValue('Spain');
  });

  it('shows breadcrumbs back to the library and no editor or preview titles', async () => {
    mockFetch(me);
    renderEditor();
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumbs).getByRole('link', { name: 'Library' })).toHaveAttribute(
      'href',
      '/library',
    );
    expect(within(crumbs).getByRole('link', { name: 'Timelines' })).toHaveAttribute(
      'href',
      '/library?type=TIMELINE',
    );
    expect(within(crumbs).getByText('New timeline')).toHaveAttribute('aria-current', 'page');
    await userEvent.type(screen.getByLabelText('Timeline name'), 'Spain');
    expect(within(crumbs).getByText('Spain')).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('heading', { name: 'Preview' })).not.toBeInTheDocument();
    // the page keeps a heading for assistive technology only
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('sr-only');
  });

  it('lays an event out as year, day, month, icon and image buttons without previewing the image', async () => {
    mockFetch(me);
    renderEditor();
    await userEvent.click(screen.getByRole('button', { name: '+ Add event' }));
    const card = screen.getByRole('group', { name: 'Historical event 1' });
    const labels = Array.from(
      card.querySelectorAll('.item-grid-event .field > label, .item-grid-event .field > .label'),
    ).map((el) => el.textContent?.replace(/\s*\(optional\)/, '').trim());
    expect(labels).toEqual(['Year', 'Day', 'Month', 'Event icon', 'Image']);
    expect(within(card).getByRole('button', { name: 'Event icon: none' })).toBeInTheDocument();
    expect(within(card).getByLabelText('Upload event image')).toBeInTheDocument();
    expect(card.querySelector('img')).toBeNull();
  });

  it('puts the color picker right beside the end year', async () => {
    mockFetch(me);
    renderEditor();
    await userEvent.click(screen.getByRole('button', { name: '+ Add period' }));
    const card = screen.getByRole('group', { name: 'Historical period 1' });
    const cells = Array.from(card.querySelectorAll('.item-grid-range > *'));
    expect(cells).toHaveLength(3);
    expect(within(cells[1] as HTMLElement).getByLabelText('End year')).toBeInTheDocument();
    expect(
      within(cells[2] as HTMLElement).getByRole('button', { name: /Color/ }),
    ).toBeInTheDocument();
  });

  it('asks for day and month when two events share a year (US-F1.2)', async () => {
    mockFetch(me);
    renderEditor();
    await userEvent.click(screen.getByRole('button', { name: '+ Add event' }));
    await userEvent.type(screen.getByLabelText('Year'), '1500');
    expect(screen.queryByText(/another event shares this year/i)).not.toBeInTheDocument();
    // a second event opens its own form and collapses the first one
    await userEvent.click(screen.getByRole('button', { name: '+ Add event' }));
    await userEvent.type(screen.getByLabelText('Year'), '1500');
    expect(screen.getAllByText(/Required: another event shares this year/i)).toHaveLength(1);
    const list = screen.getByRole('list', { name: 'Historical items' });
    expect(within(list).getAllByRole('button', { expanded: true })).toHaveLength(1);
  });

  it('lets the guide pick one of 16 colors for processes and periods', async () => {
    mockFetch(me);
    renderEditor();
    await userEvent.click(screen.getByRole('button', { name: '+ Add process' }));
    const card = screen.getByRole('group', { name: 'Historical process 1' });
    await userEvent.click(within(card).getByRole('button', { name: /Color/ }));
    expect(within(card).getAllByRole('radio')).toHaveLength(16);
    await userEvent.click(within(card).getByRole('radio', { name: 'Teal' }));
    expect(within(card).getByRole('radio', { name: 'Teal' })).toBeChecked();
  });
});

describe('TimelineEditorPage - edit (US-F1.10)', () => {
  const timeline = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Rome',
    description: 'Empire',
    coverImage: '/uploads/cover-1.webp',
    share: null,
    updatedAt: '',
    items: [
      {
        kind: 'PERIOD',
        id: 'p1',
        startYear: -27,
        endYear: 476,
        name: 'Empire',
        description: null,
        color: 'blue',
      },
      {
        kind: 'EVENT',
        id: 'e1',
        year: 476,
        month: null,
        day: null,
        icon: 'CROWN',
        name: 'Fall',
        description: 'Falls',
        imageUrl: null,
      },
      {
        kind: 'EVENT',
        id: 'e0',
        year: 1453,
        month: null,
        day: null,
        icon: null,
        name: 'Constantinople',
        description: 'Falls too',
        imageUrl: null,
      },
    ],
  };

  const handlers = () => ({
    ...me,
    [`GET /api/timelines/${timeline.id}`]: () => ({ body: { timeline } }),
    [`PUT /api/timelines/${timeline.id}`]: () => ({ body: { timeline } }),
    [`DELETE /api/timelines/${timeline.id}`]: () => ({ status: 204, body: undefined }),
    'GET /api/materials': () => ({ body: { materials: [] } }),
  });

  it('lists the items as name + date rows, most recent first, and opens one inline', async () => {
    mockFetch(handlers());
    renderEditor(`/timelines/${timeline.id}`);
    expect(await screen.findByDisplayValue('Rome')).toBeInTheDocument();

    const list = screen.getByRole('list', { name: 'Historical items' });
    const rows = within(list).getAllByRole('button', { expanded: false });
    expect(rows.map((r) => r.textContent)).toEqual([
      'EventConstantinople1453',
      'EventFall476',
      'PeriodEmpire27 BC \u2013 476',
    ]);
    // forms are only rendered for the open row
    expect(screen.queryByRole('group', { name: /Historical/ })).not.toBeInTheDocument();
    await userEvent.click(rows[1]!);
    expect(screen.getByDisplayValue('Fall')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Constantinople')).not.toBeInTheDocument();
  });

  it('keeps the open item in place while its year is edited', async () => {
    mockFetch(handlers());
    renderEditor(`/timelines/${timeline.id}`);
    await screen.findByDisplayValue('Rome');
    const list = screen.getByRole('list', { name: 'Historical items' });
    await userEvent.click(within(list).getByRole('button', { name: /Fall/ }));
    const year = screen.getByLabelText('Year');
    await userEvent.clear(year);
    await userEvent.type(year, '2000');
    const names = within(list)
      .getAllByRole('button', { expanded: false })
      .map((r) => r.textContent);
    // collapsed rows keep their order; the edited one will move when it is closed
    expect(names[0]).toContain('Constantinople');
    await userEvent.click(within(list).getByRole('button', { expanded: true }));
    expect(within(list).getAllByRole('button')[0]).toHaveTextContent('Fall');
  });

  it('loads, removes an item, saves with PUT and then deletes the whole timeline', async () => {
    const calls = mockFetch(handlers());
    renderEditor(`/timelines/${timeline.id}`);
    expect(await screen.findByDisplayValue('Rome')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^Event Fall/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Remove Historical event 2' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save timeline' }));
    expect(await screen.findByText('Timeline saved.')).toBeInTheDocument();
    const put = calls.find((c) => c.method === 'PUT');
    expect((put?.body as { items: unknown[] }).items).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: 'Delete timeline' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, delete timeline' }));
    expect(await screen.findByRole('heading', { name: 'My library' })).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'DELETE')).toBe(true);
  });

  it('shows the cover as a symbol only and lets the guide remove it', async () => {
    const calls = mockFetch(handlers());
    renderEditor(`/timelines/${timeline.id}`);
    await screen.findByDisplayValue('Rome');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Upload cover image')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove cover image' }));
    expect(screen.queryByRole('button', { name: 'Remove cover image' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save timeline' }));
    await screen.findByText('Timeline saved.');
    expect(calls.find((c) => c.method === 'PUT')?.body).toMatchObject({ coverImage: null });
  });

  it('tells the guide when the timeline is not theirs', async () => {
    mockFetch({
      ...me,
      'GET /api/timelines/22222222-2222-2222-2222-222222222222': () => ({
        status: 404,
        body: { error: { code: 'NOT_FOUND', message: 'Timeline not found.' } },
      }),
    });
    renderEditor('/timelines/22222222-2222-2222-2222-222222222222');
    expect(await screen.findByText(/not created by you/)).toBeInTheDocument();
  });
});

describe('LibraryPage (US-F1.9)', () => {
  const materials = [
    {
      id: 'a',
      type: 'TIMELINE',
      name: 'Rome',
      description: '',
      coverImage: null,
      shared: false,
      updatedAt: '',
    },
    {
      id: 'b',
      type: 'TIMELINE',
      name: 'Greece',
      description: '',
      coverImage: '/uploads/greece.webp',
      shared: false,
      updatedAt: '',
    },
  ];

  it('shows boxes with name, the + box and the type filter', async () => {
    const calls = mockFetch({
      ...me,
      'GET /api/materials': () => ({ body: { materials } }),
      'GET /api/materials?type=MAP': () => ({ body: { materials: [] } }),
    });
    renderApp(<LibraryPage />);
    expect(await screen.findByRole('article', { name: 'Rome' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create new material' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Maps' }));
    expect(await screen.findByText(/no maps yet/i)).toBeInTheDocument();
    expect(calls.some((c) => c.url === '/api/materials?type=MAP')).toBe(true);
  });

  it('shows the explicit cover and a blank box when there is none', async () => {
    mockFetch({ ...me, 'GET /api/materials': () => ({ body: { materials } }) });
    renderApp(<LibraryPage />);
    const rome = await screen.findByRole('article', { name: 'Rome' });
    const greece = screen.getByRole('article', { name: 'Greece' });
    expect(rome.querySelector('.cover')?.children).toHaveLength(0);
    expect(rome.querySelector('.cover')).toHaveTextContent('');
    expect(greece.querySelector('.cover img')).toHaveAttribute('src', '/uploads/greece.webp');
  });

  it('offers the material types after clicking +', async () => {
    mockFetch({ ...me, 'GET /api/materials': () => ({ body: { materials: [] } }) });
    renderApp(<LibraryPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Create new material' }));
    expect(screen.getByRole('link', { name: 'Timeline' })).toHaveAttribute(
      'href',
      '/timelines/new',
    );
  });
});
