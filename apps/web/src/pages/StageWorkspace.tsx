import { Link, useParams } from 'react-router-dom';
import { EmptyState, StatusBadge, Surface } from '@precast/ui';
import { gateLabels, gates, type Gate } from '@precast/domain';
import { activeOrganization, projects } from '../fixtures/workspace';

const stageDescriptions: Record<Gate, string> = {
  G0: 'BIM intake, source validation and immutable revision acceptance arrive in M1.',
  G1: 'Versioned Design Basis authoring and independent checker approval arrive in M1.',
  G2: 'Panelization, loads, supports and neutral analytical model authoring are outside M0.',
  G3: 'M0 uses a deterministic NOT CHECKED fixture; no FEM solver is implemented.',
  G4: 'Engineering design checks require a verified backend calculation service.',
  G5: 'Traceable quantity takeoff and preliminary estimate workflow follows approved design checks.',
  G6: 'Drawing register, DXF/PDF generation and preflight are not implemented in M0.',
  G7: 'No production release can be issued from this local fixture workspace.',
};

export function StageWorkspace() {
  const { projectId, gateId } = useParams();
  const project = projects.find((item) => item.id === projectId);
  const gate = gates.find((item) => item.toLowerCase() === gateId);
  if (project === undefined || gate === undefined) return null;

  return <>
    <div className="project-heading"><div><Link to={`/org/${activeOrganization.id}/projects/${project.id}/overview`}>← Project overview</Link><p className="eyebrow">{project.code} · {gate}</p><h1>{gateLabels[gate]}</h1></div><StatusBadge tone={project.gate === gate ? 'info' : 'neutral'}>{project.gate === gate ? 'Current gate' : 'Read-only scaffold'}</StatusBadge></div>
    <Surface className="revision-context" ariaLabel="Current revision context"><div><small>SOURCE</small><strong>{project.sourceRevision}</strong><span>Immutable reference</span></div><i>→</i><div><small>DESIGN BASIS</small><strong>{project.designBasisRevision}</strong><span>Project context</span></div><i>→</i><div><small>MODEL</small><strong>{project.modelRevision}</strong><span>Version reference</span></div><i>→</i><div><small>ANALYSIS</small><strong>{project.analysisRevision}</strong><span>Version reference</span></div></Surface>
    <Surface className="stage-placeholder"><EmptyState icon={gate} title={`${gate} workspace is safely scaffolded`} detail={stageDescriptions[gate]} /><div className="stage-link-row">{gates.map((item) => <Link className={item === gate ? 'active' : ''} key={item} to={`/org/${activeOrganization.id}/projects/${project.id}/stages/${item.toLowerCase()}`}>{item}</Link>)}</div></Surface>
  </>;
}
