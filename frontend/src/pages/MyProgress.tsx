import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Form, Spinner, Table } from 'react-bootstrap';
import { apiService } from '../api';
import type { ParsedSubject, ProgressEntry, ProgressSummary, Subject, SubjectStatus } from '../types';
import { STATUS_LABEL } from '../utils/status';
import { getCareerColor } from '../utils/careerColor';
import { useCareerSelection } from '../hooks/useCareerSelection';
import { useCareers } from '../hooks/useCareers';
import { useFlashMessage } from '../hooks/useFlashMessage';
import { sortSubjects } from '../utils/subjects';
import { IconBoard, IconCheck, IconCoins } from '../components/icons';
import PageHeader from '../components/PageHeader';
import MessageBanner from '../components/MessageBanner';
import ImportJobList from '../components/ImportJobList';
import ColorDot from '../components/ColorDot';
import PdfDropzone from '../components/PdfDropzone';

type HistoryJob = {
  id: string;
  file: string;
  status: 'parseando' | 'guardando' | 'listo' | 'error';
  count?: number;
  error?: string;
};

const HISTORY_JOB_LABEL = {
  parseando: 'Leyendo el PDF…',
  guardando: 'Guardando en tu progreso…',
};

const fmt = new Intl.NumberFormat('es-AR');

