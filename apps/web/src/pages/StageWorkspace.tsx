import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, EmptyState, StatusBadge, Surface } from '@precast/ui';
import { gateLabels, gates, type Gate, type PermissionContext } from '@precast/domain';
import { activeOrganization, projects } from '../fixtures/workspace';
import { useAuth } from '../auth/AuthContext';
import {
  cancelAnalysisRun, createDesignCheckRevision, createEstimateRevision, freezeSourceRevision, queueAnalysisRun, saveLoadModelDraft, saveProductModelDraft, submitAnalysis, submitCalculation, submitDesignBasis, submitEstimate, submitProductModel, submitSourceRevision, uploadSourceFile, validateSourceFile,
  watchAnalysisRun, watchCalculation, watchDesignBasis, watchEstimate, watchLoadModel, watchProductModel, watchSourceRevision, type AnalysisRunState, type CalculationState, type DesignBasisState, type EstimateState, type LoadModelState, type ProductModelState, type SourceRevisionState,
} from '../data/workflowRepository';
import { Can } from '../permissions/guards';
import { confirmModelLoadPaths, mergePanels, splitPanel } from '../data/panelization';

const stageDescriptions: Record<Gate, string> = {
  G0: 'BIM source intake validates file type, quarantine state, units, coordinates, levels and stable object identity before independent structural review and Project Manager freeze.',
  G1: 'The Design Basis records locked code editions, materials, durability, handling and transport assumptions before independent checker approval.',
  G2: 'Panel geometry, openings, joints, anchors, supports, scenarios and load paths are validated into an immutable deterministic model snapshot.',
  G3: 'Controlled backend orchestration validates immutable inputs and executes a versioned two-panel benchmark adapter. Engineering design remains NOT CHECKED.',
  G4: 'The versioned Design Check register binds every panel, connection and construction-stage item to approved analysis evidence. Unresolved FAIL or NOT CHECKED items block approval.',
  G5: 'Traceable model-linked quantity takeoff and versioned Price Book workflow exposes design and rate uncertainty before commercial review.',
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
  const [productModel, setProductModel] = useState<ProductModelState | null>(null);
  const [loadModel, setLoadModel] = useState<LoadModelState | null>(null);
  const [analysisRun, setAnalysisRun] = useState<AnalysisRunState | null>(null);
  const [calculation, setCalculation] = useState<CalculationState | null>(null);
  const [estimate, setEstimate] = useState<EstimateState | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [selectedPanelIds, setSelectedPanelIds] = useState<string[]>([]);
  const project = projects.find((item) => item.id === projectId);
  const gate = gates.find((item) => item.toLowerCase() === gateId);
  const membership = projectMemberships.find((item) => item.projectId === projectId);
  const activeArtifact = gate === 'G0' ? source : gate === 'G1' ? designBasis : gate === 'G3' ? analysisRun ?? loadModel : gate === 'G4' ? calculation : gate === 'G5' ? estimate ?? productModel : productModel;
  const permissionContext = useMemo<PermissionContext | null>(() => activeArtifact === null || membership === undefined ? null : {
    userId: user.uid, orgId: membership.orgId, projectId: membership.projectId, roles: membership.roles,
    capabilities: membership.capabilities, membershipStatus: membership.status,
    ...(membership.expiresAt === undefined ? {} : { expiresAt: membership.expiresAt }), artifactStatus: activeArtifact.status,
    ...(activeArtifact.createdBy === undefined ? {} : { artifactCreatedBy: activeArtifact.createdBy }), isCurrentRevision: true,
  }, [activeArtifact, membership, user.uid]);

  useEffect(() => {
    setNotice('');
    if (mode !== 'emulator' || projectId === undefined) return;
    if (gate === 'G0') return watchSourceRevision(organizationMembership.orgId, projectId, 'src-r02', setSource, showError);
    if (gate === 'G1') return watchDesignBasis(organizationMembership.orgId, projectId, 'db-r02', setDesignBasis, showError);
    if (gate === 'G2') return watchProductModel(organizationMembership.orgId, projectId, 'pm-r01', setProductModel, showError);
    if (gate === 'G3') {
      const unsubscribes = [watchProductModel(organizationMembership.orgId, projectId, 'pm-r01', setProductModel, showError), watchLoadModel(organizationMembership.orgId, projectId, 'load-r01', setLoadModel, showError), watchAnalysisRun(organizationMembership.orgId, projectId, 'an-r01', setAnalysisRun, showError)];
      return () => { for (const unsubscribe of unsubscribes) unsubscribe(); };
    }
    if (gate === 'G4') {
      const unsubscribes = [watchProductModel(organizationMembership.orgId, projectId, 'pm-r01', setProductModel, showError), watchAnalysisRun(organizationMembership.orgId, projectId, 'an-r01', setAnalysisRun, showError), watchCalculation(organizationMembership.orgId, projectId, 'calc-r01', setCalculation, showError)];
      return () => { for (const unsubscribe of unsubscribes) unsubscribe(); };
    }
    if (gate === 'G5') {
      const unsubscribes = [watchProductModel(organizationMembership.orgId, projectId, 'pm-r01', setProductModel, showError), watchCalculation(organizationMembership.orgId, projectId, 'calc-r01', setCalculation, showError), watchEstimate(organizationMembership.orgId, projectId, 'est-r01', setEstimate, showError)];
      return () => { for (const unsubscribe of unsubscribes) unsubscribe(); };
    }
  }, [gate, mode, organizationMembership.orgId, projectId]);

  function showError(reason: Error) { setError(true); setNotice(reason.message); }
  async function run(action: () => Promise<unknown>, success: string) {
    setSaving(true); setError(false); setNotice('');
    try { await action(); setNotice(success); } catch (reason) { showError(reason instanceof Error ? reason : new Error('Workflow command failed.')); }
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
  const canEditModel = productModel?.status === 'draft' && productModel.createdBy === user.uid && membership?.roles.includes('structuralEngineer') === true;
  const canEditLoadModel = loadModel?.status === 'draft' && loadModel.createdBy === user.uid && membership?.roles.includes('structuralEngineer') === true;

  function togglePanel(panelId: string) {
    setSelectedPanelIds((current) => current.includes(panelId) ? current.filter((id) => id !== panelId) : current.length >= 2 ? [...current.slice(-1), panelId] : [...current, panelId]);
  }

  function saveModel(payload: NonNullable<typeof productModel>['payload'], message: string) {
    if (productModel === null || projectId === undefined) return;
    void run(() => saveProductModelDraft({ orgId: organizationMembership.orgId, projectId, artifact: productModel, payload }), message);
  }

  function splitSelectedModel() {
    const panelId = selectedPanelIds[0];
    if (productModel === null || selectedPanelIds.length !== 1 || panelId === undefined) return;
    try { saveModel(splitPanel(productModel.payload, panelId), 'Panel split saved; confirm the new joint load path before G2 submission.'); setSelectedPanelIds([]); }
    catch (reason) { showError(reason instanceof Error ? reason : new Error('Split failed.')); }
  }

  function mergeSelectedModel() {
    const [firstId, secondId] = selectedPanelIds;
    if (productModel === null || firstId === undefined || secondId === undefined) return;
    try { saveModel(mergePanels(productModel.payload, firstId, secondId), 'Selected panels merged into a new deterministic draft.'); setSelectedPanelIds([]); }
    catch (reason) { showError(reason instanceof Error ? reason : new Error('Merge failed.')); }
  }

  function updateAnalysisSetting(key: 'meshSizeM' | 'solverTolerance' | 'maxIterations', value: number) {
    if (loadModel !== null) setLoadModel({ ...loadModel, payload: { ...loadModel.payload, [key]: value } });
  }

  function saveAnalysisSettings() {
    if (loadModel === null || projectId === undefined) return;
    void run(() => saveLoadModelDraft({ orgId: organizationMembership.orgId, projectId, artifact: loadModel, payload: loadModel.payload }), 'Analysis settings saved with a new deterministic draft hash.');
  }

  function executeBenchmark() {
    if (loadModel === null || productModel === null || projectId === undefined) return;
    void run(() => queueAnalysisRun({ orgId: organizationMembership.orgId, projectId, runId: 'an-r01', revision: 'AN-R01', loadModel, modelHash: productModel.draftHash }), 'Controlled benchmark completed; normalized verification evidence is available.');
  }

  function generateDesignChecks() {
    if (analysisRun === null || projectId === undefined) return;
    void run(() => createDesignCheckRevision({ orgId: organizationMembership.orgId, projectId, calculationId: 'calc-r01', revision: 'CALC-R01', analysis: analysisRun }), 'Versioned Design Check register generated from the approved analysis snapshot.');
  }

  function generateEstimate() {
    if (productModel === null || projectId === undefined) return;
    void run(() => createEstimateRevision({ orgId: organizationMembership.orgId, projectId, estimateId: 'est-r01', revision: 'EST-R01', modelHash: productModel.draftHash }), 'Preliminary engineering estimate generated from exact model quantities and the selected Price Book revision.');
  }

  return <>
    <div className="project-heading"><div><Link to={`/org/${activeOrganization.id}/projects/${project.id}/overview`}>← Project overview</Link><p className="eyebrow">{project.code} · {gate}</p><h1>{gateLabels[gate]}</h1></div><StatusBadge tone={project.gate === gate ? 'info' : 'neutral'}>{gate === 'G5' ? 'M6 estimating controls' : gate === 'G3' ? 'M5 G3 verification' : gate === 'G4' ? 'M5 design checks' : gate === 'G2' ? 'M3 controlled workflow' : gate === 'G0' || gate === 'G1' ? 'M2 controlled workflow' : 'Read-only scaffold'}</StatusBadge></div>
    <Surface className="revision-context" ariaLabel="Current revision context"><div><small>SOURCE</small><strong>{source?.revision ?? project.sourceRevision}</strong><span>{source?.locked ? 'Accepted & locked' : 'Controlled reference'}</span></div><i>→</i><div><small>DESIGN BASIS</small><strong>{designBasis?.revision ?? project.designBasisRevision}</strong><span>{designBasis?.locked ? 'Approved & locked' : 'Project context'}</span></div><i>→</i><div><small>MODEL</small><strong>{productModel?.revision ?? project.modelRevision}</strong><span>{productModel?.locked ? 'Approved & locked' : 'Version reference'}</span></div><i>→</i><div><small>ANALYSIS</small><strong>{analysisRun?.revision ?? project.analysisRevision}</strong><span>{analysisRun?.status ?? 'NOT CHECKED'}</span></div></Surface>
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

    {gate === 'G2' && mode === 'emulator' && productModel !== null && permissionContext !== null && <Surface className="m2-workspace m3-workspace">
      <div className="section-heading"><div><p className="eyebrow">DETERMINISTIC PRODUCT / ANALYTICAL MODEL</p><h2>{productModel.revision}</h2><p>Engineer-controlled segmentation with traceable openings, joints, lifting anchors, scenario supports and load paths. This is model preparation only—no solver result is claimed.</p></div><StatusBadge tone={tone(productModel.status)}>{productModel.status}{productModel.locked ? ' · locked' : ''}</StatusBadge></div>
      <div className="model-layout">
        <div className="panel-canvas" aria-label="Panel model preview">
          {productModel.payload.panels.map((panel, index) => <button type="button" aria-pressed={selectedPanelIds.includes(panel.id)} onClick={() => togglePanel(panel.id)} className={`panel-shape panel-shape--${index + 1} ${selectedPanelIds.includes(panel.id) ? 'panel-shape--selected' : ''}`} key={panel.id}><strong>{panel.mark}</strong><span>{panel.geometry.widthM} × {panel.geometry.heightM} × {panel.geometry.thicknessM} m</span>{panel.openings.map((opening) => <i key={opening.id} title={opening.id} />)}</button>)}
          <div className="axis-indicator"><b>Z</b><span>Y</span><i>X</i></div>
        </div>
        <dl className="model-register"><div><dt>Coordinate / units</dt><dd>{productModel.payload.coordinateSystem} · {productModel.payload.units}</dd></div><div><dt>Panels / openings</dt><dd>{productModel.payload.panels.length} / {productModel.payload.panels.reduce((sum, panel) => sum + panel.openings.length, 0)}</dd></div><div><dt>Joints / anchors</dt><dd>{productModel.payload.joints.length} / {productModel.payload.anchors.length}</dd></div><div><dt>Supports</dt><dd>{productModel.payload.supports.length} across {productModel.payload.stages.length} stages</dd></div><div><dt>Load cases / combinations</dt><dd>{productModel.payload.loadCases.length} / {productModel.payload.loadCombinations.length}</dd></div><div><dt>Total weight</dt><dd>{productModel.payload.panels.reduce((sum, panel) => sum + panel.weightKn, 0).toFixed(1)} kN</dd></div></dl>
      </div>
      <div className="validation-grid">{Object.entries(productModel.payload.validation).map(([key, value]) => <div key={key}><b>{value === 0 ? '✓' : '!'}</b><span>{key.replace(/([A-Z])/g, ' $1')}: {value}</span></div>)}<div><b>{productModel.payload.joints.every((joint) => joint.loadPathConfirmed) ? '✓' : '!'}</b><span>Joint load paths confirmed</span></div></div>
      <div className="scenario-chips">{productModel.payload.stages.map((stage) => <span key={stage}>✓ {stage}</span>)}</div>
      <div className="panel-toolbar" aria-label="Panelization tools"><strong>Engineer tools</strong><span>{selectedPanelIds.length} selected</span><Button variant="secondary" type="button" disabled={saving || !canEditModel || selectedPanelIds.length !== 1} onClick={splitSelectedModel}>Split panel</Button><Button variant="secondary" type="button" disabled={saving || !canEditModel || selectedPanelIds.length !== 2} onClick={mergeSelectedModel}>Merge panels</Button><Button variant="secondary" type="button" disabled={saving || !canEditModel || (productModel.payload.validation.missingLoadPaths === 0 && productModel.payload.joints.every((joint) => joint.loadPathConfirmed))} onClick={() => saveModel(confirmModelLoadPaths(productModel.payload), 'Connectivity and load paths confirmed by the model author.')}>Confirm load paths</Button></div>
      <div className="m2-actions"><Can action="submit" resource="productModel" context={permissionContext}><Button type="button" disabled={saving || productModel.status !== 'draft'} onClick={() => void run(() => submitProductModel({ orgId: organizationMembership.orgId, projectId: project.id, artifact: productModel, assignedTo: 'checker-narin' }), `${productModel.revision} submitted for independent G2 review.`)}>Submit Product Model for G2 review</Button></Can></div>
    </Surface>}

    {gate === 'G3' && mode === 'emulator' && loadModel !== null && productModel !== null && permissionContext !== null && <Surface className="m2-workspace m4-workspace">
      <div className="section-heading"><div><p className="eyebrow">CONTROLLED ANALYSIS ORCHESTRATION</p><h2>{loadModel.revision} · two-panel-static-v1</h2><p>Versioned neutral settings feed an immutable backend manifest. This is a verified benchmark adapter, not a general-purpose FEM solver.</p></div><StatusBadge tone={analysisRun?.status === 'completed' ? 'success' : loadModel.locked ? 'info' : 'neutral'}>{analysisRun?.status ?? loadModel.status}{loadModel.locked ? ' · frozen' : ''}</StatusBadge></div>
      <div className="analysis-settings">
        <label><span>Mesh size (m)</span><input aria-label="Mesh size (m)" type="number" min="0.02" max="5" step="0.01" disabled={!canEditLoadModel || saving} value={loadModel.payload.meshSizeM} onChange={(event) => updateAnalysisSetting('meshSizeM', Number(event.target.value))} /></label>
        <label><span>Solver tolerance</span><input aria-label="Solver tolerance" type="number" min="0.000000001" max="0.1" step="0.000001" disabled={!canEditLoadModel || saving} value={loadModel.payload.solverTolerance} onChange={(event) => updateAnalysisSetting('solverTolerance', Number(event.target.value))} /></label>
        <label><span>Maximum iterations</span><input aria-label="Maximum iterations" type="number" min="1" max="10000" step="1" disabled={!canEditLoadModel || saving} value={loadModel.payload.maxIterations} onChange={(event) => updateAnalysisSetting('maxIterations', Number(event.target.value))} /></label>
        <div><span>Element / formulation</span><strong>{loadModel.payload.elementIdealization}<br />{loadModel.payload.shellFormulation}</strong></div>
      </div>
      <div className="scenario-register">{loadModel.payload.scenarios.map((scenario) => <article key={scenario.id}><strong>{scenario.id}</strong><span>{scenario.activeSupportIds.length} supports · {scenario.activeJointIds.length} joints</span><span>{scenario.loadCaseIds.length} load cases · {scenario.combinationIds.length} combinations</span></article>)}</div>
      <div className="analysis-manifest"><div><small>PRODUCT MODEL</small><strong>{productModel.revision} · locked</strong><code>{productModel.draftHash}</code></div><div><small>LOAD MODEL</small><strong>{loadModel.revision}{loadModel.locked ? ' · frozen' : ' · editable'}</strong><code>{loadModel.draftHash}</code></div><div><small>ENGINE</small><strong>{analysisRun?.engine ?? 'precast-benchmark-adapter@1.0.0'}</strong><code>{analysisRun?.inputHash ?? 'Input hash created when queued'}</code></div></div>
      {analysisRun !== null && <>
        <div className="analysis-result-heading"><div><p className="eyebrow">NORMALIZED RESULT</p><h3>{analysisRun.revision} · {analysisRun.status}</h3></div><StatusBadge tone="warning">{analysisRun.designStatus}</StatusBadge></div>
        {analysisRun.result !== undefined && <dl className="analysis-results"><div><dt>Applied load</dt><dd>{analysisRun.result.appliedLoadKn.toFixed(1)} kN</dd></div><div><dt>Reaction sum</dt><dd>{analysisRun.result.reactionSumKn.toFixed(1)} kN</dd></div><div><dt>Equilibrium imbalance</dt><dd>{analysisRun.result.equilibriumImbalancePercent.toFixed(3)}%</dd></div><div><dt>Max displacement</dt><dd>{analysisRun.result.maxDisplacementMm.toFixed(2)} mm</dd></div><div><dt>Governing combination</dt><dd>{analysisRun.result.governingCombinationId}</dd></div><div><dt>Output hash</dt><dd className="hash">{analysisRun.outputHash}</dd></div></dl>}
        {analysisRun.verification !== undefined && <div className="verification-grid"><span className={analysisRun.verification.fatalWarnings === 0 ? 'pass' : 'fail'}>{analysisRun.verification.fatalWarnings === 0 ? 'PASS' : 'FAIL'} · fatal warnings</span><span className={analysisRun.verification.unsupportedNodes === 0 && analysisRun.verification.disconnectedElements === 0 ? 'pass' : 'fail'}>{analysisRun.verification.unsupportedNodes === 0 && analysisRun.verification.disconnectedElements === 0 ? 'PASS' : 'FAIL'} · model quality</span><span className={analysisRun.verification.equilibriumPassed ? 'pass' : 'fail'}>{analysisRun.verification.equilibriumPassed ? 'PASS' : 'FAIL'} · equilibrium</span><span className={analysisRun.verification.convergencePassed ? 'pass' : 'fail'}>{analysisRun.verification.convergencePassed ? 'PASS' : 'FAIL'} · convergence</span><span className={analysisRun.verification.independentBenchmarkMatched ? 'pass' : 'fail'}>{analysisRun.verification.independentBenchmarkMatched ? 'PASS' : 'WARNING'} · benchmark match</span><span className="not-checked">NOT CHECKED · engineering design</span></div>}
        <ol className="phase-log">{analysisRun.phaseHistory.map((item, index) => <li key={`${item.phase}-${index}`}><b>✓ {item.phase}</b><span>{item.message}</span></li>)}</ol>
      </>}
      <div className="m2-actions"><Button variant="secondary" type="button" disabled={saving || !canEditLoadModel} onClick={saveAnalysisSettings}>Save settings</Button><Button type="button" disabled={saving || !canEditLoadModel || analysisRun !== null} onClick={executeBenchmark}>Run controlled benchmark</Button>{analysisRun?.status === 'completed' && <Button type="button" disabled={saving || analysisRun.createdBy !== user.uid} onClick={() => void run(() => submitAnalysis({ orgId: organizationMembership.orgId, projectId: project.id, analysis: analysisRun, assignedTo: 'checker-narin' }), `${analysisRun.revision} submitted for independent G3 verification.`)}>Submit Analysis for G3 review</Button>}{analysisRun !== null && (analysisRun.status === 'queued' || analysisRun.status === 'running') && <Button variant="secondary" type="button" disabled={saving} onClick={() => void run(() => cancelAnalysisRun({ orgId: organizationMembership.orgId, projectId: project.id, runId: analysisRun.id, reason: 'Cancelled by authorized workspace user.' }), 'Analysis run cancelled safely.')}>Cancel run</Button>}<span className="design-boundary">G3 requires independent checker approval; design checks remain NOT CHECKED.</span></div>
    </Surface>}

    {gate === 'G4' && mode === 'emulator' && analysisRun !== null && <Surface className="m2-workspace m5-workspace">
      <div className="section-heading"><div><p className="eyebrow">VERSIONED DESIGN CHECK REGISTER</p><h2>{calculation?.revision ?? 'No calculation revision'}</h2><p>Checks are generated only from the approved G3 snapshot. M5 exposes every unimplemented engineering method rather than manufacturing a passing result.</p></div><StatusBadge tone={calculation?.payload.overallStatus === 'PASS' ? 'success' : 'warning'}>{calculation?.payload.overallStatus ?? 'NOT CHECKED'}</StatusBadge></div>
      {calculation === null ? <div className="design-check-empty"><strong>Approved analysis ready</strong><p>{analysisRun.revision} · {analysisRun.snapshotHash ?? 'approval hash pending'}</p><Button type="button" disabled={saving || analysisRun.status !== 'approved' || analysisRun.createdBy !== user.uid} onClick={generateDesignChecks}>Generate Design Check register</Button></div> : <>
        <div className="design-check-summary"><span><b>{calculation.payload.checks.filter((check) => check.status === 'PASS').length}</b> PASS</span><span><b>{calculation.payload.checks.filter((check) => check.status === 'FAIL').length}</b> FAIL</span><span><b>{calculation.payload.checks.filter((check) => check.status === 'NOT_CHECKED').length}</b> NOT CHECKED</span><code>{calculation.draftHash}</code></div>
        <div className="design-check-register">{calculation.payload.checks.map((check) => <article key={check.id}><StatusBadge tone={check.status === 'PASS' ? 'success' : check.status === 'FAIL' ? 'danger' : 'warning'}>{check.status}</StatusBadge><div><strong>{check.category.replace(/([A-Z])/g, ' $1')}</strong><span>{check.scenario} · {check.entityIds.join(', ')}</span><p>{check.message}</p></div><small>{check.codeClauseRef}</small></article>)}</div>
        <div className="blocking-list"><strong>G4 approval blocked</strong><p>{calculation.blockingConditions.length} unresolved design items require verified calculations and dispositions.</p></div>
        <div className="m2-actions"><Button type="button" disabled={saving || calculation.blockingConditions.length > 0 || calculation.status !== 'draft'} onClick={() => void run(() => submitCalculation({ orgId: organizationMembership.orgId, projectId: project.id, calculation, assignedTo: 'checker-narin' }), `${calculation.revision} submitted for G4 approval.`)}>Submit Design Checks for G4 approval</Button><span className="design-boundary">FAIL and unresolved NOT CHECKED items are server-enforced blockers.</span></div>
      </>}
    </Surface>}

    {gate === 'G5' && mode === 'emulator' && productModel !== null && permissionContext !== null && <Surface className="m2-workspace m6-workspace">
      <div className="section-heading"><div><p className="eyebrow">MODEL-LINKED BOQ / ENGINEERING ESTIMATE</p><h2>{estimate?.revision ?? 'No estimate revision'}</h2><p>Server-calculated quantities retain exact model traces. Waste, payable quantity, rates, cost layers, markup and VAT remain separate and reproducible.</p></div><StatusBadge tone={estimate?.estimateState === 'readyForReview' ? 'success' : 'warning'}>{estimate?.estimateState ?? 'not generated'}</StatusBadge></div>
      {estimate === null ? <div className="design-check-empty"><strong>Approved G3 model is ready for quantity takeoff</strong><p>{productModel.revision} · {productModel.draftHash}</p><Can action="create" resource="estimate" context={permissionContext}><Button type="button" disabled={saving} onClick={generateEstimate}>Generate engineering estimate</Button></Can></div> : <>
        <div className="estimate-meta"><span><small>MATURITY</small><b>{estimate.payload.maturity}</b></span><span><small>PRICE BOOK</small><b>{estimate.payload.priceBookRevision}</b></span><span><small>EFFECTIVE</small><b>{estimate.payload.effectiveDate}</b></span><span><small>DESIGN</small><b>{estimate.payload.designDependencyStatus}</b></span><span><small>UNCERTAINTY</small><b>±{estimate.payload.uncertaintyPercent}%</b></span></div>
        <div className="estimate-table" role="table" aria-label="Traceable BOQ lines"><div className="estimate-row estimate-row--head" role="row"><span>Cost code / trace</span><span>Raw</span><span>Waste</span><span>Payable</span><span>Rate / source</span><span>Amount</span></div>{estimate.payload.lines.map((line) => <div className="estimate-row" role="row" key={line.id}><span><strong>{line.costCode}</strong><small>{line.description}</small><code>{line.elementIds.join(', ')}</code></span><span>{line.rawQuantity.toFixed(4)} {line.unit}</span><span>{line.wastePercent}%</span><span>{line.payableQuantity.toFixed(4)} {line.unit}</span><span>{line.unitRate === null ? <b className="rate-alert">{line.rateStatus}</b> : <><b>฿{line.unitRate.toLocaleString()}</b><small>{line.rateSourceRef}</small></>}</span><span>{line.amount === null ? '—' : `฿${line.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}</span></div>)}</div>
        <div className="estimate-summary"><div><small>PRICED DIRECT COST</small><strong>฿{estimate.payload.summary.pricedDirectCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong><span>Not a complete direct-cost total</span></div><div><small>ESTIMATED COST</small><strong>{estimate.payload.summary.estimatedCost === null ? '—' : `฿${estimate.payload.summary.estimatedCost.toLocaleString()}`}</strong><span>Indirect {estimate.payload.summary.indirectPercent}% · contingency {estimate.payload.summary.contingencyPercent}%</span></div><div><small>GRAND TOTAL</small><strong>{estimate.payload.summary.grandTotal === null ? '—' : `฿${estimate.payload.summary.grandTotal.toLocaleString()}`}</strong><span>Markup {estimate.payload.summary.markupPercent}% · VAT {estimate.payload.summary.vatPercent}%</span></div></div>
        <div className="blocking-list"><strong>Review and export blocked</strong>{estimate.blockingConditions.map((condition) => <p key={condition}>{condition}</p>)}</div>
        <div className="m2-actions"><Button type="button" disabled={saving || estimate.blockingConditions.length > 0 || estimate.status !== 'draft'} onClick={() => void run(() => submitEstimate({ orgId: organizationMembership.orgId, projectId: project.id, estimate, assignedTo: 'commercial-approver' }), `${estimate.revision} submitted for independent commercial approval.`)}>Submit estimate for approval</Button><Button variant="secondary" type="button" disabled>Export XLSX / PDF / audit</Button><span className="design-boundary">Issued exports require PASS design dependency, current rates and commercial approval.</span></div>
      </>}
    </Surface>}

    <Surface className="stage-placeholder"><EmptyState icon={gate} title={gate === 'G0' || gate === 'G1' || gate === 'G2' || gate === 'G3' || gate === 'G4' || gate === 'G5' ? `${gate} evidence and controls` : `${gate} workspace is safely scaffolded`} detail={stageDescriptions[gate]} /><div className="stage-link-row">{gates.map((item) => <Link className={item === gate ? 'active' : ''} key={item} to={`/org/${activeOrganization.id}/projects/${project.id}/stages/${item.toLowerCase()}`}>{item}</Link>)}</div></Surface>
  </>;
}
