import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Background,
  BackgroundVariant,
  ViewportPortal,
  Controls,
  ControlButton,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
  type CoordinateExtent
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Alert, Button, Card, Dropdown, Form, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { getPlanGraph } from '../api/planGraphAdapter';
import { studyPlansApi, type ProgressStatus, type StudyPlan } from '../api/studyPlans';
import type { GraphData, SubjectStatus } from '../types';
import { useCareerSelection } from '../context/CareerContext';
import { yearLabel } from '../utils/subjects';
import { statusColor, statusLabel, resolveNodeStatus } from '../utils/status';
import { instituteColor } from '../utils/instituteColors';
import { getDirectSuccessorCodes, HIGHLIGHT_COLOR } from '../utils/graphHighlight';
import { getStudyPath } from '../utils/studyPaths';
import SubjectStatusAction from '../components/SubjectStatusAction';
import SubjectStatusIcon from '../components/SubjectStatusIcon';
import AcademicEdge from '../components/AcademicEdge';
import { useAcademicEdgeLayout } from '../hooks/useAcademicEdgeLayout';
import type { AcademicLayout } from '../utils/academicEdgeLayout';
import '../components/AcademicMap.css';

interface PlanNodeData {
  onAdvance?: (code: string, backwards?: boolean) => void;
  progressSaving?: boolean;
  code: string;
  name: string;
  year: number | null;
  cuatrimestre?: number | null;
  duration?: string | null;
  status: SubjectStatus;
  available: boolean;
  critical: boolean;
  optimal: boolean;
  highlightedNext: boolean;
  newlyUnlocked?: boolean;
  selectedSubject: boolean;
  credits: number;
}

function withOptimisticSubjectStatus(graph: GraphData, code: string, status: SubjectStatus): GraphData {
  const previous = graph.nodes.find(node => node.code === code);
  if (!previous || previous.status === status) return graph;
  const approvedDelta = Number(status === 'Aprobada') - Number(previous.status === 'Aprobada');
  const inProgressDelta = Number(status === 'Cursando') - Number(previous.status === 'Cursando');
  const regularDelta = Number(status === 'Regular') - Number(previous.status === 'Regular');
  const availableDelta = Number(status === 'Disponible') - Number(previous.status === 'Disponible');
  const availableNow = new Set(graph.availableNow);
  if (status === 'Disponible') availableNow.add(code);
  else availableNow.delete(code);
  return {
    ...graph,
    nodes: graph.nodes.map(node => node.code === code ? { ...node, status } : node),
    availableNow: [...availableNow],
    stats: {
      ...graph.stats,
      aprobadas: graph.stats.aprobadas + approvedDelta,
      creditsAprobados: graph.stats.creditsAprobados + approvedDelta * previous.credits,
      enCurso: graph.stats.enCurso + inProgressDelta,
      regulares: graph.stats.regulares + regularDelta,
      disponibles: graph.stats.disponibles + availableDelta,
    },
  };
}

const BORDER_WIDTH = 4;
const DIMMED_OPACITY = 0.32;
// Los valores de color se editan en styles/academicMapPalette.css.
const OPTIMAL_NODE_BACKGROUND = 'var(--map-path-bg)';
const OPTIMAL_NODE_BORDER = 'var(--map-path-border)';
const IN_PROGRESS_COLOR = 'var(--map-in-progress-accent)';
const UNLOCK_COLOR = 'var(--map-unlock-color)';
const UNLOCK_HIGHLIGHT_MS = 5000;
const GRAPH_BACKGROUND = {
  color: 'var(--map-canvas-bg)',
  dotsColor: 'var(--map-canvas-dot)',
  dotsGap: 24,
  dotsSize: 1.4,
};
// Configuración de las flechas
const EDGE_COLORS = {
  normal: 'var(--map-edge-normal)',
  critical: 'var(--map-edge-critical)',
  optimal: 'var(--map-edge-optimal)',
};

const STATUS_NODE_BORDER_COLORS: Record<SubjectStatus, string> = {
  Aprobada: 'var(--map-status-approved-border)',
  Regular: 'var(--map-status-regular-border)',
  Cursando: 'var(--map-status-in-progress-border)',
  Disponible: 'var(--map-status-available-border)',
  Bloqueada: 'var(--map-status-locked-border)',
};

const EDGE_WIDTH = {
  normal: 1.25,
  approvedToProgress: 4,
  critical: 3,
  optimal: 3,
};

const ARROW_SIZE = {
  width: 40,
  height: 40,
};
function nodeBorder(
  d: Pick<PlanNodeData, 'optimal' | 'critical' | 'available' | 'status' | 'highlightedNext' | 'newlyUnlocked'>,
  selected = false
): string {
  const width = `${BORDER_WIDTH}px solid`;

  if (d.optimal || d.critical) return `${width} ${OPTIMAL_NODE_BORDER}`;
  if (selected && d.status !== 'Aprobada') return `${width} var(--map-selection-border)`;
  if (d.newlyUnlocked) return `${width} ${UNLOCK_COLOR}`;
  if (d.highlightedNext) return `${width} ${HIGHLIGHT_COLOR}`;
  if (d.status === 'Aprobada' || d.status === 'Regular' || d.status === 'Cursando') return `${width} ${STATUS_NODE_BORDER_COLORS[d.status]}`;
  if (d.available) return `${width} ${STATUS_NODE_BORDER_COLORS.Disponible}`;

  return `${width} ${STATUS_NODE_BORDER_COLORS.Bloqueada}`;
}

function StatusBadges({ d }: { d: Pick<PlanNodeData, 'optimal' | 'critical'> }) {
  return (
    <>
      {d.optimal && <span className="badge" style={{ fontSize: 9, background: EDGE_COLORS.optimal, color: 'var(--map-badge-optimal-text)' }}>óptima</span>}
      {d.critical && <span className="badge" style={{ fontSize: 9, background: 'var(--map-badge-critical-bg)', color: 'var(--map-badge-critical-text)' }}>crítico</span>}
    </>
  );
}

function toPlanNodeData(
  n: { code: string; name: string; year: number | null; cuatrimestre: number | null; duration?: string | null; status: PlanNodeData['status']; credits: number },
  availableSet: Set<string>,
  criticalSet: Set<string>,
  fastSet: Set<string>,
): PlanNodeData {
  const status = resolveNodeStatus(n.status, availableSet.has(n.code));
  return {
    code: n.code,
    name: n.name,
    year: n.year,
    cuatrimestre: n.cuatrimestre,
    duration: n.duration ?? null,
    status,
    available: status === 'Disponible',
    critical: criticalSet.has(n.code),
    optimal: fastSet.has(n.code),
    highlightedNext: false,
    selectedSubject: false,
    credits: n.credits,
  };
}





