import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiService } from '../api';
import type { Career, ParsedSubject, ParseCorrelativasResponse, Subject } from '../types';
import { getCareerColor } from '../utils/careerColor';
import { toSubjectPayload } from '../utils/subjectMappers';
import { groupSubjectsByYear, sortSubjects, yearLabel } from '../utils/subjects';
import { useCareers } from '../hooks/useCareers';
import { useFlashMessage } from '../hooks/useFlashMessage';
import PdfDropzone from '../components/PdfDropzone';
import MessageBanner from '../components/MessageBanner';
import PageHeader from '../components/PageHeader';
import CareersTable from '../components/CareersTable';
import ModalConfirm from '../components/ModalConfirm';
import ColorDot from '../components/ColorDot';
import { IconUpload, IconUsers } from '../components/icons';

const CONFIRM_DELETE = (name: string) =>
  `¿Eliminar el plan "${name}"? Se borrarán también todas sus materias y el avance de los usuarios. Esta acción no se puede deshacer.`;

export default function PlanAdmin() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { careers, reload } = useCareers();
  const { msg, flash, flashFromError, clear } = useFlashMessage();
  const [selectedId, setSelectedId] = useState<string | null>(id ?? null);
  const [candidate, setCandidate] = useState<Career | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [personalParsed, setPersonalParsed] = useState<ParsedSubject[] | null>(null);
  const [personalIntermediateTitle, setPersonalIntermediateTitle] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [requiresDraft, setRequiresDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [corrParsed, setCorrParsed] = useState<ParseCorrelativasResponse | null>(null);
  const [corrLoading, setCorrLoading] = useState(false);
  const [corrSaving, setCorrSaving] = useState(false);
  const [corrFilter, setCorrFilter] = useState<'todas' | 'coinciden' | 'sin'>('todas');

  const [nameDraft, setNameDraft] = useState('');
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    if (id) setSelectedId(id);
  }, [id]);

  const reloadSubjects = useCallback(
    async (careerId: string) => {
      const s = await apiService.getSubjects(careerId);
      setSubjects(s);
      const draft: Record<string, string> = {};
      for (const subj of s) draft[subj.code] = (subj.requires || []).join(', ');
      setRequiresDraft(draft);
    },
    [],
  );

  useEffect(() => {
    if (!selectedId) {
      setSubjects([]);
      setRequiresDraft({});
      setCorrParsed(null);
      return;
    }
    reloadSubjects(selectedId).catch((e) => flashFromError(e, 'Error cargando las materias'));
  }, [selectedId, reloadSubjects, flashFromError]);

  const onPersonal = async (file: File) => {
    try {
      const r = await apiService.parsePersonal(file);
      setPersonalParsed(r.subjects);
      setPersonalIntermediateTitle(r.intermediateTitle ?? null);
      flash('success', `${r.detectedCount} materias detectadas en tu plan`);
    } catch (err) {
      flashFromError(err, 'Error leyendo tu plan');
    }
  };

  const importPersonal = async () => {
    if (!selectedId || !personalParsed) return;
    setSaving(true);
    try {
      const r = await apiService.saveSubjects(selectedId, personalParsed.map(toSubjectPayload), personalIntermediateTitle);
      setPersonalParsed(null);
      setPersonalIntermediateTitle(null);
      flash('success', `Plan personal importado: ${r.saved} materias (${r.total} en total)`);
      await reload();
    } catch (err) {
      flashFromError(err, 'Error importando el plan personal');
    } finally {
      setSaving(false);
    }
  };

  const saveRequires = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const payload = subjects.map((s) => ({
        ...toSubjectPayload({ ...s }),
        requires: Array.from(new Set(
          (requiresDraft[s.code] || '')
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean),
        )),
      }));
      const r = await apiService.saveSubjects(selectedId, payload);
      flash('success', `Correlatividades guardadas (${r.total} materias)`);
      await reload();
    } catch (err) {
      flashFromError(err, 'Error guardando las correlatividades');
    } finally {
      setSaving(false);
    }
  };

  const publish = async (id: string) => {
    try {
      await apiService.publish(id);
      flash('success', 'Carrera publicada');
      await reload();
    } catch (err) {
      flashFromError(err, 'Error publicando la carrera');
    }
  };

  const renameCareer = async () => {
    if (!selectedId) return;
    const newName = nameDraft.trim();
    if (!newName) return;
    setRenaming(true);
    try {
      await apiService.update(selectedId, { name: newName });
      flash('success', `Carrera renombrada a "${newName}"`);
      await reload();
    } catch (err) {
      flashFromError(err, 'Error renombrando la carrera');
    } finally {
      setRenaming(false);
    }
  };

  const confirmRemove = async () => {
    if (!candidate) return;
    setDeleting(true);
    try {
      await apiService.deleteCareer(candidate._id);
      if (selectedId === candidate._id) {
        setSelectedId(null);
        navigate('/admin');
      }
      flash('success', `Plan "${candidate.name}" eliminado`);
      setCandidate(null);
      await reload();
    } catch (err) {
      flashFromError(err, 'Error eliminando el plan');
    } finally {
      setDeleting(false);
    }
  };

  const onCorrelativas = async (file: File) => {
    if (!selectedId) return;
    setCorrLoading(true);
    setCorrParsed(null);
    try {
      const r = await apiService.parseCorrelativas(selectedId, file);
      setCorrParsed(r);
      flash(
        r.partial && r.matchedCount > 0 ? 'warning' : r.partial ? 'danger' : 'success',
        `${r.total} materias leídas del PDF · ${r.matchedCount} reconocidas en la carrera.`,
      );
    } catch (err) {
      flashFromError(err, 'Error leyendo las correlatividades');
    } finally {
      setCorrLoading(false);
    }
  };

  const saveCorrelativas = async () => {
    if (!selectedId || !corrParsed) return;
    const payload = corrParsed.subjects
      .filter((s) => s.matched && s.dbCode)
      .map((s) => ({ code: s.dbCode!, name: s.dbName || s.name, requires: s.requires }));
    if (!payload.length) {
      flash('warning', 'No hay materias con coincidencia para guardar.');
      return;
    }
    setCorrSaving(true);
    try {
      const r = await apiService.saveCorrelativas(selectedId, payload);
      flash('success', `Correlatividades guardadas en ${r.saved} materias (${r.total} en total).`);
      setCorrParsed(null);
      await reloadSubjects(selectedId);
    } catch (err) {
      flashFromError(err, 'Error guardando las correlatividades');
    } finally {
      setCorrSaving(false);
    }
  };

  const selected = careers.find((c) => c._id === selectedId) || null;
  const ordered = useMemo(() => sortSubjects(subjects), [subjects]);

  const nameByCode = new Map(subjects.map((s) => [s.code, s.name]));
  const pctMatch =
    corrParsed && corrParsed.total ? Math.round((corrParsed.matchedCount / corrParsed.total) * 100) : 0;
  const rowList = corrParsed
    ? corrParsed.subjects.filter((s) =>
        corrFilter === 'todas' ? true : corrFilter === 'coinciden' ? s.matched : !s.matched,
      )
    : [];

  useEffect(() => {
    const career = careers.find((c) => c._id === selectedId);
    setNameDraft(career?.name ?? '');
  }, [selectedId, careers]);

  const draftCodes = (code: string) =>
    (requiresDraft[code] || '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);

  const dirtyCount = ordered.reduce((acc, s) => {
    const a = draftCodes(s.code);
    const b = s.requires || [];
    const same = a.length === b.length && a.every((x, i) => x === b[i]);
    return acc + (same ? 0 : 1);
  }, 0);

  const yearGroups = groupSubjectsByYear(ordered);

  return (
    <div>
      <PageHeader title="Editar plan de estudios" />
      <MessageBanner message={msg} onClose={clear} />

      <Card className="mb-4">
        <Card.Header>Carreras generadas</Card.Header>
        <Card.Body>
          <CareersTable
            careers={careers}
            selectedId={selectedId}
            onSelect={(c) => {
              setSelectedId(c._id);
              navigate(`/admin/${c._id}`);
            }}
            emptyText={
              <p className="text-muted mb-0">
                Todavía no hay planes. Cargá el primero desde <Link to="/cargar">Cargar plan</Link>.
              </p>
            }
            actions={(c) => (
              <>
                {c.status !== 'published' && (
                  <Button size="sm" variant="outline-success" onClick={() => publish(c._id)}>Publicar</Button>
                )}{' '}
                <Button size="sm" variant="outline-danger" onClick={() => setCandidate(c)}>Eliminar</Button>
              </>
            )}
          />
        </Card.Body>
      </Card>

      {selected && (
        <Card className="mb-4" style={{ borderTop: `4px solid ${getCareerColor(selected)}` }}>
          <Card.Header className="d-flex flex-wrap align-items-center gap-2">
            <ColorDot color={getCareerColor(selected)} size={14} />
            <Form.Control
              size="sm"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') renameCareer();
              }}
              style={{ maxWidth: 280 }}
              aria-label="Nombre de la carrera"
            />
            <Button
              size="sm"
              variant="outline-primary"
              disabled={renaming || !nameDraft.trim() || nameDraft.trim() === selected.name}
              onClick={renameCareer}
            >
              {renaming && <Spinner size="sm" className="me-1" />}
              Renombrar
            </Button>
            {selected.institute && <span className="text-muted small">· {selected.institute}</span>}
            <Badge pill bg="light" text="dark">{selected.subjectCount ?? subjects.length} materias</Badge>
            <span className="ms-auto d-inline-flex gap-1">
              <Link to={`/grafo/${selected._id}`} className="btn btn-sm btn-outline-primary">Ver grafo</Link>
              <Link to={`/tablero/${selected._id}`} className="btn btn-sm btn-outline-primary">Ver tablero</Link>
            </span>
          </Card.Header>
          <Card.Body>
            <Card border="light" className="mb-4">
              <Card.Header className="d-flex align-items-center gap-2">
                <IconUpload size={16} />
                Importar correlatividades desde el PDF
                {corrLoading && <Spinner size="sm" className="ms-1" />}
              </Card.Header>
              <Card.Body>
                <Row className="align-items-start">
                  <Col md={4}>
                    <PdfDropzone
                      onFiles={(files) => {
                        const f = files[0];
                        if (f) onCorrelativas(f);
                      }}
                      disabled={corrLoading || corrSaving}
                      text="Arrastrá el plan de correlatividades acá"
                      hint="o elegí el PDF «Plan de correlatividades…» (Biotecnología, Kinesiología, Matemática, Ed. Física)"
                      multiple={false}
                    />
                  </Col>
                  <Col md={8}>
                    {corrParsed && (
                      <>
                        <div className="d-flex gap-2 align-items-center mb-2 flex-wrap">
                          <Badge bg="secondary">{corrParsed.total} en el PDF</Badge>
                          <Badge bg={corrParsed.matchedCount === corrParsed.total ? 'success' : 'primary'}>
                            {corrParsed.matchedCount} coinciden
                          </Badge>
                          {corrParsed.unresolved.length > 0 && (
                            <Badge bg="warning" text="dark">{corrParsed.unresolved.length} sin coincidencia</Badge>
                          )}
                          <span className="small text-muted ms-auto">
                            {pctMatch}% coinciden
                          </span>
                        </div>

                        <div className="mini-progress mb-2">
                          <div className="mini-progress__bar" style={{ width: `${pctMatch}%`, background: 'var(--gradify-brand)' }} />
                        </div>

                        <div className="d-flex gap-1 flex-wrap mb-2">
                          <Button size="sm" variant={corrFilter === 'todas' ? 'primary' : 'outline-secondary'} onClick={() => setCorrFilter('todas')}>
                            Todas ({corrParsed.subjects.length})
                          </Button>
                          <Button size="sm" variant={corrFilter === 'coinciden' ? 'success' : 'outline-secondary'} onClick={() => setCorrFilter('coinciden')}>
                            Coinciden ({corrParsed.matchedCount})
                          </Button>
                          <Button size="sm" variant={corrFilter === 'sin' ? 'warning' : 'outline-secondary'} onClick={() => setCorrFilter('sin')}>
                            Sin coincidencia ({corrParsed.unresolved.length})
                          </Button>
                        </div>

                        <div style={{ maxHeight: 340, overflowY: 'auto', border: '1px solid var(--bs-border-color)', borderRadius: 8 }}>
                          <Table size="sm" hover className="align-middle mb-0">
                            <thead>
                              <tr>
                                <th style={{ width: 40, position: 'sticky', top: 0, background: 'var(--bs-body-bg)', zIndex: 1 }}>N°</th>
                                <th style={{ position: 'sticky', top: 0, background: 'var(--bs-body-bg)', zIndex: 1 }}>Materia</th>
                                <th style={{ width: 90, position: 'sticky', top: 0, background: 'var(--bs-body-bg)', zIndex: 1 }}>Coincide</th>
                                <th style={{ width: 110, position: 'sticky', top: 0, background: 'var(--bs-body-bg)', zIndex: 1 }}>Código</th>
                                <th style={{ position: 'sticky', top: 0, background: 'var(--bs-body-bg)', zIndex: 1 }}>Requiere</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rowList.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="text-center text-muted py-3">
                                    No hay materias para mostrar en este filtro.
                                  </td>
                                </tr>
                              )}
                              {rowList.map((s) => {
                                const fuzzy = s.matched && s.confidence === 'fuzzy';
                                return (
                                  <tr key={s.num} className={s.matched ? '' : 'table-warning'}>
                                    <td className="text-muted">{s.num}</td>
                                    <td>
                                      <div className="fw-semibold lh-sm">{s.name}</div>
                                      {s.matched && s.dbName && s.dbName !== s.name && (
                                        <div className="small text-muted lh-sm">→ {s.dbName}</div>
                                      )}
                                    </td>
                                    <td>
                                      {s.matched ? (
                                        <Badge bg={fuzzy ? 'warning' : 'success'} text={fuzzy ? 'dark' : undefined}>
                                          {fuzzy ? 'aprox.' : 'sí'}
                                        </Badge>
                                      ) : (
                                        <Badge bg="warning" text="dark">no</Badge>
                                      )}
                                    </td>
                                    <td>
                                      {s.matched ? (
                                        <code>{s.dbCode}</code>
                                      ) : (
                                        <span className="text-muted small">{s.parsedCode}</span>
                                      )}
                                    </td>
                                    <td className="small">
                                      {s.matched && s.requires.length ? (
                                        s.requires.map((c) => {
                                          const rName = nameByCode.get(c);
                                          return (
                                            <code key={c} className="me-1" title={rName ?? c}>
                                              {rName ? `${rName} (${c})` : c}
                                            </code>
                                          );
                                        })
                                      ) : s.matched ? (
                                        <Badge bg="light" text="secondary">sin prerequisitos</Badge>
                                      ) : (
                                        '—'
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </Table>
                        </div>
                        <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="success"
                            disabled={corrSaving || corrParsed.matchedCount === 0}
                            onClick={saveCorrelativas}
                          >
                            {corrSaving && <Spinner size="sm" className="me-1" />}
                            Guardar correlatividades ({corrParsed.matchedCount})
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            disabled={corrSaving}
                            onClick={() => {
                              setCorrParsed(null);
                              setCorrFilter('todas');
                            }}
                          >
                            Descartar
                          </Button>
                          {corrParsed.partial && corrParsed.unresolved.length > 0 && (
                            <span className="small text-muted ms-auto" style={{ maxWidth: 320 }}>
                              Las materias sin coincidencia no se guardan. Revisá que el plan de estudio ya esté cargado
                              en esta carrera.
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <Row>
              <Col md={5}>
                <Card border="light" className="h-100">
                  <Card.Header className="d-flex align-items-center gap-2">
                    <IconUsers size={16} />
                    Importar tu plan personal (códigos + estados)
                  </Card.Header>
                  <Card.Body>
                    <PdfDropzone
                      onFiles={(files) => {
                        const f = files[0];
                        if (f) onPersonal(f);
                      }}
                      text="Arrastrá tu plan de estudio acá"
                      hint="o elegí el PDF con tus estados (Promocionado, Aprobado…) y códigos"
                      multiple={false}
                    />
                    {personalParsed && (
                      <div className="mt-3 d-flex align-items-center gap-3">
                        <span className="text-muted small">
                          <strong>{personalParsed.length}</strong> materias detectadas · se suman/actualizan por nombre
                        </span>
                        <Button size="sm" variant="success" disabled={saving} onClick={importPersonal}>
                          Importar
                        </Button>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>

              <Col md={7}>
                <Card border="light" className="h-100">
                  <Card.Header className="d-flex flex-wrap align-items-center gap-2">
                    <span>Correlatividades (editar / confirmar)</span>
                    <span className="ms-auto d-flex align-items-center gap-1">
                      <Badge bg="light" text="dark">{ordered.length} materias</Badge>
                      {dirtyCount > 0 && <Badge bg="warning" text="dark">{dirtyCount} cambios</Badge>}
                    </span>
                  </Card.Header>
                  <Card.Body>
                    {ordered.length === 0 && <p className="text-muted mb-0">No hay materias importadas todavía.</p>}
                    {ordered.length > 0 && (
                      <>
                        <div style={{ maxHeight: 380, overflowY: 'auto', border: '1px solid var(--bs-border-color)', borderRadius: 8 }}>
                          <Table size="sm" hover className="align-middle mb-0">
                            <thead>
                              <tr>
                                <th style={{ width: 80, position: 'sticky', top: 0, background: 'var(--bs-body-bg)', zIndex: 1 }}>Código</th>
                                <th style={{ position: 'sticky', top: 0, background: 'var(--bs-body-bg)', zIndex: 1 }}>Materia</th>
                                <th style={{ position: 'sticky', top: 0, background: 'var(--bs-body-bg)', zIndex: 1 }}>Requisitos (códigos, separados por coma)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {yearGroups.map(({ year, items }) => (
                                <Fragment key={year ?? 'sin-año'}>
                                  <tr>
                                    <td colSpan={3} style={{ background: 'var(--gradify-surface-2)', padding: '3px 10px' }}>
                                      <strong className="small text-uppercase" style={{ letterSpacing: '.04em' }}>
                                        {yearLabel(year)}
                                      </strong>
                                      <span className="text-muted small"> · {items.length} materias</span>
                                    </td>
                                  </tr>
                                  {items.map((s) => (
                                    <tr key={s._id}>
                                      <td>
                                        <code>{s.code}</code>
                                      </td>
                                      <td>
                                        <div className="fw-semibold lh-sm">{s.name}</div>
                                        <div className="small text-muted" style={{ lineHeight: 1.4 }}>
                                          {s.duration === 'A' ? 'Anual' : 'Cuatrimestral'}
                                          {s.cuatrimestre ? ` · cuat. ${s.cuatrimestre}` : ''} · {s.credits} cr
                                          {s.kind === 'ACA' && <Badge bg="warning" text="dark" className="ms-1">ACA</Badge>}
                                          {s.kind !== 'ACA' && s.optional && <Badge bg="info" className="ms-1">Optativa</Badge>}
                                          {s.intermediate && <Badge bg="success" className="ms-1">Título intermedio</Badge>}
                                        </div>
                                      </td>
                                      <td>
                                        <Form.Control
                                          size="sm"
                                          placeholder="OF005, OF006…"
                                          value={requiresDraft[s.code] ?? ''}
                                          onChange={(e) =>
                                            setRequiresDraft((d) => ({ ...d, [s.code]: e.target.value }))
                                          }
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </Fragment>
                              ))}
                            </tbody>
                          </Table>
                        </div>
                        <div className="d-flex justify-content-end mt-3">
                          <Button size="sm" variant="primary" disabled={saving} onClick={saveRequires}>
                            {saving && <Spinner size="sm" className="me-1" />}
                            Guardar correlatividades
                            {dirtyCount > 0 && <span className="ms-1">({dirtyCount})</span>}
                          </Button>
                        </div>
                      </>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      <ModalConfirm
        show={candidate !== null}
        title="Eliminar plan"
        message={candidate ? CONFIRM_DELETE(candidate.name) : ''}
        confirmLabel="Eliminar"
        loading={deleting}
        onConfirm={confirmRemove}
        onClose={() => !deleting && setCandidate(null)}
      />
    </div>
  );
}