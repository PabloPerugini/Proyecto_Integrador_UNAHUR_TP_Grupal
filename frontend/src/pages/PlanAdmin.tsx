import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiService } from '../api';
import type { ParsedSubject, ParseCorrelativasResponse, Subject } from '../types';
import { getCareerColor } from '../utils/careerColor';
import { toSubjectPayload } from '../utils/subjectMappers';
import { groupSubjectsByYear, sortSubjects, yearLabel } from '../utils/subjects';
import { useCareers } from '../hooks/useCareers';
import { useAdminActions } from '../hooks/useAdminActions';
import { useFlashMessage } from '../hooks/useFlashMessage';
import PdfDropzone from '../components/PdfDropzone';
import MessageBanner from '../components/MessageBanner';
import PageHeader from '../components/PageHeader';
import CareersTable from '../components/CareersTable';
import ModalConfirm from '../components/ModalConfirm';
import ColorDot from '../components/ColorDot';
import { IconEdit, IconUpload, IconUsers } from '../components/icons';

type SubjectDraft = {
  code: string;
  name: string;
  requires: string;
  year: string;
  cuatrimestre: string;
  duration: Subject['duration'];
  credits: string;
  kind: Subject['kind'];
  optional: boolean;
  intermediate: boolean;
};

export default function PlanAdmin() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { careers, reload } = useCareers();
  const { msg, flash, flashFromError, clear } = useFlashMessage();
  const [selectedId, setSelectedId] = useState<string | null>(id ?? null);
  const { candidate, setCandidate, deleting, publish, confirmRemove, CONFIRM_DELETE } = useAdminActions({
    reload,
    flash,
    flashFromError,
    isSelected: (cid) => selectedId === cid,
    clearSelection: () => setSelectedId(null),
    afterDelete: () => navigate('/admin'),
  });

  const [personalParsed, setPersonalParsed] = useState<ParsedSubject[] | null>(null);
  const [personalIntermediateTitle, setPersonalIntermediateTitle] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectDraft, setSubjectDraft] = useState<SubjectDraft | null>(null);
  const [subjectSaving, setSubjectSaving] = useState(false);
  const [subjectCandidate, setSubjectCandidate] = useState<Subject | null>(null);
  const [subjectDeleting, setSubjectDeleting] = useState(false);

  const [corrParsed, setCorrParsed] = useState<ParseCorrelativasResponse | null>(null);
  const [corrLoading, setCorrLoading] = useState(false);
  const [corrSaving, setCorrSaving] = useState(false);
  const [corrFilter, setCorrFilter] = useState<'todas' | 'coinciden' | 'sin'>('todas');

  const [nameDraft, setNameDraft] = useState('');
  const [renaming, setRenaming] = useState(false);

  const draftRequires = useMemo(
    () => Array.from(new Set(
      (subjectDraft?.requires ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    )),
    [subjectDraft?.requires],
  );
  const invalidDraftRequires = useMemo(() => {
    if (!subjectDraft || !editingSubject) return [];
    const validCodes = new Set(
      subjects
        .map((subject) => subject.code)
        .filter((code) => code !== editingSubject.code && code !== subjectDraft.code.trim()),
    );
    return draftRequires.filter((code) => !validCodes.has(code));
  }, [draftRequires, editingSubject, subjectDraft, subjects]);

  useEffect(() => {
    if (id) setSelectedId(id);
  }, [id]);

  const reloadSubjects = useCallback(
    async (careerId: string) => {
      const s = await apiService.getSubjects(careerId);
      setSubjects(s);
    },
    [],
  );

  useEffect(() => {
    if (!selectedId) {
      setSubjects([]);
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

  const startEditSubject = (subject: Subject) => {
    setEditingSubject(subject);
    setSubjectDraft({
      code: subject.code,
      name: subject.name,
      requires: (subject.requires || []).join(', '),
      year: subject.year == null ? '' : String(subject.year),
      cuatrimestre: subject.cuatrimestre == null ? '' : String(subject.cuatrimestre),
      duration: subject.duration,
      credits: String(subject.credits),
      kind: subject.kind,
      optional: subject.optional,
      intermediate: !!subject.intermediate,
    });
  };

  const saveSubject = async () => {
    if (!selectedId || !editingSubject || !subjectDraft) return;
    const code = subjectDraft.code.trim();
    const name = subjectDraft.name.trim();
    const requires = Array.from(new Set(
      subjectDraft.requires
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    ));
    const year = subjectDraft.year === '' ? null : Number(subjectDraft.year);
    const cuatrimestre = subjectDraft.cuatrimestre === '' ? null : Number(subjectDraft.cuatrimestre);
    const credits = Number(subjectDraft.credits);
    if (!code || !name) {
      flash('warning', 'El código y el nombre de la materia son obligatorios.');
      return;
    }
    if (invalidDraftRequires.length) {
      flash('warning', `Hay códigos de correlativas inexistentes o no válidos: ${invalidDraftRequires.join(', ')}`);
      return;
    }
    if (!Number.isFinite(credits) || credits < 0) {
      flash('warning', 'Los créditos deben ser un número mayor o igual a 0.');
      return;
    }
    if (year !== null && (!Number.isInteger(year) || year < 1)) {
      flash('warning', 'El año debe ser un entero mayor o igual a 1.');
      return;
    }
    if (cuatrimestre !== null && (!Number.isInteger(cuatrimestre) || cuatrimestre < 1 || cuatrimestre > 2)) {
      flash('warning', 'El cuatrimestre debe ser 1 o 2.');
      return;
    }

    setSubjectSaving(true);
    try {
      await apiService.updateSubject(selectedId, editingSubject._id, {
        code,
        name,
        requires,
        year,
        cuatrimestre,
        duration: subjectDraft.duration,
        credits,
        kind: subjectDraft.kind,
        optional: subjectDraft.optional,
        intermediate: subjectDraft.intermediate,
      });
      flash('success', `Materia "${name}" actualizada.`);
      setEditingSubject(null);
      setSubjectDraft(null);
      await reloadSubjects(selectedId);
      await reload();
    } catch (err) {
      flashFromError(err, 'Error actualizando la materia');
    } finally {
      setSubjectSaving(false);
    }
  };

  const deleteSubject = async () => {
    if (!selectedId || !subjectCandidate) return;
    setSubjectDeleting(true);
    try {
      await apiService.deleteSubject(selectedId, subjectCandidate._id);
      flash('success', `Materia "${subjectCandidate.name}" eliminada.`);
      setSubjectCandidate(null);
      await reloadSubjects(selectedId);
      await reload();
    } catch (err) {
      flashFromError(err, 'Error eliminando la materia');
    } finally {
      setSubjectDeleting(false);
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

  const onCorrelativas = async (file: File) => {
    if (!selectedId) return;
    setCorrLoading(true);
    setCorrParsed(null);
    try {
      const r = await apiService.parseCorrelativas(selectedId, file);
      setCorrParsed(r);
      const aiMsg =
        r.aiFallback && (r.aiSuggested?.length ?? 0) > 0
          ? ` La IA (${r.aiProvider ?? 'IA'}) propone ${r.aiSuggested!.length} mapeos para revisar antes de guardar.`
          : '';
      flash(
        r.partial && r.matchedCount > 0 ? 'warning' : r.partial ? 'danger' : 'success',
        `${r.total} materias leídas del PDF · ${r.matchedCount} reconocidas en la carrera.${aiMsg}`,
      );
    } catch (err) {
      flashFromError(err, 'Error leyendo las correlatividades');
    } finally {
      setCorrLoading(false);
    }
  };

  const doSaveCorrelativas = async (
    payload: { code: string; name: string; requires: string[] }[],
    emptyMsg: string,
  ) => {
    if (!selectedId || !corrParsed) return;
    if (!payload.length) {
      flash('warning', emptyMsg);
      return;
    }
    setCorrSaving(true);
    try {
      const r = await apiService.saveCorrelativas(selectedId, payload);
      const droppedMsg = r.dropped?.length
        ? ` Se descartaron ${r.dropped.length} correlativas inválidas (códigos inexistentes o ciclos).`
        : '';
      flash('success', `Correlatividades guardadas en ${r.saved} materias (${r.total} en total).${droppedMsg}`);
      setCorrParsed(null);
      await reloadSubjects(selectedId);
    } catch (err) {
      flashFromError(err, 'Error guardando las correlatividades');
    } finally {
      setCorrSaving(false);
    }
  };

  const saveCorrelativas = async () => {
    if (!corrParsed) return;
    await doSaveCorrelativas(
      corrParsed.subjects
        .filter((s) => s.matched && s.dbCode)
        .map((s) => ({ code: s.dbCode!, name: s.dbName || s.name, requires: s.requires })),
      'No hay materias con coincidencia para guardar.',
    );
  };

  // Sugerencias de IA: acción explícita de revisión (nunca se guardan solas).
  const saveAiSuggested = async () => {
    if (!corrParsed?.aiSuggested?.length) return;
    await doSaveCorrelativas(
      corrParsed.aiSuggested.map((s) => ({
        code: s.code,
        name: nameByCode.get(s.code) || s.code,
        requires: s.requires,
      })),
      'No hay sugerencias de IA para guardar.',
    );
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
                          {(corrParsed.aiSuggested?.length ?? 0) > 0 && (
                            <Button
                              size="sm"
                              variant="outline-warning"
                              disabled={corrSaving}
                              onClick={saveAiSuggested}
                              title="Solo incluye coincidencias exactas resueltas contra la base. Las difusas quedan abajo para revisión."
                            >
                              {corrSaving && <Spinner size="sm" className="me-1" />}
                              Aplicar sugerencias de IA ({corrParsed.aiSuggested!.length})
                            </Button>
                          )}
                          {(corrParsed.aiReview?.length ?? 0) > 0 && (
                            <span className="small text-muted ms-auto" style={{ maxWidth: 340 }}>
                              {corrParsed.aiReview!.length} para revisión (coincidencia aproximada):{' '}
                              {corrParsed.aiReview!.slice(0, 4).map((r) => (
                                <span key={r.code ?? r.subject} title={r.evidence ?? r.subject}>
                                  {r.subject}
                                  {'; '}
                                </span>
                              ))}
                              {(corrParsed.aiReview!.length > 4) && '…'}
                            </span>
                          )}
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
                                <th style={{ position: 'sticky', top: 0, background: 'var(--bs-body-bg)', zIndex: 1 }}>Requisitos</th>
                                <th style={{ width: 112, position: 'sticky', top: 0, background: 'var(--bs-body-bg)', zIndex: 1 }}>Acciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {yearGroups.map(({ year, items }) => (
                                <Fragment key={year ?? 'sin-año'}>
                                  <tr>
                                    <td colSpan={4} style={{ background: 'var(--gradify-surface-2)', padding: '3px 10px' }}>
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
                                        {(s.requires || []).length > 0 ? s.requires.join(', ') : '-'}
                                      </td>
                                      <td>
                                        <div className="d-flex gap-1">
                                          <Button
                                            size="sm"
                                            variant="outline-primary"
                                            title="Editar materia"
                                            aria-label={`Editar ${s.name}`}
                                            onClick={() => startEditSubject(s)}
                                          >
                                            <IconEdit size={14} />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline-danger"
                                            title="Eliminar materia"
                                            aria-label={`Eliminar ${s.name}`}
                                            onClick={() => setSubjectCandidate(s)}
                                          >
                                            Eliminar
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </Fragment>
                              ))}
                            </tbody>
                          </Table>
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

      <Modal
        show={editingSubject !== null && subjectDraft !== null}
        onHide={() => {
          if (!subjectSaving) {
            setEditingSubject(null);
            setSubjectDraft(null);
          }
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">Editar materia</Modal.Title>
        </Modal.Header>
        {subjectDraft && (
          <Modal.Body>
            <Row className="g-3">
              <Col sm={6}>
                <Form.Label>Código</Form.Label>
                <Form.Control
                  value={subjectDraft.code}
                  onChange={(e) => setSubjectDraft((d) => d && { ...d, code: e.target.value })}
                />
              </Col>
              <Col sm={6}>
                <Form.Label>Nombre</Form.Label>
                <Form.Control
                  value={subjectDraft.name}
                  onChange={(e) => setSubjectDraft((d) => d && { ...d, name: e.target.value })}
                />
              </Col>
              <Col sm={12}>
                <Form.Label>Correlativas</Form.Label>
                <Form.Control
                  value={subjectDraft.requires}
                  placeholder="1, 2, 3"
                  isInvalid={invalidDraftRequires.length > 0}
                  onChange={(e) => setSubjectDraft((d) => d && { ...d, requires: e.target.value })}
                />
                <Form.Text className="text-muted">
                  Ingresá los códigos separados por comas. Dejá vacío si no tiene requisitos.
                </Form.Text>
                {invalidDraftRequires.length > 0 && (
                  <Form.Control.Feedback type="invalid">
                    Código inexistente o no válido: {invalidDraftRequires.join(', ')}
                  </Form.Control.Feedback>
                )}
              </Col>
              <Col sm={6}>
                <Form.Label>Año</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  value={subjectDraft.year}
                  onChange={(e) => setSubjectDraft((d) => d && { ...d, year: e.target.value })}
                />
              </Col>
              <Col sm={6}>
                <Form.Label>Cuatrimestre</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  max={2}
                  value={subjectDraft.cuatrimestre}
                  onChange={(e) => setSubjectDraft((d) => d && { ...d, cuatrimestre: e.target.value })}
                />
              </Col>
              <Col sm={6}>
                <Form.Label>Duración</Form.Label>
                <Form.Select
                  value={subjectDraft.duration}
                  onChange={(e) => setSubjectDraft((d) => d && { ...d, duration: e.target.value as Subject['duration'] })}
                >
                  <option value="C">Cuatrimestral</option>
                  <option value="A">Anual</option>
                  <option value="TF">Trabajo final</option>
                </Form.Select>
              </Col>
              <Col sm={6}>
                <Form.Label>Créditos</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  step="any"
                  value={subjectDraft.credits}
                  onChange={(e) => setSubjectDraft((d) => d && { ...d, credits: e.target.value })}
                />
              </Col>
              <Col sm={6}>
                <Form.Label>Tipo</Form.Label>
                <Form.Select
                  value={subjectDraft.kind}
                  onChange={(e) => setSubjectDraft((d) => d && { ...d, kind: e.target.value as Subject['kind'] })}
                >
                  <option value="Materia">Materia</option>
                  <option value="ACA">ACA</option>
                  <option value="AU">AU</option>
                  <option value="OTRA">Otra</option>
                </Form.Select>
              </Col>
              <Col sm={6} className="d-flex flex-column justify-content-end">
                <Form.Check
                  type="checkbox"
                  label="Optativa"
                  checked={subjectDraft.optional}
                  onChange={(e) => setSubjectDraft((d) => d && { ...d, optional: e.target.checked })}
                />
                <Form.Check
                  type="checkbox"
                  label="Integra título intermedio"
                  checked={subjectDraft.intermediate}
                  onChange={(e) => setSubjectDraft((d) => d && { ...d, intermediate: e.target.checked })}
                />
              </Col>
            </Row>
          </Modal.Body>
        )}
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => {
              setEditingSubject(null);
              setSubjectDraft(null);
            }}
            disabled={subjectSaving}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={saveSubject}
            disabled={subjectSaving || invalidDraftRequires.length > 0}
          >
            {subjectSaving && <Spinner size="sm" className="me-1" />}
            Guardar cambios
          </Button>
        </Modal.Footer>
      </Modal>

      <ModalConfirm
        show={candidate !== null}
        title="Eliminar plan"
        message={candidate ? CONFIRM_DELETE(candidate.name) : ''}
        confirmLabel="Eliminar"
        loading={deleting}
        onConfirm={confirmRemove}
        onClose={() => !deleting && setCandidate(null)}
      />
      <ModalConfirm
        show={subjectCandidate !== null}
        title="Eliminar materia"
        message={subjectCandidate ? `¿Querés eliminar "${subjectCandidate.name}" (${subjectCandidate.code})? Esta acción no se puede deshacer.` : ''}
        confirmLabel="Eliminar"
        loading={subjectDeleting}
        onConfirm={deleteSubject}
        onClose={() => !subjectDeleting && setSubjectCandidate(null)}
      />
    </div>
  );
}