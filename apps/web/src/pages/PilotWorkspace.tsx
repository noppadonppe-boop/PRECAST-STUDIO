import { useEffect, useState } from 'react';
import type { ProjectRecord } from '@precast/domain';
import type { AccessSnapshot } from '../data/accessRepository';
import { watchProjects } from '../data/workflowRepository';
import { pilotGates, watchPilotEvidence, type PilotEvidenceSnapshot } from '../data/pilotRepository';

function ProjectEvidence({ project }: { project: ProjectRecord }) {
  const [evidence, setEvidence] = useState<PilotEvidenceSnapshot>({});
  const [error, setError] = useState('');
  useEffect(() => watchPilotEvidence(project, setEvidence, () => { setEvidence({}); setError('Evidence read failed; no approval can be inferred.'); }), [project]);
  return <section aria-label="Current gate evidence" style={{ overflowX: 'auto', overflowWrap: 'anywhere' }}>
    <h2>{project.name}</h2><p>Project ID: <code>{project.id}</code> · {project.status}</p>
    <p>Read-only current references. Missing evidence is not PASS. G3 shows only the linked approved analysis; queued/draft runs are not listed. Project gate state and artifact status are separate records.</p>
    {error ? <p role="alert">{error}</p> : <table><thead><tr><th>Gate</th><th>Gate state</th><th>Current artifact</th><th>Evidence metadata</th></tr></thead><tbody>
      {pilotGates.map((gate) => {
        const id = project[gate.field]; const item = evidence[gate.gate];
        return <tr key={gate.gate}><th>{gate.gate} · {gate.label}</th><td>{project.gateStates[gate.gate] ?? 'not recorded'}</td><td>{id ?? 'No linked evidence'}</td><td>
          {!id ? 'NOT CHECKED' : item === undefined ? 'Loading…' : item === null ? 'Linked document missing — NOT CHECKED' : <>
            <p>{item.revision} · {item.status}</p><p>Hash: <code>{item.hash}</code></p>
            {gate.gate === 'G0' && <p>Scan: {item.scanState}</p>}
            {item.blockers.map((blocker, index) => <p key={index}>Blocker: {blocker}</p>)}
            <small>Absence of listed blockers does not establish engineering approval.</small>
          </>}
        </td></tr>;
      })}
    </tbody></table>}
  </section>;
}

function ProjectList({ orgId, projectIds }: { orgId: string; projectIds: string[] }) {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const stop = watchProjects(orgId, projectIds, (value) => { if (active) setProjects(value); }, () => {
      if (active) { setProjects([]); setError('Project read failed. Check current membership.'); }
    });
    return () => { active = false; stop(); };
  }, [orgId, projectIds]);
  const project = projects.find((item) => item.id === selected) ?? projects[0];
  return <section aria-label="Pilot projects">
    {error ? <p role="alert">{error}</p> : <>
      <label>Pilot project <select value={project?.id ?? ''} onChange={(event) => setSelected(event.target.value)}>
        {!projects.length && <option value="">No readable projects yet</option>}
        {projects.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}
      </select></label>
      {project && <ProjectEvidence key={JSON.stringify(project)} project={project} />}
    </>}
  </section>;
}

export function PilotWorkspace({ access }: { access: AccessSnapshot }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const org = access.organizationMembership;
  const ids = [...new Set(access.projectMemberships.filter((member) => member.uid === org.uid && member.orgId === org.orgId && member.status === 'active' && Date.parse(member.effectiveFrom) <= now && (member.expiresAt === undefined || Date.parse(member.expiresAt) > now)).map((member) => member.projectId))].sort();
  // Memoize by membership identity, not access callback frequency. A revoked scope unmounts all prior subscriptions.
  const scope = JSON.stringify([org.orgId, org.uid, ids]);
  if (org.status !== 'active' || !ids.length) return <p role="status">No effective Pilot project membership. Contact the Pilot coordinator.</p>;
  return <StableProjectList key={scope} orgId={org.orgId} ids={ids} />;
}

function StableProjectList({ orgId, ids }: { orgId: string; ids: string[] }) {
  const [projectIds] = useState(ids);
  return <ProjectList orgId={orgId} projectIds={projectIds} />;
}
