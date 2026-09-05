import { Link, useParams } from 'react-router-dom';
import { Button, StatusBadge, Surface } from '@precast/ui';
import { gateLabels, gates } from '@precast/domain';
import { activeOrganization, deterministicMockAnalysis, projects } from '../fixtures/workspace';
import { Icon } from '../components/Icon';

export function ProjectOverview() {
  const { projectId } = useParams();
  const project = projects.find((item) => item.id === projectId);
  if (project === undefined) return null;

  return (
    <>
      <div className="project-heading"><div><Link to={`/org/${activeOrganization.id}/projects`}>← Portfolio</Link><p className="eyebrow">{project.code} · {project.family}</p><h1>{project.name}</h1></div><div><StatusBadge tone={project.gateState === 'needsAttention' ? 'warning' : project.gateState === 'approved' ? 'success' : 'info'}>{project.gate} · {project.stage}</StatusBadge><Button type="button">Open current stage</Button></div></div>
      <Surface className="revision-context" ariaLabel="Current revision context">
        <div><small>SOURCE</small><strong>{project.sourceRevision}</strong><span>Accepted reference</span></div><i>→</i>
        <div><small>DESIGN BASIS</small><strong>{project.designBasisRevision}</strong><span>{project.gate === 'G1' ? 'Ready for review' : 'Approved & locked'}</span></div><i>→</i>
        <div><small>PRODUCT MODEL</small><strong>{project.modelRevision}</strong><span>{project.modelRevision === '—' ? 'Not created' : 'Current snapshot'}</span></div><i>→</i>
        <div><small>ANALYSIS</small><strong>{project.analysisRevision}</strong><span>{project.analysisRevision === '—' ? 'Not run' : 'Fixture result'}</span></div>
      </Surface>

      <div className="project-layout">
        <Surface className="stage-rail">
          <div><h2>Gate workflow</h2><p>G0–G7 approved baseline</p></div>
          <ol>{gates.map((gate, index) => {
            const currentIndex = gates.indexOf(project.gate);
            const state = index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'future';
            return <li key={gate} className={`stage-${state}`}><Link to={`/org/${activeOrganization.id}/projects/${project.id}/stages/${gate.toLowerCase()}`}><span>{state === 'complete' ? '✓' : gate}</span><div><strong>{gateLabels[gate]}</strong><small>{state === 'complete' ? 'Gate passed' : state === 'current' ? project.gateState.replace(/([A-Z])/g, ' $1') : 'Not started'}</small></div></Link></li>;
          })}</ol>
        </Surface>

        <div className="project-main-column">
          <div className="project-kpis"><Surface><small>CURRENT GATE</small><strong>{project.gate}</strong><span>{gateLabels[project.gate]}</span></Surface><Surface><small>CRITICAL ISSUES</small><strong>{project.issues}</strong><span>{project.issues > 0 ? 'Review required' : 'No blockers recorded'}</span></Surface><Surface><small>DUE DATE</small><strong>{project.due}</strong><span>Project milestone</span></Surface></div>
          <Surface className="current-work"><div className="section-heading"><div><p className="eyebrow">CURRENT WORK</p><h2>{project.stage}</h2></div><StatusBadge tone={project.gateState === 'needsAttention' ? 'warning' : 'info'}>{project.gateState.replace(/([A-Z])/g, ' $1')}</StatusBadge></div><p>The workspace keeps current source, Design Basis, model and analysis revisions visible before any review action.</p><div className="work-checks"><span><b>✓</b> Organization membership active</span><span><b>✓</b> Project role resolved from fixture</span><span><b>✓</b> Immutable upstream references visible</span><span className={project.issues > 0 ? 'warning-text' : ''}><b>{project.issues > 0 ? '!' : '✓'}</b> {project.issues} critical issues</span></div><Button type="button">Continue {project.stage}</Button></Surface>
          <Surface className="mock-analysis"><div><span className="mock-analysis__icon"><Icon name="cube" /></span><div><p className="eyebrow">M1 CALCULATION BOUNDARY</p><h2>Deterministic mock analysis</h2></div></div><StatusBadge tone="warning">{deterministicMockAnalysis.status}</StatusBadge><p>{deterministicMockAnalysis.disclaimer}</p><dl><div><dt>Engine</dt><dd>{deterministicMockAnalysis.engine}</dd></div><div><dt>Schema</dt><dd>{deterministicMockAnalysis.schemaVersion}</dd></div><div><dt>Input hash</dt><dd>{deterministicMockAnalysis.inputHash.slice(0, 24)}…</dd></div><div><dt>Output hash</dt><dd>{deterministicMockAnalysis.outputHash.slice(0, 24)}…</dd></div></dl></Surface>
        </div>
      </div>
    </>
  );
}
