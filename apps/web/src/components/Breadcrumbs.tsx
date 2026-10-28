import { Link } from 'react-router-dom';

export interface Crumb {
  label: string;
  /** omitted for the current page */
  to?: string;
}

/** Path of the current page that also leads back to the previous levels. */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      <ol>
        {crumbs.map((crumb) => (
          <li key={crumb.label}>
            {crumb.to ? (
              <Link to={crumb.to}>{crumb.label}</Link>
            ) : (
              <span aria-current="page">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
