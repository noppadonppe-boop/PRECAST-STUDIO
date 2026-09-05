import { Link } from 'react-router-dom';
import { activeOrganization } from '../fixtures/workspace';

export function Forbidden() {
  return <main className="standalone-state"><span>403</span><h1>Project access denied</h1><p>Your organization or project membership is missing, suspended, or expired.</p><Link to={`/org/${activeOrganization.id}/projects`}>Return to permitted portfolio</Link></main>;
}

