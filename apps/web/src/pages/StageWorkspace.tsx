import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, EmptyState, StatusBadge, Surface } from '@precast/ui';
import { gateLabels, gates, type Gate, type PermissionContext } from '@precast/domain';
import { activeOrganization, projects } from '../fixtures/workspace';
import { useAuth } from '../auth/AuthContext';
import {
  freezeSourceRevision, submitDesignBasis, submitSourceRevision, uploadSourceFile, validateSourceFile,
  watchDesignBasis, watchSourceRevision, type DesignBasisState, type SourceRevisionState,
} from '../data/workflowRepository';
import { Can } from '../permissions/guards';

const stageDescriptions: Record<Gate, string> = {
  G0: 'BIM source intake validates file type, quarantine state, units, coordinates, levels and stable object identity before independent structural review and Project Manager freeze.',
  G1: 'The Design Basis records locked code editions, materials, durability, handling and transport assumptions before independent checker approval.',
  G2: 'Panelization, loads, supports and neutral analytical model authoring continue in M3.',
  G3: 'A deterministic NOT CHECKED fixture remains; no FEM solver is implemented.',
  G4: 'Engineering design checks require a verified backend calculation service.',
  G5: 'Traceable quantity takeoff and preliminary estimate workflow follows approved design checks.',
  G6: 'Drawing register, DXF/PDF generation and preflight are not implemented yet.',
  G7: 'No production release can be issued from this local emulator workspace.',
};

function tone(status: string) {
  return status === 'accepted' || status === 'approved' ? 'success' : status === 'submitted' ? 'info' : status === 'quarantined' ? 'warning' : 'neutral';
}

