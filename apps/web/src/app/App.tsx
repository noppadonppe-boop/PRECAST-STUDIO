import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { activeOrganization } from '../fixtures/workspace';
import { ApprovalInbox } from '../pages/ApprovalInbox';
import { AuditTimeline } from '../pages/AuditTimeline';
import { Forbidden } from '../pages/Forbidden';
import { Placeholder } from '../pages/Placeholder';
import { Portfolio } from '../pages/Portfolio';
import { ProjectOverview } from '../pages/ProjectOverview';
import { StudioWorkspace } from '../pages/StudioWorkspace';
import { TeamPermissions } from '../pages/TeamPermissions';
import { RequireOrganizationMembership, RequireProjectMembership } from '../permissions/guards';
import { useAuth } from '../auth/AuthContext';
import { SharedMenuPage } from '../pages/SharedMenuPage';

export function App() {
  const { mode } = useAuth();
  const shared = mode === 'shared';
  return (
    <Routes>
      <Route path="/" element={<Navigate to={`/org/${shared ? 'precast-studio' : activeOrganization.id}/projects`} replace />} />
      <Route path="/forbidden" element={<Forbidden />} />
      <Route path="/org/:orgId" element={<RequireOrganizationMembership><AppShell /></RequireOrganizationMembership>}>
        <Route path="projects" element={<Portfolio />} />
        <Route path="review" element={shared ? <SharedMenuPage category="review" title="งานรอตรวจ" /> : <ApprovalInbox />} />
        <Route path="team" element={shared ? <SharedMenuPage category="team" title="ทีมและสิทธิ์" /> : <TeamPermissions />} />
        <Route path="audit" element={shared ? <SharedMenuPage category="audit" title="ประวัติการดำเนินงาน" /> : <AuditTimeline />} />
        <Route path="libraries" element={shared ? <SharedMenuPage category="libraries" title="คลังข้อมูลวิศวกรรม" /> : <Placeholder title="Engineering libraries" detail="M5 records explicit material, joint, anchor, analysis and code-clause references; managed library authoring remains future work." />} />
        <Route path="settings" element={shared ? <SharedMenuPage category="settings" title="ตั้งค่าพื้นที่ทำงาน" /> : <Placeholder title="Organization settings" detail="This fixture does not persist organization policy changes." />} />
        <Route path="projects/:projectId/overview" element={<RequireProjectMembership><ProjectOverview /></RequireProjectMembership>} />
        <Route path="projects/:projectId/stages/:gateId" element={<RequireProjectMembership><StudioWorkspace /></RequireProjectMembership>} />
      </Route>
      <Route path="*" element={<Navigate to="/forbidden" replace />} />
    </Routes>
  );
}