function PlanNode({ data }: NodeProps<Node<Record<string, unknown>>>) {
  const d = data as unknown as PlanNodeData;
  const pathColor = d.optimal ? EDGE_COLORS.optimal : d.critical ? EDGE_COLORS.critical : undefined;
  const color = d.optimal || d.critical ? OPTIMAL_NODE_BACKGROUND : pathColor ?? (d.highlightedNext ? 'var(--map-next-bg)' : statusColor(d.status));
  const border = nodeBorder(d, d.selectedSubject);

  return (
    <div
      className={`plan-node${!pathColor && d.status === 'Cursando' ? ' plan-node--in-progress' : ''}${d.highlightedNext || d.newlyUnlocked ? ' plan-node--highlighted-next' : ''}`}
      style={{
        ...((d.newlyUnlocked || d.highlightedNext) ? { '--plan-highlight-color': d.newlyUnlocked ? UNLOCK_COLOR : HIGHLIGHT_COLOR } : {}),
        background: color,
        color: pathColor ? 'var(--map-path-text)' : 'var(--map-node-text)',
        outline: undefined,
        outlineOffset: 3,
        borderRadius: 12,

        width: 220,
        height: 'auto',
        minHeight: 90,

        boxSizing: 'border-box',
        border,

        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        textAlign: 'left',
        gap: 10,
      }}
    >
      <SubjectStatusAction
        status={d.status}
        name={d.name}
        onAdvance={d.onAdvance ? () => d.onAdvance?.(d.code) : undefined}
        onRevert={d.onAdvance ? () => d.onAdvance?.(d.code, true) : undefined}
        disabled={d.progressSaving}
        highlightColor={d.selectedSubject && d.status !== 'Aprobada' ? 'var(--map-selection-icon)' : d.newlyUnlocked ? UNLOCK_COLOR : d.highlightedNext ? HIGHLIGHT_COLOR : undefined}
      />
      <Handle
        type="target"
        position={Position.Left}
        style={{ opacity: 0 }}
      />

      {/* Nombre de la materia */}
      <div
        style={{
          fontWeight: 700,
          fontSize: 15,
          lineHeight: 1.4,
          width: '100%',
          overflowWrap: 'break-word',
          paddingRight: 16,
        }}
      >
        {d.name}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{ opacity: 0 }}
      />
    </div>
  );
}




function YearLabel({ data }: NodeProps<Node<Record<string, unknown>>>) {
  const { label, width, isYear, subjectCount } = data as { label: string; width: number; isYear: boolean; subjectCount?: number };
  return (
    <div
      style={{
        width,
        fontWeight: isYear ? 700 : 600,
        fontSize: 16,
        color: 'var(--map-year-label)',
        whiteSpace: 'nowrap',
        textAlign: isYear ? 'center' : 'left',
        paddingBottom: isYear ? 8 : 0,
        borderBottom: isYear ? '1px solid var(--map-year-label)' : undefined,
      }}
    >
      {label}
      {!isYear && <div className="plan-semester-count">{subjectCount} {subjectCount === 1 ? 'materia' : 'materias'}</div>}
    </div>
  );
}

const nodeTypes = { plan: PlanNode, yearLabel: YearLabel };
const edgeTypes = { academic: AcademicEdge };
const EMPTY_EDGES: GraphData['edges'] = [];

function LayoutViewport({ layout }: { layout: AcademicLayout | undefined }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    if (!layout) return;
    const frame = requestAnimationFrame(() => { void fitView({ padding: 0.2 }); });
    return () => cancelAnimationFrame(frame);
  }, [layout, fitView]);
  return null;
}

// Separación visual del grafo: dos columnas de cuatrimestres dentro de cada año.
const GRAPH_SPACING = {
  nodeWidth: 220,
  columnGap: 90,
  yearGap: 140,
  rowGap: 152,
};

interface DetailProps {
  graph: GraphData;
  selectedNode: GraphData['nodes'][number] | null;
  requires: GraphData['nodes'][number][];
  successors: GraphData['nodes'][number][];
  progressSaving: boolean;
  onSelect: (code: string) => void;
  onSetStatus: (code: string, status: ProgressStatus) => void;
  onSaveGrade: (code: string, grade: number | null) => Promise<void>;
  onClose: () => void;
}

const DETAIL_STATUS_OPTIONS: { status: ProgressStatus; label: string; displayStatus: SubjectStatus }[] = [
  { status: 'PENDIENTE', label: 'Disponible', displayStatus: 'Disponible' },
  { status: 'CURSANDO', label: 'Cursando', displayStatus: 'Cursando' },
  { status: 'REGULARIZADA', label: 'Regularizada', displayStatus: 'Regular' },
  { status: 'APROBADA', label: 'Aprobada', displayStatus: 'Aprobada' },
];