function Ring({ value, color, size = 96, stroke = 9 }: { value: number; color: string; size?: number; stroke?: number }) {
  const safe = Math.min(100, Math.max(0, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (safe / 100) * c;
  return (
    <div
      className="ring"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label="Avance de créditos"
      aria-valuenow={safe}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg width={size} height={size}>
        <circle className="ring__track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
        <circle
          className="ring__value"
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="ring__center">{safe}%</div>
    </div>
  );
}

export default function MyProgress() {
  const { careerId: ctxCareerId, setCareerId: setCtxCareerId } = useCareerSelection();
  const { msg, flash, flashFromError, clear } = useFlashMessage();
  const { careers } = useCareers({ scope: 'published', onError: (m) => flash('danger', m) });
  const [careerId, setCareerId] = useState(ctxCareerId ?? '');
  const [parsed, setParsed] = useState<ParsedSubject[] | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [draft, setDraft] = useState<Record<string, { status: SubjectStatus; nota: string }>>({});
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [jobs, setJobs] = useState<HistoryJob[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reqRef = useRef(0);

  useEffect(() => {
    if (careers.length && !careerId) {
      setCareerId(ctxCareerId && careers.some((c) => c._id === ctxCareerId) ? ctxCareerId : careers[0]._id);
    }
  }, [careers, careerId, ctxCareerId]);

  const loadSubjects = useCallback(
    async (id: string) => {
      const reqId = ++reqRef.current;
      const s = await apiService.getSubjects(id);
      if (reqId !== reqRef.current) return;
      setSubjects(s);
      const current = await apiService.getMine(id);
      if (reqId !== reqRef.current) return;
      setSummary(current.summary);
      const d: Record<string, { status: SubjectStatus; nota: string }> = {};
      for (const subj of s) {
        const found = current.entries.find((p) => p.subjectCode === subj.code);
        d[subj.code] = {
          status: found?.status ?? 'Pendiente',
          nota: found?.nota != null ? String(found.nota) : '',
        };
      }
      setDraft(d);
    },
    [],
  );

  useEffect(() => {
    if (!careerId) return;
    loadSubjects(careerId).catch((e) => flashFromError(e, 'Error cargando tu progreso'));
  }, [careerId, loadSubjects, flashFromError]);

  const importHistory = async (file: File) => {
    const id = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setJobs((j) => [...j, { id, file: file.name, status: 'parseando' }]);
    try {
      const r = await apiService.parsePersonal(file);
      const aprobadas = r.subjects.filter((s) => s.status === 'Aprobada');
      setParsed(aprobadas);
      setActiveJobId(id);
      setJobs((j) => j.map((x) => (x.id === id ? { ...x, status: 'listo', count: aprobadas.length } : x)));
      flash('success', `${r.detectedCount} materias leídas (${aprobadas.length} aprobadas)`);
    } catch (err) {
      setJobs((j) => j.map((x) => (x.id === id ? { ...x, status: 'error', error: err instanceof Error ? err.message : 'Error' } : x)));
      flashFromError(err, `Error con ${file.name}`);
    }
  };

  const onHistoryFiles = (files: File[]) => {
    files.forEach((f) => void importHistory(f));
  };

  const importParsed = async () => {
    if (!careerId || !parsed) return;
    setSaving(true);
    setJobs((j) => j.map((x) => (x.id === activeJobId ? { ...x, status: 'guardando' } : x)));
    try {
      const entries: ProgressEntry[] = parsed.map((s) => ({
        subjectCode: s.code,
        status: s.status === 'Aprobada' ? 'Aprobada' : 'Pendiente',
        nota: s.nota ?? null,
        fecha: s.fecha ?? null,
        origen: s.origen ?? null,
      }));
      await apiService.save(careerId, entries);
      setJobs((j) => j.map((x) => (x.id === activeJobId ? { ...x, status: 'listo', count: parsed.length } : x)));
      setParsed(null);
      setActiveJobId(null);
      flash('success', 'Progreso guardado a partir de tu historia académica');
      await loadSubjects(careerId);
    } catch (err) {
      flashFromError(err, 'Error guardando el progreso');
    } finally {
      setSaving(false);
    }
  };

  const saveAll = async () => {
    if (!careerId) return;
    setSaving(true);
    try {
      const entries: ProgressEntry[] = subjects.map((s) => {
        const d = draft[s.code];
        const nota = d?.nota ? Number(d.nota) : null;
        return {
          subjectCode: s.code,
          status: d?.status ?? 'Pendiente',
          nota: Number.isFinite(nota) ? nota : null,
          fecha: null,
          origen: null,
        };
      });
      await apiService.save(careerId, entries);
      flash('success', 'Progreso actualizado');
      await loadSubjects(careerId);
    } catch (err) {
      flashFromError(err, 'Error actualizando el progreso');
    } finally {
      setSaving(false);
    }
  };

  const ordered = useMemo(() => sortSubjects(subjects), [subjects]);

  const pct = summary && summary.creditsTotal ? Math.round((summary.creditsAprobados / summary.creditsTotal) * 100) : 0;
  const aprobPct = summary && summary.total ? Math.round((summary.aprobadas / summary.total) * 100) : 0;

  const yearGroups = useMemo(() => {
    const m = new Map<number, { total: number; aprobadas: number }>();
    for (const subj of subjects) {
      const y = subj.year ?? 999;
      const g = m.get(y) ?? { total: 0, aprobadas: 0 };
      g.total += 1;
      if ((draft[subj.code]?.status ?? 'Pendiente') === 'Aprobada') g.aprobadas += 1;
      m.set(y, g);
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [subjects, draft]);

  const selectedCareer = careers.find((c) => c._id === careerId) ?? null;
  const careerColor = selectedCareer ? getCareerColor(selectedCareer) : '#adb5bd';
  const restantes = (summary?.total ?? 0) - (summary?.aprobadas ?? 0);

  return (
    <div>
      <PageHeader
        title="Mi progreso"
        sub="Cargá tus materias aprobadas y seguí cuánto te falta para recibirte."
      />

      <MessageBanner message={msg} onClose={clear} />

      <div className="card mb-4">
        <div className="card-body d-flex align-items-center gap-3 flex-wrap">
          <ColorDot color={careerColor} size={14} />
          <Form.Select
            className="flex-grow-1"
            aria-label="Carrera publicada"
            value={careerId}
            onChange={(e) => {
              const v = e.target.value;
              setCareerId(v);
              setCtxCareerId(v);
            }}
          >
            <option value="">Seleccioná una carrera publicada…</option>
            {careers.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </Form.Select>
        </div>
      </div>

      {!careerId || !summary ? (
        <p className="text-muted">Seleccioná una carrera para ver tu avance.</p>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-card__label">materias aprobadas</span>
              <span className="stat-card__value">{fmt.format(summary.aprobadas)}</span>
              <span className="stat-card__foot">de {fmt.format(summary.total)} en total</span>
              <div className="stat-card__bar">
                <span style={{ width: `${aprobPct}%` }} />
              </div>
            </div>

            <div className="stat-card">
              <span className="stat-card__label">créditos</span>
              <span className="stat-card__value">
                {fmt.format(summary.creditsAprobados)}
                <span className="fs-6 text-muted fw-semibold"> / {fmt.format(summary.creditsTotal)}</span>
              </span>
              <span className="stat-card__foot">aprobados sobre total del plan</span>
              <div className="stat-card__bar">
                <span style={{ width: `${pct}%` }} />
              </div>
            </div>

            <div className="stat-card">
              <span className="stat-card__label">avance de créditos</span>
              <div className="ring-wrap">
                <Ring value={pct} color={careerColor} />
              </div>
            </div>

            <div className="stat-card">
              <span className="stat-card__label">te faltan</span>
              <span className="stat-card__value">{fmt.format(restantes)}</span>
              <span className="stat-card__foot">materias por aprobar</span>
              <div className="stat-card__bar">
                <span
                  style={{
                    width: `${summary.total ? Math.round((restantes / summary.total) * 100) : 0}%`,
                    background: 'linear-gradient(90deg, #f59e0b, #f97316)',
                  }}
                />
              </div>
            </div>
          </div>

          {yearGroups.length > 1 && (
            <div className="card mb-4">
              <div className="card-header d-flex align-items-center gap-2">
                <IconBoard size={16} />
                Avance por año
              </div>
              <div className="card-body d-grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                {yearGroups.map(([year, g]) => {
                  const ypct = g.total ? Math.round((g.aprobadas / g.total) * 100) : 0;
                  return (
                    <div key={year}>
                      <div className="yr-row mb-1">
                        <span className="yr-row__label">{year === 999 ? 'Sin año' : `Año ${year}`}</span>
                        <span className="text-muted small">
                          {g.aprobadas}/{g.total}
                        </span>
                      </div>
                      <div className="mini-progress">
                        <div className="mini-progress__bar" style={{ width: `${ypct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="card mb-4">
            <div className="card-header d-flex align-items-center gap-2">
              <IconCheck size={16} />
              Importar historia académica (PDF)
            </div>
            <div className="card-body">
              <PdfDropzone
                onFiles={onHistoryFiles}
                multiple
                text="Arrastrá tu historia académica acá"
                hint="o hacé clic para elegir tu PDF · se admiten varios"
              />
              <ImportJobList
                jobs={jobs}
                labels={HISTORY_JOB_LABEL}
                renderReady={(j) => (
                  <span className="text-success">
                    <strong>{j.count}</strong> aprobadas detectadas
                  </span>
                )}
              />
              {parsed !== null && parsed.length === 0 && (
                <p className="text-muted small mb-0 mt-3">
                  No se detectaron materias aprobadas en el PDF.
                </p>
              )}
              {parsed !== null && parsed.length > 0 && (
                <p className="mb-0 mt-3 d-flex align-items-center gap-2 flex-wrap">
                  <span>
                    <strong>{parsed.length}</strong> materias aprobadas listas para guardar.
                  </span>
                  <Button size="sm" variant="success" disabled={saving} onClick={importParsed}>
                    {saving && <Spinner size="sm" className="me-1" />}
                    Guardar en mi progreso
                  </Button>
                </p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header d-flex align-items-center gap-2">
              <IconCoins size={16} />
              Estado por materia (edición manual)
            </div>
            <div className="card-body">
              <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                <Table size="sm" striped hover responsive>
                  <thead>
                    <tr>
                      <th scope="col">Materia</th>
                      <th scope="col" style={{ width: 140 }}>Estado</th>
                      <th scope="col" style={{ width: 90 }}>Nota</th>
                      <th scope="col" style={{ width: 80 }}>Créditos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordered.map((s) => (
                      <tr key={s._id}>
                        <td>
                          <code>{s.code}</code> — {s.name}
                          <div className="text-muted small">año {s.year ?? '-'} · cuat. {s.cuatrimestre ?? '-'}</div>
                        </td>
                        <td>
                          <Form.Select
                            size="sm"
                            aria-label={`Estado de ${s.name}`}
                            value={draft[s.code]?.status ?? 'Pendiente'}
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, [s.code]: { ...d[s.code], status: e.target.value as SubjectStatus } }))
                            }
                          >
                            {(Object.keys(STATUS_LABEL) as SubjectStatus[]).map((st) => (
                              <option key={st} value={st}>{STATUS_LABEL[st]}</option>
                            ))}
                          </Form.Select>
                        </td>
                        <td>
                          <Form.Control
                            size="sm"
                            type="number"
                            min={0}
                            max={10}
                            aria-label={`Nota de ${s.name}`}
                            value={draft[s.code]?.nota ?? ''}
                            onChange={(e) => setDraft((d) => ({ ...d, [s.code]: { ...d[s.code], nota: e.target.value } }))}
                          />
                        </td>
                        <td>{s.credits}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              {ordered.length > 0 && (
                <Button variant="primary" className="mt-2" disabled={saving} onClick={saveAll}>Guardar todo</Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}