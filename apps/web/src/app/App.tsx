import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { activeOrganization } from '../fixtures/workspace';
import { ApprovalInbox } from '../pages/ApprovalInbox';
import { Forbidden } from '../pages/Forbidden';
import { Placeholder } from '../pages/Placeholder';
import { Portfolio } from '../pages/Portfolio';
import { ProjectOverview } from '../pages/ProjectOverview';
import { StageWorkspace } from '../pages/StageWorkspace';
import { TeamPermissions } from '../pages/TeamPermissions';
import { RequireOrganizationMembership, RequireProjectMembership } from '../permissions/guards';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={`/org/${activeOrganization.id}/projects`} replace />} />
      <Route path="/forbidden" element={<Forbidden />} />
      <Route path="/org/:orgId" element={<RequireOrganizationMembership><AppShell /></RequireOrganizationMembership>}>
        <Route path="projects" element={<Portfolio />} />
        <Route path="review" element={<ApprovalInbox />} />
        <Route path="team" element={<TeamPermissions />} />
        <Route path="audit" element={<Placeholder title="Audit timeline" detail="Append-only authoritative events will be connected to emulator data in M1." />} />
        <Route path="libraries" element={<Placeholder title="Engineering libraries" detail="Versioned material, load, joint and anchor libraries are outside M0 authoring scope." />} />
        <Route path="settings" element={<Placeholder title="Organization settings" detail="This fixture does not persist organization policy changes." />} />
        <Route path="projects/:projectId/overview" element={<RequireProjectMembership><ProjectOverview /></RequireProjectMembership>} />
        <Route path="projects/:projectId/stages/:gateId" element={<RequireProjectMembership><StageWorkspace /></RequireProjectMembership>} />
      </Route>
      <Route path="*" element={<Navigate to="/forbidden" replace />} />
    </Routes>
  );
}