function DetailPanel({ selectedNode, requires, successors, progressSaving, onSelect, onSetStatus, onSaveGrade, onClose }: DetailProps) {
  const [gradeValue, setGradeValue] = useState(selectedNode?.grade == null ? '' : String(selectedNode.grade));
  const [gradeSaving, setGradeSaving] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);

  useEffect(() => {
    setGradeValue(selectedNode?.grade == null ? '' : String(selectedNode.grade));
    setGradeError(null);
  }, [selectedNode?.code, selectedNode?.grade, selectedNode?.status]);

  const saveGrade = async () => {
    if (!selectedNode || gradeSaving) return;
    const input = gradeValue.trim();
    const grade = input === '' ? null : Number(input);
    if (grade !== null && (!Number.isInteger(grade) || grade < 1 || grade > 10)) {
      setGradeError('La nota debe ser un número entero entre 1 y 10.');
      return;
    }
    if (grade === (selectedNode.grade ?? null)) return;

    setGradeSaving(true);
    setGradeError(null);
    try {
      await onSaveGrade(selectedNode.code, grade);
    } catch (error) {
      setGradeError(error instanceof Error ? error.message : 'No se pudo guardar la nota.');
    } finally {
      setGradeSaving(false);
    }
  };

  const renderSubjectRows = (subjects: GraphData['nodes']): ReactNode => (
    subjects.length === 0
      ? <div className="plan-detail__empty">(ninguna)</div>
      : subjects.map((subject) => (
        <button
          type="button"
          className={`plan-detail__item${subject.status === 'Aprobada' ? ' plan-detail__item--approved' : ''}`}
          key={subject.code}
          onClick={() => onSelect(subject.code)}
          aria-label={`Ver detalle de ${subject.name}`}
        >
          <SubjectStatusIcon status={subject.status} showTooltip={false} className="plan-detail__status-icon" />
          <span>{subject.name}</span>
        </button>
      ))
  );

  return (
    <div className="plan-detail">
      <Card className="plan-detail__card">
        <Card.Header className="plan-detail__header">
          <span className="plan-detail__title">{selectedNode?.name}</span>
          <Button variant="link" size="sm" className="plan-detail__close" onClick={onClose} aria-label="Cerrar detalle">×</Button>
        </Card.Header>
        <Card.Body className="plan-detail__body">
          {!selectedNode && <p className="text-muted mb-0">Tocá una materia para ver sus correlatividades.</p>}
          {selectedNode && (
            <>
              <div className="plan-detail__status-wrap">
                {selectedNode.status === 'Bloqueada' ? (
                  <div className="plan-detail__status" style={{ color: STATUS_NODE_BORDER_COLORS[selectedNode.status] }}>
                    <SubjectStatusIcon status={selectedNode.status} showTooltip={false} className="plan-detail__status-icon" />
                    {statusLabel(selectedNode.status)}
                  </div>
                ) : (
                  <Dropdown>
                    <Dropdown.Toggle
                      variant="link"
                      id="plan-detail-status-toggle"
                      className="plan-detail__status plan-detail__status-toggle"
                      style={{ color: STATUS_NODE_BORDER_COLORS[selectedNode.status] }}
                      disabled={progressSaving}
                      aria-label={`Cambiar estado de ${selectedNode.name}`}
                    >
                      <SubjectStatusIcon status={selectedNode.status} showTooltip={false} className="plan-detail__status-icon" />
                      {statusLabel(selectedNode.status)}
                    </Dropdown.Toggle>
                    <Dropdown.Menu className="plan-detail__status-menu">
                      {DETAIL_STATUS_OPTIONS
                        .filter(option => option.displayStatus !== selectedNode.status)
                        .map(option => (
                          <Dropdown.Item
                            key={option.status}
                            disabled={progressSaving}
                            className="plan-detail__status-option"
                            onClick={() => onSetStatus(selectedNode.code, option.status)}
                          >
                            <SubjectStatusIcon status={option.displayStatus} showTooltip={false} className="plan-detail__status-icon" />
                            {option.label}
                          </Dropdown.Item>
                        ))}
                    </Dropdown.Menu>
                  </Dropdown>
                )}
                {['Aprobada', 'Regular'].includes(selectedNode.status) && (
                  <>
                    <span className="plan-detail__grade-separator" aria-hidden="true" />
                    <div className={`plan-detail__grade plan-detail__grade--${selectedNode.status === 'Aprobada' ? 'approved' : 'regular'}`}>
                      <label className="plan-detail__grade-label" htmlFor="plan-detail-grade-input">Nota final</label>
                      <Form.Control
                        id="plan-detail-grade-input"
                        className="plan-detail__grade-input"
                        type="number"
                        min="1"
                        max="10"
                        step="1"
                        inputMode="decimal"
                        aria-label={`Nota final de ${selectedNode.name}`}
                        value={gradeValue}
                        disabled={gradeSaving || progressSaving}
                        onChange={event => { setGradeValue(event.target.value); setGradeError(null); }}
                        onBlur={() => { void saveGrade(); }}
                        onKeyDown={event => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            event.currentTarget.blur();
                          }
                        }}
                      />
                    </div>
                    {gradeSaving && <span className="plan-detail__grade-message text-muted" role="status">Guardando…</span>}
                    {gradeError && <span className="plan-detail__grade-message text-danger" role="alert">{gradeError}</span>}
                  </>
                )}
              </div>

              <section className="plan-detail__section">
                <h3 className="plan-detail__section-title">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2 9 10-5 10 5-10 5L2 9Z" /><path d="M6 11v5c3.5 2.5 8.5 2.5 12 0v-5M22 9v6" /></svg>
                  Requisitos
                </h3>
                <div className="plan-detail__items">{renderSubjectRows(requires)}</div>
              </section>

              <section className="plan-detail__section">
                <h3 className="plan-detail__section-title">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18V7h15" /><path d="m14 2 5 5-5 5" /></svg>
                  Desbloquea
                </h3>
                <div className="plan-detail__items">{renderSubjectRows(successors)}</div>
              </section>

            </>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

export default function PlanGraph({ initialView = 'grafo' }: { initialView?: 'grafo' | 'tablero' }) {
  const graphBackground = GRAPH_BACKGROUND;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { careerId: selectedCareerId, setCareerId: setSelectedCareerId } = useCareerSelection();
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [enrollments, setEnrollments] = useState<string[]>([]);
  const [tab, setTab] = useState<'lic' | 'tec'>('lic');
  const [interCodes, setInterCodes] = useState<Set<string> | null>(null);

  // Subgrafo de la vista: Licenciatura completa o solo tecnicatura.
  // Con set vacío se muestra vacío (aviso), nunca la Licenciatura.
  const displayGraph = useMemo(() => {
    if (!graph || tab === 'lic' || !interCodes) return graph;
    const nodes = graph.nodes.filter((n) => interCodes.has(n.code));
    const inSet = new Set(nodes.map((n) => n.code));
    const edges = graph.edges.filter((e) => inSet.has(e.source) && inSet.has(e.target));
    const availableNow = (graph.availableNow ?? []).filter((c) => inSet.has(c));
    const aprobadas = nodes.filter((n) => n.status === 'Aprobada');
    const creditsTotal = nodes.reduce((a, n) => a + (n.credits ?? 0), 0);
    const creditsAprobados = aprobadas.reduce((a, n) => a + (n.credits ?? 0), 0);
    return {
      ...graph,
      nodes,
      edges,
      availableNow,
      criticalPath: (graph.criticalPath ?? []).filter((c) => inSet.has(c)),
      topologicalOrder: (graph.topologicalOrder ?? []).filter((c) => inSet.has(c)),
      stats: {
        ...graph.stats,
        total: nodes.length,
        aprobadas: aprobadas.length,
        disponibles: availableNow.length,
        bloqueadas: nodes.filter((n) => n.status === 'Bloqueada').length,
        enCurso: nodes.filter((n) => n.status === 'Cursando').length,
        regulares: nodes.filter((n) => n.status === 'Regular').length,
        creditsTotal,
        creditsAprobados,
      },
    };
  }, [graph, tab, interCodes]);
  const view = initialView;
  const [pinnedCode, setPinnedCode] = useState<string | null>(null);
  const [pathMode, setPathMode] = useState<'critical' | 'optimal' | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const selectedPlan = useMemo(() => plans.find((p) => p._id === id) ?? null, [plans, id]);
  const [progressSaving, setProgressSaving] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [unlockHighlight, setUnlockHighlight] = useState<{ source: string; codes: Set<string> } | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  useEffect(() => {
    const syncFullscreenState = () => {
      setIsMapFullscreen(document.fullscreenElement === mapContainerRef.current);
    };
    document.addEventListener('fullscreenchange', syncFullscreenState);
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, []);
  const toggleMapFullscreen = useCallback(async () => {
    const mapContainer = mapContainerRef.current;
    if (!mapContainer) return;
    try {
      if (document.fullscreenElement === mapContainer) await document.exitFullscreen();
      else await mapContainer.requestFullscreen();
    } catch (error) {
      console.error('No se pudo cambiar el modo de pantalla completa del mapa.', error);
    }
  }, []);
  useEffect(() => {
    if (!unlockHighlight) return;
    const timer = window.setTimeout(() => setUnlockHighlight(null), UNLOCK_HIGHLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [unlockHighlight]);
  const newlyUnlockedCodes = useMemo(() => new Set(
    (graph?.nodes ?? []).filter(node => node.status === 'Disponible' && unlockHighlight?.codes.has(node.code)).map(node => node.code),
  ), [graph, unlockHighlight]);
  const progressOperation = useRef<symbol | null>(null);
  useEffect(() => {
    progressOperation.current = null;
    setProgressSaving(false);
    setProgressError(null);
    setUnlockHighlight(null);
    setPathMode(null);
    setPinnedCode(null);
    return () => { progressOperation.current = null; };
  }, [id]);

  const advanceSubject = useCallback(async (code: string, backwards = false, requestedStatus?: ProgressStatus) => {
    const subject = graph?.nodes.find(node => node.code === code);
    const status: ProgressStatus | null = requestedStatus ?? (backwards
      ? subject?.status === 'Aprobada' ? 'CURSANDO' : subject?.status === 'Cursando' ? 'PENDIENTE' : null
      : subject?.status === 'Disponible' ? 'CURSANDO' : subject?.status === 'Cursando' ? 'APROBADA' : null);
    if (!status || !subject?.planSubjectId || !selectedPlan || progressOperation.current) return;
    if (requestedStatus && DETAIL_STATUS_OPTIONS.some(option => option.status === requestedStatus && option.displayStatus === subject.status)) return;
    const operation = Symbol();
    progressOperation.current = operation;
    setProgressSaving(true);
    setProgressError(null);
    const previousGraph = graph;
    const displayStatus: SubjectStatus = status === 'APROBADA' ? 'Aprobada'
      : status === 'REGULARIZADA' ? 'Regular'
        : status === 'CURSANDO' ? 'Cursando' : 'Disponible';
    if (graph) setGraph(withOptimisticSubjectStatus(graph, code, displayStatus));
    let saved = false;
    let userStudyPlanId = graph?.userStudyPlanId;
    try {
      if (!userStudyPlanId) {
        const enrollments = await studyPlansApi.getMine();
        const enrollment = enrollments.find(item =>
          (typeof item.studyPlan === 'string' ? item.studyPlan : item.studyPlan?._id) === selectedPlan._id,
        ) ?? await studyPlansApi.enroll(selectedPlan._id);
        userStudyPlanId = enrollment._id;
        setEnrollments(current => current.includes(selectedPlan._id) ? current : [...current, selectedPlan._id]);
        setGraph(current => current ? { ...current, userStudyPlanId } : current);
      }
      await studyPlansApi.saveProgress(userStudyPlanId, subject.planSubjectId, { status });
      saved = true;
      const updated = await getPlanGraph(selectedPlan, true);
      if (progressOperation.current === operation) {
        if (backwards) setUnlockHighlight(null);
        if (status === 'APROBADA') {
          const successors = getDirectSuccessorCodes(updated.edges, code);
          const previous = new Map((graph?.nodes ?? []).map(node => [node.code, node.status]));
          const codes = new Set(updated.nodes.filter(node => successors.has(node.code)
            && previous.get(node.code) === 'Bloqueada' && node.status === 'Disponible').map(node => node.code));
          setUnlockHighlight(codes.size ? { source: code, codes } : null);
        }
        setGraph(updated.userStudyPlanId ? updated : { ...updated, userStudyPlanId });
      }
    } catch (error) {
      if (progressOperation.current === operation) {
        if (!saved && previousGraph) {
          setGraph(userStudyPlanId
            ? { ...previousGraph, userStudyPlanId }
            : previousGraph);
        }
        setProgressError(saved
          ? 'El cambio se guardó, pero no se pudo actualizar el mapa. Recargá la página para ver el progreso actualizado.'
          : error instanceof Error ? error.message : 'No se pudo guardar el progreso. Intentá nuevamente.');
      }
    } finally {
      if (progressOperation.current === operation) {
        progressOperation.current = null;
        setProgressSaving(false);
      }
    }
  }, [graph, selectedPlan]);

  const saveSubjectGrade = useCallback(async (code: string, grade: number | null) => {
    const subject = graph?.nodes.find(node => node.code === code);
    if (!subject?.planSubjectId || !selectedPlan) throw new Error('No se pudo identificar la materia para guardar la nota.');
    if (progressOperation.current) throw new Error('Esperá a que termine el otro guardado para editar la nota.');

    const operation = Symbol();
    progressOperation.current = operation;
    setProgressSaving(true);
    setProgressError(null);
    let userStudyPlanId = graph?.userStudyPlanId;
    try {
      if (!userStudyPlanId) {
        const enrollments = await studyPlansApi.getMine();
        const enrollment = enrollments.find(item =>
          (typeof item.studyPlan === 'string' ? item.studyPlan : item.studyPlan?._id) === selectedPlan._id,
        ) ?? await studyPlansApi.enroll(selectedPlan._id);
        userStudyPlanId = enrollment._id;
        setEnrollments(current => current.includes(selectedPlan._id) ? current : [...current, selectedPlan._id]);
        setGraph(current => current ? { ...current, userStudyPlanId } : current);
      }
      await studyPlansApi.saveProgress(userStudyPlanId, subject.planSubjectId, { grade });
      if (progressOperation.current === operation) {
        setGraph(current => current ? {
          ...current,
          nodes: current.nodes.map(node => node.code === code ? { ...node, grade } : node),
        } : current);
      }
    } catch (error) {
      throw error instanceof Error ? error : new Error('No se pudo guardar la nota.');
    } finally {
      if (progressOperation.current === operation) {
        progressOperation.current = null;
        setProgressSaving(false);
      }
    }
  }, [graph, selectedPlan]);

  // Color del instituto (oficial UNAHUR) con fallback a carrera/grafo.
  const planBaseColor = useMemo(() => {
    const c = selectedPlan?.career;
    if (c && typeof c === 'object') {
      if (c.color) return c.color;
      const u = c.academicUnit;
      if (u && typeof u === 'object' && u.name)
        return instituteColor(u.name, u.color);
    }
    return graph?.color ?? 'var(--map-career-fallback)';
  }, [selectedPlan, graph]);

  useEffect(() => {
    let active = true;
    studyPlansApi.getAll().then(result => { if (active) setPlans(result); }).catch(e => { if (active) setErr(e instanceof Error ? e.message : 'Error cargando planes'); });
    studyPlansApi.getMine().then(
      (mine) => {
        if (!active) return;
        setEnrollments(
          mine.map((e) => (typeof e.studyPlan === 'string' ? e.studyPlan : e.studyPlan?._id)).filter((x): x is string => Boolean(x)),
        );
      },
      () => { if (active) setEnrollments([]); },
    );
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!id || !selectedPlan) return;
    let active = true;
    setSelectedCareerId(id); // el contexto guarda ahora el ID del StudyPlan
    setGraph(null);
    setPinnedCode(null);
    setTab('lic');
    setInterCodes(null);
    setErr(null);
    if (selectedPlan.intermediateTitle) {
      studyPlansApi.getIntermediate(id).then(
        (v) => { if (active) setInterCodes(new Set(v.subjects.map((s) => s.code))); },
        () => { if (active) setInterCodes(null); },
      );
    }
    getPlanGraph(selectedPlan).then(g => { if (active) setGraph(g); }).catch(e => {
      if (active) setErr(e instanceof Error ? e.message : 'No se pudo cargar el plan');
    });
    return () => { active = false; };
  }, [id, selectedPlan, setSelectedCareerId]);

  useEffect(() => {
    if (id || plans.length === 0) return;
    // Ámbito a lo elegido: recordado, inscripto o explorar (nunca el primero).
    if (plans.some(p => p._id === selectedCareerId)) {
      navigate(`/${view}/${selectedCareerId}`, { replace: true });
    } else if (enrollments.length > 0 && plans.some(p => p._id === enrollments[0])) {
      navigate(`/${view}/${enrollments[0]}`, { replace: true });
    } else {
      setSelectedCareerId(plans[0]._id);
      navigate(`/${view}/${plans[0]._id}`, { replace: true });
    }
  }, [id, plans, selectedCareerId, enrollments, navigate, view]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPinnedCode(null);
        setPathMode(mode => mode === 'optimal' ? null : mode);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Tec sin materias marcadas: se muestra aviso en vez de canvas vacío.
  const tecEmpty = tab === 'tec' && (displayGraph?.nodes.length ?? -1) === 0;

  const selectedCode = pinnedCode;

  const selectedNode = useMemo(() => displayGraph?.nodes.find((n) => n.code === selectedCode) ?? null, [displayGraph, selectedCode]);
  const byCodeMap = useMemo(() => new Map((displayGraph?.nodes ?? []).map((n) => [n.code, n])), [displayGraph]);
  const highlightedNextCodes = useMemo(() => getDirectSuccessorCodes(
    displayGraph?.edges ?? [], selectedNode?.code ?? null,
  ), [displayGraph, selectedNode]);
  const fastPath = useMemo(() => getStudyPath(
    displayGraph?.nodes ?? [], displayGraph?.edges ?? [], selectedCode,
  ), [displayGraph, selectedCode]);
  const criticalPath = useMemo(() => getStudyPath(
    displayGraph?.nodes ?? [], displayGraph?.edges ?? [],
  ), [displayGraph]);
  const activePath = pathMode === 'critical' && criticalPath.chain.length > 0
    ? criticalPath
    : pathMode === 'optimal' && fastPath.chain.length > 0 ? fastPath : null;
  const activeMode = activePath ? pathMode : null;
  const approvedPathPrerequisites = useMemo(() => {
    const codes = new Set<string>();
    if (!displayGraph || !activePath?.set.size) return codes;
    for (const edge of displayGraph.edges) {
      if (activePath.set.has(edge.target) && byCodeMap.get(edge.source)?.status === 'Aprobada') {
        codes.add(edge.source);
      }
    }
    return codes;
  }, [displayGraph, activePath, byCodeMap]);

  const baseNodes: Node[] = useMemo(() => {
    const g = displayGraph;
    if (!g) return [];
    const criticalSet = new Set<string>();
    const availableSet = new Set(g.availableNow ?? []);
    const yearGroups = new Map<number | null, GraphData['nodes']>();
    for (const n of g.nodes) {
      const list = yearGroups.get(n.year) ?? [];
      list.push(n);
      yearGroups.set(n.year, list);
    }

    const nodes: Node[] = [];
    const { nodeWidth, columnGap, yearGap, rowGap } = GRAPH_SPACING;
    const columnStep = nodeWidth + columnGap;
    const yearWidth = nodeWidth * 2 + columnGap;
    const addLabel = (id: string, label: string, x: number, y: number, isYear = false) => {
      nodes.push({
        id,
        type: 'yearLabel' as const,
        position: { x, y },
        data: { label, width: isYear ? yearWidth : nodeWidth, isYear },
        draggable: false,
        selectable: false,
        focusable: false,
      });
    };
    const addGroup = (
      id: string,
      label: string,
      subjects: GraphData['nodes'],
      x: number,
      y: number
    ) => {
      // No crear columnas vacías
      if (subjects.length === 0) return;

      addLabel(id, label, x, y);

      nodes[nodes.length - 1].data.subjectCount = subjects.length;

      subjects.forEach((n, row) => {
        nodes.push({
          id: n.code,
          type: 'plan',
          position: {
            x,
            y: y + 64 + row * rowGap,
          },
          data: {
            ...toPlanNodeData(
              n,
              availableSet,
              criticalSet,
              new Set()
            ),
          },
        });
      });
    };
    const sortedYears = [...yearGroups.entries()].sort(
      ([a], [b]) => (a ?? Number.MAX_SAFE_INTEGER) - (b ?? Number.MAX_SAFE_INTEGER),
    );
    sortedYears.forEach(([year, subjects], index) => {
      const c1: GraphData['nodes'] = [];
      const c2: GraphData['nodes'] = [];
      const annual: GraphData['nodes'] = [];
      const unassigned: GraphData['nodes'] = [];
      for (const n of subjects) {
        if (n.duration === 'A') annual.push(n);
        else if (n.cuatrimestre === 1) c1.push(n);
        else if (n.cuatrimestre === 2) c2.push(n);
        else unassigned.push(n);
      }

      const x = index * (yearWidth + yearGap);
      const id = `graph-heading-${year ?? 'unknown'}`;
      addLabel(id, year == null ? 'Sin año' : `Año ${year}`, x, 0, true);
      addGroup(`${id}-c1`, '1.er cuatrimestre', c1, x, 50);
      addGroup(`${id}-c2`, '2.º cuatrimestre', c2, x + columnStep, 50);

      // Las anuales y las materias sin período no se asignan a un cuatrimestre ficticio.
      const extraY = 114 + Math.max(c1.length, c2.length) * rowGap + 30;
      if (annual.length > 0) addGroup(`${id}-annual`, 'Anuales', annual, x, extraY);
      if (unassigned.length > 0) addGroup(`${id}-unassigned`, 'Sin cuatrimestre', unassigned, x + columnStep, extraY);
    });
    return nodes;
  }, [displayGraph]);

  const { layout, layoutError, onNodesChange, nodeSizes } = useAcademicEdgeLayout(baseNodes, displayGraph?.edges ?? EMPTY_EDGES);
  const flowNodes: Node[] = useMemo(() => baseNodes.map(node => {
    const related = node.id === selectedCode || highlightedNextCodes.has(node.id) || newlyUnlockedCodes.has(node.id);
    return {
      ...node,
      position: layout?.positions[node.id] ?? node.position,
      style: { opacity: node.type === 'plan' && (activePath
        ? !activePath.set.has(node.id) && !approvedPathPrerequisites.has(node.id)
        : selectedNode && !related) ? DIMMED_OPACITY : 1 },
      data: node.type === 'plan' ? {
        ...node.data,
        optimal: activeMode === 'optimal' && fastPath.set.has(node.id),
        critical: activeMode === 'critical' && criticalPath.set.has(node.id),
        highlightedNext: !activeMode && highlightedNextCodes.has(node.id),
        newlyUnlocked: !activeMode && newlyUnlockedCodes.has(node.id),
        selectedSubject: node.id === selectedCode,
        // React Flow stores this handler in data; only the icon's click invokes it.
        // eslint-disable-next-line react-hooks/refs
        onAdvance: graph ? advanceSubject : undefined,
        progressSaving,
      } : {
        ...node.data,
        width: layout?.yearWidths[node.id] ?? node.data.width,
      },
    };
  }), [baseNodes, layout, fastPath.set, criticalPath.set, activeMode, activePath, approvedPathPrerequisites, highlightedNextCodes, selectedCode, selectedNode, graph?.userStudyPlanId, advanceSubject, progressSaving, newlyUnlockedCodes]);

  const MAP_MARGINS = {
    left: 700,    // Espacio a la izquierda
    right: 700,   // Espacio a la derecha
    top: 25,     // Espacio arriba
    bottom: 400,  // Espacio abajo
  };

  const mapExtent = useMemo<CoordinateExtent>(() => {
    // Límites temporales si todavía no hay materias
    if (flowNodes.length === 0) {
      return [
        [-500, -500],
        [500, 500],
      ];
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    flowNodes.forEach((node) => {
      const { x, y } = node.position;

      // Calcular ancho de cada nodo
      const fallbackWidth =
        node.type === 'yearLabel' &&
        typeof node.data.width === 'number'
          ? node.data.width
          : GRAPH_SPACING.nodeWidth;

      const width =
        nodeSizes[node.id]?.width ?? fallbackWidth;

      // Calcular alto de cada nodo
      const height =
        nodeSizes[node.id]?.height ??
        (node.type === 'yearLabel' ? 55 : 110);

      // Detectar los extremos del grafo
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);

      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });

    // Aplicar márgenes independientes
    return [
      [
        minX - MAP_MARGINS.left,
        minY - MAP_MARGINS.top,
      ],
      [
        maxX + MAP_MARGINS.right,
        maxY + MAP_MARGINS.bottom,
      ],
    ];
  }, [flowNodes, nodeSizes]);

  const semesterPanels = useMemo(() => {
    const getPosition = (node: Node) =>
      layout?.positions[node.id] ?? node.position;

    // Agrupar materias según su encabezado de cuatrimestre
    const groups: {
      heading: Node;
      subjects: Node[];
    }[] = [];

    let currentGroup: {
      heading: Node;
      subjects: Node[];
    } | null = null;

    for (const node of baseNodes) {
      if (node.type === 'yearLabel') {
        if (node.data.isYear) {
          currentGroup = null;
        } else {
          currentGroup = {
            heading: node,
            subjects: [],
          };

          groups.push(currentGroup);
        }
      } else if (node.type === 'plan' && currentGroup) {
        currentGroup.subjects.push(node);
      }
    }

    return groups.map(({ heading, subjects }) => {
      const p = getPosition(heading);

      const paddingTop = -12;
      const paddingBottom = 24;

      const panelTop = p.y - paddingTop;

      const headingBottom =
        p.y + (nodeSizes[heading.id]?.height ?? 40);

      const subjectsBottom = subjects.map((subject) => {
        const position = getPosition(subject);
        const height = nodeSizes[subject.id]?.height ?? 100;

        return position.y + height;
      });

      const contentBottom = Math.max(
        headingBottom,
        ...subjectsBottom
      );

      const height = Math.max(
        100,
        contentBottom - panelTop + paddingBottom
      );

      return {
        id: heading.id,
        x: p.x - 24,
        y: panelTop,
        width: GRAPH_SPACING.nodeWidth + 48,
        height,
      };
    });
  }, [baseNodes, layout, nodeSizes]);


  const flowEdges: Edge[] = useMemo(() => {
    if (!displayGraph) return [];

    const fulfilledColor = 'var(--map-edge-fulfilled)';
    const pendingColor = EDGE_COLORS.normal;

    return displayGraph.edges.map((e) => {
      const highlightedNext = !activeMode && e.source === selectedCode && highlightedNextCodes.has(e.target);
      const newlyUnlocked = !activeMode && e.source === unlockHighlight?.source && newlyUnlockedCodes.has(e.target);
      const sourceStatus = byCodeMap.get(e.source)?.status;
      const targetStatus = byCodeMap.get(e.target)?.status;
      const fulfilledPrerequisite = ['Aprobada', 'Regular'].includes(sourceStatus ?? '');
      const approvedToProgress = sourceStatus === 'Aprobada'
        && ['Disponible', 'Cursando'].includes(targetStatus ?? '');
      const onPathApprovedPrerequisite = !!activeMode
        && !!activePath?.set.has(e.target)
        && sourceStatus === 'Aprobada';
      const onOptimal = activeMode === 'optimal' && fastPath.edgeSet.has(e.id);
      const onCritical = activeMode === 'critical' && criticalPath.edgeSet.has(e.id);

      // Color de la línea y la punta
      const color = newlyUnlocked ? UNLOCK_COLOR : highlightedNext
        ? HIGHLIGHT_COLOR
        : onPathApprovedPrerequisite ? fulfilledColor
        : onOptimal
        ? EDGE_COLORS.optimal
        : onCritical
          ? EDGE_COLORS.critical
          : fulfilledPrerequisite ? fulfilledColor : pendingColor;

      // Grosor de la línea
      const baseWidth = onOptimal
        ? EDGE_WIDTH.optimal
        : onCritical
          ? EDGE_WIDTH.critical
          : EDGE_WIDTH.normal;
      const strokeWidth = approvedToProgress ? EDGE_WIDTH.approvedToProgress
        : highlightedNext ? 3
          : onPathApprovedPrerequisite ? 2.5
            : newlyUnlocked ? 1.5 : baseWidth;

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'academic',
        data: { sections: layout?.routes[e.id] },
        animated: onOptimal || onCritical,
        zIndex: highlightedNext || onPathApprovedPrerequisite || approvedToProgress ? 5 : 0,

        // Estilo de la línea
        style: {
          stroke: color,
          strokeWidth,
          strokeLinejoin: 'round',
          strokeLinecap: 'round',
          opacity: activeMode ? (onOptimal || onCritical || onPathApprovedPrerequisite ? 1 : 0.2) : selectedNode
            ? highlightedNext || newlyUnlocked ? 1 : DIMMED_OPACITY
            : approvedToProgress ? 1 : fulfilledPrerequisite ? 0.68 : 1,
          ...(onOptimal ? { strokeDasharray: '6 3' } : {}),
        },

        // Estilo de la punta
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color,
          width: approvedToProgress ? ARROW_SIZE.width * 1.3 : ARROW_SIZE.width,
          height: approvedToProgress ? ARROW_SIZE.height * 1.3 : ARROW_SIZE.height,
          markerUnits: 'userSpaceOnUse',
        },
      };
    });
  }, [displayGraph, fastPath, criticalPath, activeMode, activePath, selectedCode, highlightedNextCodes, selectedNode, layout, unlockHighlight, newlyUnlockedCodes, byCodeMap]);


  const boardGroups = useMemo(() => {
    interface YearGroup {
      year: number;
      c1: PlanNodeData[];
      c2: PlanNodeData[];
      anual: PlanNodeData[];
      cuat: PlanNodeData[];
      total: number;
      aprobadas: number;
      credits: number;
      creditsAprob: number;
    }
    if (!displayGraph) return [] as YearGroup[];
    const criticalSet = activeMode === 'critical' ? criticalPath.set : new Set<string>();
    const optimalSet = activeMode === 'optimal' ? fastPath.set : new Set<string>();
    const availableSet = new Set(displayGraph.availableNow ?? []);
    const m = new Map<number, YearGroup>();
    for (const n of displayGraph.nodes) {
      const y = n.year ?? 999;
      const g = m.get(y) ?? { year: y, c1: [], c2: [], anual: [], cuat: [], total: 0, aprobadas: 0, credits: 0, creditsAprob: 0 };
      const data = toPlanNodeData(n, availableSet, criticalSet, optimalSet);
      g.total += 1;
      g.credits += n.credits ?? 0;
      if (n.status === 'Aprobada') {
        g.aprobadas += 1;
        g.creditsAprob += n.credits ?? 0;
      }
      if (n.cuatrimestre === 1) g.c1.push(data);
      else if (n.cuatrimestre === 2) g.c2.push(data);
      else if (n.duration === 'A' || n.duration === 'TF') g.anual.push(data);
      else g.cuat.push(data);
      m.set(y, g);
    }
    const out = [...m.values()].sort((a, b) => a.year - b.year);
    for (const g of out) {
      // Merge cuatrimestral subjects (no cuat assigned) into the last cuatrimestre
      if (g.cuat.length > 0) {
        const target = g.c2.length > 0 ? g.c2 : g.c1;
        target.push(...g.cuat);
        g.cuat = [];
      }
      g.c1.sort((a, b) => a.name.localeCompare(b.name));
      g.c2.sort((a, b) => a.name.localeCompare(b.name));
      g.anual.sort((a, b) => a.name.localeCompare(b.name));
    }
    return out;
  }, [displayGraph, fastPath, criticalPath, activeMode]);

  const requires = useMemo(() => {
    if (!selectedNode || !displayGraph) return [];
    return Array.from(byCodeMap.values()).filter((n) =>
      displayGraph.edges.some((e) => e.target === selectedNode.code && e.source === n.code),
    );
  }, [selectedNode, byCodeMap, displayGraph]);

  const successors = useMemo(() => {
    return Array.from(byCodeMap.values()).filter((n) => highlightedNextCodes.has(n.code));
  }, [byCodeMap, highlightedNextCodes]);

  if (err) {
    return <Alert variant="danger" className="mt-3">{err}</Alert>;
  }

  const renderCard = (d: PlanNodeData, selected: boolean) => {
    const isNext = highlightedNextCodes.has(d.code);
    const isRelated = isNext || d.code === selectedCode;
    const border = isNext ? `${BORDER_WIDTH}px solid ${HIGHLIGHT_COLOR}` : nodeBorder(d, selected);
    const pathColor = d.optimal ? EDGE_COLORS.optimal : d.critical ? EDGE_COLORS.critical : undefined;
    return (
      <button
        key={d.code}
        className={!pathColor && d.status === 'Cursando' ? 'plan-node--in-progress' : undefined}
        onClick={() => setPinnedCode((prev) => (prev === d.code ? null : d.code))}
        style={{
          background: d.optimal || d.critical ? OPTIMAL_NODE_BACKGROUND : pathColor ?? (isNext ? 'var(--map-next-bg)' : statusColor(d.status)),
          color: pathColor ? 'var(--map-path-text)' : 'var(--map-node-text)',
          opacity: activePath ? activePath.set.has(d.code) || approvedPathPrerequisites.has(d.code) ? 1 : DIMMED_OPACITY : selectedNode && !isRelated ? DIMMED_OPACITY : 1,
          outline: undefined,
          outlineOffset: 3,
          border,
          borderRadius: 10,
          padding: '8px 12px',
          minWidth: 200,
          maxWidth: 240,
          flex: '1 1 200px',
          textAlign: 'left',
          boxShadow: d.status === 'Cursando' ? undefined : 'var(--map-board-node-shadow)',
          cursor: 'pointer',
        }}
      >
        <div className="d-flex justify-content-between align-items-start gap-2">
          <span style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.25 }}>{d.name}</span>
          <SubjectStatusIcon status={d.status} className="board-subject-status-icon" />
        </div>
        <div style={{ fontSize: 11, color: pathColor ? 'var(--map-path-text)' : 'var(--map-node-muted)', marginTop: 3 }}>
          {d.code} · {d.credits} cr · {statusLabel(d.status)}
        </div>
        <div style={{ fontSize: 10, color: pathColor ? 'var(--map-path-text)' : 'var(--map-node-muted)', marginTop: 3 }}>
          <StatusBadges d={d} />
        </div>
      </button>
    );
  };

  return (
    <ReactFlowProvider>
      <div
        className={`plan-graph${view === 'grafo' ? ' plan-graph--map' : ''}`}
        style={{
          '--plan-highlight-color': HIGHLIGHT_COLOR,
          '--plan-in-progress-color': IN_PROGRESS_COLOR,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: 'none',
          margin: '0 auto',
        } as CSSProperties}
      >
        <div className="plan-map-controls">
        <header className="plan-map-header">
          <div className="plan-map-heading">
            <h1 className="plan-map-heading__title">
              {view === 'grafo' ? 'Mapa de correlatividades' : 'Tablero de materias'}
            </h1>
          </div>
        </header>

        <div className="plan-map-toolbar">
          {selectedPlan?.intermediateTitle && (
            <div className="plan-degree-switch" role="tablist" aria-label="Vista del plan">
              <OverlayTrigger placement="bottom" overlay={<Tooltip id="plan-degree-lic-tooltip">Muestra todas las materias del plan de licenciatura.</Tooltip>}>
                <Button
                  className="plan-degree-switch__option"
                  size="sm"
                  role="tab"
                  aria-selected={tab === 'lic'}
                  variant={tab === 'lic' ? 'primary' : 'outline-primary'}
                  onClick={() => { setTab('lic'); setPinnedCode(null); setPathMode(null); }}
                >
                  Licenciatura
                </Button>
              </OverlayTrigger>
              <OverlayTrigger placement="bottom" overlay={<Tooltip id="plan-degree-tec-tooltip">Muestra solo las materias que forman parte de la tecnicatura.</Tooltip>}>
                <Button
                  className="plan-degree-switch__option"
                  size="sm"
                  role="tab"
                  aria-selected={tab === 'tec'}
                  variant={tab === 'tec' ? 'primary' : 'outline-primary'}
                  onClick={() => { setTab('tec'); setPinnedCode(null); setPathMode(null); }}
                >
                  Tecnicatura
                </Button>
              </OverlayTrigger>
            </div>
          )}

          <div className={view === 'grafo' ? 'plan-map-toolbar__paths' : 'd-flex flex-wrap align-items-center gap-2 ms-auto'} role="group" aria-label="Navegación del plan">
            {(view !== 'grafo' || displayGraph) && <>
              <OverlayTrigger placement="bottom" overlay={<Tooltip id="plan-critical-toolbar-tooltip">Resalta el camino pendiente con mayor carga horaria total. Si empatan, prioriza el que tiene más materias.</Tooltip>}>
                <Button
                  className="plan-map-action plan-map-action--critical"
                  variant={activeMode === 'critical' ? 'warning' : 'outline-secondary'}
                  size="sm"
                  aria-pressed={activeMode === 'critical'}
                  aria-describedby="plan-path-help"
                  disabled={criticalPath.chain.length === 0}
                  onClick={() => setPathMode(mode => mode === 'critical' ? null : 'critical')}
                >
                  Ruta con más carga horaria
                </Button>
              </OverlayTrigger>
              <OverlayTrigger placement="bottom" overlay={<Tooltip id="plan-optimal-toolbar-tooltip">Elegí una materia para ver las correlativas que necesitás aprobar antes.</Tooltip>}>
                <Button
                  className="plan-map-action plan-map-action--optimal"
                  variant={pathMode === 'optimal' ? 'warning' : 'outline-secondary'}
                  size="sm"
                  aria-pressed={pathMode === 'optimal'}
                  aria-describedby="plan-path-help"
                  disabled={!displayGraph?.nodes.length}
                  onClick={() => setPathMode(mode => mode === 'optimal' ? null : 'optimal')}
                >
                  Ruta para desbloquear Materia
                </Button>
              </OverlayTrigger>
            </>}
          </div>
        </div>

        </div>

        {err && <Alert variant="danger" className="mx-3">{err}</Alert>}
        {progressError && <Alert variant="warning" className="mx-3" dismissible onClose={() => setProgressError(null)}>{progressError}</Alert>}
        {criticalPath.hasCycle && <Alert variant="warning" className="mx-3 py-1 small">Hay un ciclo entre las correlativas pendientes. No se puede calcular la ruta con más carga horaria.</Alert>}
        <div id="plan-path-help" className="mx-3 mb-2 small" role="status">
          {activePath ? (
            <>
              <div
                className="rounded px-3 py-2"
                style={{ background: 'var(--map-route-notice-bg)', borderLeft: `3px solid ${EDGE_COLORS.critical}` }}
              >
                <div>
                  <strong>{activeMode === 'critical' ? 'Ruta con más carga horaria.' : 'Ruta para desbloquear Materia.'}</strong>{' '}
                  {activeMode === 'critical'
                    ? 'Resalta el recorrido pendiente con mayor carga horaria total.'
                    : 'Muestra las correlativas que necesitás completar para aprobar la materia elegida.'}
                </div>
                <div className="text-muted">Volvé a pulsar el botón activo para quitar el resaltado.</div>
              </div>
            </>
          ) : pathMode === 'optimal' ? (
            <div className="rounded px-3 py-2" style={{ background: 'var(--map-route-notice-bg)', borderLeft: `3px solid ${EDGE_COLORS.critical}` }}>
              <div>
                <strong>Ruta para desbloquear Materia activada.</strong>{' '}
                {displayGraph?.nodes.every(node => node.status === 'Aprobada')
                  ? 'Ya aprobaste todas las materias de esta vista. No quedan recorridos pendientes.'
                  : selectedNode?.status === 'Aprobada'
                    ? `Ya aprobaste ${selectedNode.name}. Elegí otra materia para ver cómo llegar a aprobarla.`
                    : fastPath.hasCycle
                      ? 'Las correlativas de esta materia forman un ciclo y no permiten calcular el recorrido. Podés elegir otra materia.'
                      : `Hacé clic en una materia ${view === 'grafo' ? 'del mapa' : 'del tablero'} para ver las correlativas que necesitás completar hasta aprobarla.`}
              </div>
              <div className="text-muted">Volvé a pulsar el botón activo para quitar el resaltado.</div>
            </div>
          ) : null}
        </div>
        {view === 'grafo' && layoutError && <Alert variant="warning" className="mx-3">No se pudieron optimizar las flechas. Se muestran conexiones ortogonales simples. {layoutError}</Alert>}
        {id && !selectedPlan && plans.length > 0 && <Alert variant="warning" className="mx-3">Seleccioná un plan válido. Los enlaces antiguos de carrera ya no corresponden al grafo.</Alert>}
        {displayGraph && displayGraph.edges.length === 0 && <Alert variant="info" className="mx-3 py-1 small">No hay correlatividades vinculadas todavía. Podés agregarlas desde Administrar plan.</Alert>}
        {tecEmpty && (
          <Alert variant="warning" className="mx-3">
            La tecnicatura de este plan todavía no tiene materias marcadas.
            El administrador las marca desde Editar plan.
          </Alert>
        )}

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', margin: '0 8px 8px' }}>
          <div
            ref={view === 'grafo' ? mapContainerRef : null}
            className={view === 'grafo' ? 'plan-graph-map-shell' : undefined}
            style={{
              flex: view === 'grafo' ? 1 : '0 0 auto',
              minHeight: 0,
              position: 'relative',
            }}
          >
            {view === 'grafo' && displayGraph && <div className="plan-progress-summary">
              <div className="plan-progress-summary__stats" aria-label="Resumen de estados">
                {([
                  { status: 'Aprobada', label: '', count: displayGraph.stats.aprobadas, tone: 'approved' },
                  { status: 'Bloqueada', label: '', count: displayGraph.stats.bloqueadas, tone: 'locked' },
                  { status: 'Cursando', label: 'Cursando', count: displayGraph.stats.enCurso, tone: 'in-progress' },
                  { status: 'Disponible', label: displayGraph.stats.disponibles === 1 ? 'Disponible' : 'Disponibles', count: displayGraph.stats.disponibles, tone: 'available' },
                  { status: 'Regular', label: 'Regulares', count: displayGraph.stats.regulares, tone: 'regular' },
                ] as const).map(item => {
                  const stat = <span key={item.status} className={`plan-progress-summary__stat plan-progress-summary__stat--${item.tone}`}>
                    <SubjectStatusIcon status={item.status} showTooltip={false} /><strong>{item.count}</strong>{item.label && <> {item.label}</>}
                  </span>;
                  if (item.status === 'Aprobada' || item.status === 'Bloqueada') {
                    const approved = item.status === 'Aprobada';
                    return (
                      <OverlayTrigger
                        key={item.status}
                        placement="top"
                        overlay={<Tooltip id={`plan-status-${item.tone}-tooltip`} className={`status-legend-tooltip status-legend-tooltip--${item.tone}`}>{approved ? 'Aprobadas' : 'Bloqueadas'}</Tooltip>}
                      >
                        {stat}
                      </OverlayTrigger>
                    );
                  }
                  return stat;
                })}
              </div>
              <div className="plan-progress-summary__actions" role="group" aria-label="Rutas de correlatividades">
                <OverlayTrigger placement="bottom" overlay={<Tooltip id="plan-optimal-legend-tooltip">Elegí una materia para ver las correlativas que necesitás aprobar antes.</Tooltip>}>
                  <Button
                    className="plan-map-action plan-map-action--optimal"
                    variant={pathMode === 'optimal' ? 'warning' : 'outline-secondary'}
                    size="sm"
                    aria-pressed={pathMode === 'optimal'}
                    aria-describedby="plan-path-help"
                    disabled={!displayGraph.nodes.length}
                    onClick={() => setPathMode(mode => mode === 'optimal' ? null : 'optimal')}
                  >
                    Ruta para desbloquear Materia
                  </Button>
                </OverlayTrigger>
                <OverlayTrigger placement="bottom" overlay={<Tooltip id="plan-critical-legend-tooltip">Resalta el camino pendiente con mayor carga horaria total. Si empatan, prioriza el que tiene más materias.</Tooltip>}>
                  <Button
                    className="plan-map-action plan-map-action--critical"
                    variant={activeMode === 'critical' ? 'warning' : 'outline-secondary'}
                    size="sm"
                    aria-pressed={activeMode === 'critical'}
                    aria-describedby="plan-path-help"
                    disabled={criticalPath.chain.length === 0}
                    onClick={() => setPathMode(mode => mode === 'critical' ? null : 'critical')}
                  >
                    Ruta con más carga horaria
                  </Button>
                </OverlayTrigger>
              </div>
            </div>}
            {view === 'grafo' && graph && !tecEmpty && (
              <ReactFlow
                className="plan-graph-canvas"
                nodes={flowNodes}
                edges={flowEdges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodesChange={onNodesChange}
                translateExtent={mapExtent}
                onNodeClick={(_, node) => {
                  if (node.type === 'yearLabel') return;
                  setPinnedCode((prev) => (prev === node.id ? null : node.id));
                }}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.38}
                nodesDraggable={false}
                panOnDrag={true}
                nodeClickDistance={7}
                defaultEdgeOptions={{
                  type: 'academic',
                }}
                style={{
                  width: '100%',
                  height: 'auto',
                  flex: '1 1 auto',
                  background: graphBackground.color,
                  borderRadius: 20,
                  overflow: 'hidden',
                }}
              >
                <ViewportPortal>
                  {semesterPanels.map(panel => <div key={panel.id} className="plan-semester-panel" aria-hidden="true"
                    style={{ left: panel.x, top: panel.y, width: panel.width, height: panel.height }} />)}
                </ViewportPortal>
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={GRAPH_BACKGROUND.dotsGap}
                  size={GRAPH_BACKGROUND.dotsSize}
                  color={graphBackground.dotsColor}
                  bgColor={graphBackground.color}
                />
                <Controls position="bottom-left" showFitView={false}>
                  <ControlButton
                    onClick={() => { void toggleMapFullscreen(); }}
                    title={isMapFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                    aria-label={isMapFullscreen ? 'Salir de pantalla completa' : 'Poner el mapa en pantalla completa'}
                    aria-pressed={isMapFullscreen}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {isMapFullscreen ? (
                        <>
                          <path d="M8 3v5H3" />
                          <path d="M21 8h-5V3" />
                          <path d="M3 16h5v5" />
                          <path d="M16 21v-5h5" />
                        </>
                      ) : (
                        <>
                          <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                          <path d="M16 3h3a2 2 0 0 1 2 2v3" />
                          <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
                          <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                        </>
                      )}
                    </svg>
                  </ControlButton>
                </Controls>
                <LayoutViewport layout={layout} />
              </ReactFlow>
            )}

          {view === 'tablero' && graph && !tecEmpty && (
            <div style={{ height: 'auto', overflow: 'visible', padding: '4px 12px 20px' }}>
              {boardGroups.map((g) => (
                <div
                  key={g.year}
                  className="card mb-3"
                  style={{ borderLeft: `5px solid ${planBaseColor}`, borderRadius: 10 }}
                >
                  <div className="card-body py-2 px-3 d-flex flex-wrap align-items-center gap-3">
                    <div className="fw-bold" style={{ color: planBaseColor, minWidth: 90 }}>
                      {yearLabel(g.year)}
                    </div>
                    <div className="small text-muted">
                      {g.total} materias · {g.aprobadas} aprobadas ·{' '}
                      {g.creditsAprob}/{g.credits} créditos
                    </div>
                    {g.aprobadas === g.total && g.total > 0 && (
                      <span className="badge text-bg-success ms-auto">año completo</span>
                    )}
                  </div>
                  <div className="card-body pt-0 px-3 pb-3 d-flex flex-wrap gap-2">
                    {g.c1.length > 0 && (
                      <div className="flex-grow-1" style={{ minWidth: 220 }}>
                        <div className="small fw-semibold text-muted mb-1">Cuatrimestre 1</div>
                        <div className="d-flex flex-wrap gap-2">{g.c1.map((d) => renderCard(d, d.code === selectedCode))}</div>
                      </div>
                    )}
                    {g.c2.length > 0 && (
                      <div className="flex-grow-1" style={{ minWidth: 220 }}>
                        <div className="small fw-semibold text-muted mb-1">Cuatrimestre 2</div>
                        <div className="d-flex flex-wrap gap-2">{g.c2.map((d) => renderCard(d, d.code === selectedCode))}</div>
                      </div>
                    )}
                    {g.anual.length > 0 && (
                      <div className="flex-grow-1" style={{ minWidth: 220 }}>
                        <div className="small fw-semibold text-muted mb-1">Anual / TC / TF</div>
                        <div className="d-flex flex-wrap gap-2">{g.anual.map((d) => renderCard(d, d.code === selectedCode))}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {displayGraph && pinnedCode && (
            <DetailPanel
              graph={displayGraph}
              selectedNode={selectedNode}
              requires={requires}
              successors={successors}
              progressSaving={progressSaving}
              onSelect={setPinnedCode}
              onSetStatus={(code, status) => { void advanceSubject(code, false, status); }}
              onSaveGrade={saveSubjectGrade}
              onClose={() => setPinnedCode(null)}
            />
          )}
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  );
}