export function StageWorkspace() {
  const { projectId, gateId } = useParams();
  const { mode, organizationMembership, projectMemberships, user } = useAuth();
  const [designBasis, setDesignBasis] = useState<DesignBasisState | null>(null);
  const [source, setSource] = useState<SourceRevisionState | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const project = projects.find((item) => item.id === projectId);
  const gate = gates.find((item) => item.toLowerCase() === gateId);
  const membership = projectMemberships.find((item) => item.projectId === projectId);
  const activeArtifact = gate === 'G0' ? source : designBasis;
  const permissionContext = useMemo<PermissionContext | null>(() => activeArtifact === null || membership === undefined ? null : {
    userId: user.uid, orgId: membership.orgId, projectId: membership.projectId, roles: membership.roles,
    capabilities: membership.capabilities, membershipStatus: membership.status,
    ...(membership.expiresAt === undefined ? {} : { expiresAt: membership.expiresAt }), artifactStatus: activeArtifact.status,
    artifactCreatedBy: activeArtifact.createdBy, isCurrentRevision: true,
  }, [activeArtifact, membership, user.uid]);

  useEffect(() => {
    setNotice('');
    if (mode !== 'emulator' || projectId === undefined) return;
    if (gate === 'G0') return watchSourceRevision(organizationMembership.orgId, projectId, 'src-r02', setSource, showError);
    if (gate === 'G1') return watchDesignBasis(organizationMembership.orgId, projectId, 'db-r02', setDesignBasis, showError);
  }, [gate, mode, organizationMembership.orgId, projectId]);

  function showError(reason: Error) { setError(true); setNotice(reason.message); }
  async function run(action: () => Promise<unknown>, success: string) {
    setSaving(true); setError(false); setNotice('');
    try { await action(); setNotice(success); } catch (reason) { showError(reason instanceof Error ? reason : new Error('M2 command failed.')); }
    finally { setSaving(false); }
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file === undefined || projectId === undefined) return;
    const problems = validateSourceFile(file);
    if (problems.length > 0) return showError(new Error(`Upload rejected: ${problems.join('; ')}`));
    setSaving(true); setError(false); setUploadProgress(0);
    try {
      const id = await uploadSourceFile({ orgId: organizationMembership.orgId, projectId, file, onProgress: setUploadProgress });
      setNotice(`${id} uploaded to quarantine. Scanning and IFC validation must complete before submission.`);
    } catch (reason) { showError(reason instanceof Error ? reason : new Error('Upload failed.')); }
    finally { setSaving(false); }
  }

  if (project === undefined || gate === undefined) return null;
  const validation = source?.validation;
  const isPm = membership?.roles.includes('projectManager') === true;

  return <>
    <div className="project-heading"><div><Link to={`/org/${activeOrganization.id}/projects/${project.id}/overview`}>← Project overview</Link><p className="eyebrow">{project.code} · {gate}</p><h1>{gateLabels[gate]}</h1></div><StatusBadge tone={project.gate === gate ? 'info' : 'neutral'}>{gate === 'G0' || gate === 'G1' ? 'M2 controlled workflow' : 'Read-only scaffold'}</StatusBadge></div>
    <Surface className="revision-context" ariaLabel="Current revision context"><div><small>SOURCE</small><strong>{source?.revision ?? project.sourceRevision}</strong><span>{source?.locked ? 'Accepted & locked' : 'Controlled reference'}</span></div><i>→</i><div><small>DESIGN BASIS</small><strong>{designBasis?.revision ?? project.designBasisRevision}</strong><span>{designBasis?.locked ? 'Approved & locked' : 'Project context'}</span></div><i>→</i><div><small>MODEL</small><strong>{project.modelRevision}</strong><span>Version reference</span></div><i>→</i><div><small>ANALYSIS</small><strong>{project.analysisRevision}</strong><span>Version reference</span></div></Surface>
    {notice !== '' && <div className={`toast ${error ? 'toast--error' : ''}`} role="status">{notice}</div>}

    {gate === 'G0' && mode === 'emulator' && source !== null && permissionContext !== null && <Surface className="m2-workspace">
      <div className="section-heading"><div><p className="eyebrow">CONTROLLED BIM INTAKE</p><h2>{source.revision}</h2><p>Files enter an unreadable quarantine path. The seeded reference below represents a completed clean scan and deterministic validation result.</p></div><StatusBadge tone={tone(source.status)}>{source.status}</StatusBadge></div>
      <div className="validation-grid">
        {(['unitValid', 'coordinateValid', 'levelsValid', 'objectIdentityValid'] as const).map((key) => <div key={key}><b>{validation?.[key] === true ? '✓' : '!'}</b><span>{key.replace('Valid', '').replace(/([A-Z])/g, ' $1')}</span></div>)}
        <div><b>{validation?.duplicateGlobalIds === 0 ? '✓' : '!'}</b><span>{validation?.duplicateGlobalIds ?? '—'} duplicate GlobalIds</span></div>
        <div><b>Σ</b><span>{validation?.objectCount ?? '—'} BIM objects</span></div>
      </div>
      <div className="m2-actions">
        <label className={`button button--secondary ${saving ? 'is-disabled' : ''}`}>Upload IFC / PDF<input className="visually-hidden" type="file" accept=".ifc,.pdf,application/pdf,application/x-step,application/ifc" disabled={saving} onChange={upload} /></label>
        {uploadProgress !== null && <span className="upload-progress">Upload {uploadProgress}% · quarantine enforced</span>}
        <Can action="submit" resource="sourceRevision" context={permissionContext}><Button type="button" disabled={saving || source.status !== 'draft'} onClick={() => void run(() => submitSourceRevision({ orgId: organizationMembership.orgId, projectId: project.id, artifact: source, assignedTo: 'engineer-supachai' }), `${source.revision} submitted for structural suitability review.`)}>Submit source for review</Button></Can>
        {isPm && <Button type="button" disabled={saving || source.status !== 'approved'} onClick={() => void run(() => freezeSourceRevision({ orgId: organizationMembership.orgId, projectId: project.id, artifact: source }), `${source.revision} accepted and Gate G0 frozen.`)}>Freeze Gate G0</Button>}
      </div>
    </Surface>}

    {gate === 'G1' && mode === 'emulator' && designBasis !== null && permissionContext !== null && <Surface className="m2-workspace">
      <div className="section-heading"><div><p className="eyebrow">VERSIONED DESIGN BASIS</p><h2>{designBasis.revision}</h2><p>Code editions, materials, durability, lifting and transport factors are captured in the immutable approval snapshot.</p></div><StatusBadge tone={tone(designBasis.status)}>{designBasis.status}{designBasis.locked ? ' · locked' : ''}</StatusBadge></div>
      {designBasis.payload !== undefined && <dl className="basis-grid"><div><dt>Design code</dt><dd>{designBasis.payload.designCode} · {designBasis.payload.designCodeEdition}</dd></div><div><dt>Loading code</dt><dd>{designBasis.payload.loadingCode} · {designBasis.payload.loadingCodeEdition}</dd></div><div><dt>Concrete / rebar</dt><dd>{designBasis.payload.concrete.fc28Mpa} / {designBasis.payload.reinforcement.fyMpa} MPa</dd></div><div><dt>Handling factors</dt><dd>{designBasis.payload.handling.liftingDynamicFactor} lift · {designBasis.payload.handling.transportDynamicFactor} transport</dd></div><div><dt>Durability</dt><dd>{designBasis.payload.concrete.durabilityClass}</dd></div><div><dt>Inherited from</dt><dd>{designBasis.payload.inheritedFrom}</dd></div></dl>}
      <div className="m2-actions"><Can action="submit" resource="designBasis" context={permissionContext}><Button type="button" disabled={saving || designBasis.status !== 'draft'} onClick={() => void run(() => submitDesignBasis({ orgId: organizationMembership.orgId, projectId: project.id, artifact: designBasis, assignedTo: 'checker-narin' }), `${designBasis.revision} submitted to an independent checker.`)}>Submit Design Basis for approval</Button></Can></div>
    </Surface>}

    <Surface className="stage-placeholder"><EmptyState icon={gate} title={gate === 'G0' || gate === 'G1' ? `${gate} evidence and controls` : `${gate} workspace is safely scaffolded`} detail={stageDescriptions[gate]} /><div className="stage-link-row">{gates.map((item) => <Link className={item === gate ? 'active' : ''} key={item} to={`/org/${activeOrganization.id}/projects/${project.id}/stages/${item.toLowerCase()}`}>{item}</Link>)}</div></Surface>
  </>;
}
