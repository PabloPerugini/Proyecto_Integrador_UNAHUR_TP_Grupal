
import { useState } from 'react';
import { Button, Card, Form, Table } from 'react-bootstrap';

import { request, uploadPdf } from '../api/client';
import { careerNameFromFilename } from '../utils/careerName';

import { useCareers } from '../hooks/useCareers';
import { useFlashMessage } from '../hooks/useFlashMessage';

import PdfDropzone from '../components/PdfDropzone';
import MessageBanner from '../components/MessageBanner';
import PageHeader from '../components/PageHeader';
import ImportJobList from '../components/ImportJobList';
import AdminCatalog from '../components/AdminCatalog';
import SavedPlansPanel from '../components/SavedPlansPanel';

import { makeJobId } from '../utils/importJobs';

import type { ImportJob } from '../components/ImportJobList';

// ===========================================
// TIPOS
// ===========================================

interface PreviewSubject {
  name: string;
  code?: string;

  year?: number | null;
  cuatrimestre?: number | null;
  period?: number | null;

  duration?: string;

  hours?: Record<string, number | null>;

  credits?: number;

  kind?: string;
  generic?: string | null;

  optional?: boolean;
  intermediate?: boolean;

  correlativasTexto?: string | null;
  requires?: string[];
}

interface PreviewResponse {
  sourceKind: string;

  subjects: PreviewSubject[];
  detectedCount: number;

  intermediateTitle?: string | null;
  creditsFinal?: number;
  creditsIntermediate?: number;

  aiFallback?: boolean;
  aiProvider?: string | null;

  cached: boolean;
  fileHash: string;
}

interface ConfirmResponse {
  message: string;
  studyPlanId: string;
  planImportId: string;
  name: string;
  status: string;
  saved: number;
}

interface PreviewEntry {
  fileName: string;

  result: PreviewResponse;
  subjects: PreviewSubject[];

  planName: string;
  careerId: string;

  saving: boolean;
  saved?: ConfirmResponse;
}

const JOB_STATUS_LABEL: Record<
  'creando' | 'parseando' | 'guardando',
  string
> = {
  creando: 'Preparando…',
  parseando: 'Analizando PDF…',
  guardando: 'Preparando vista previa…',
};

// ===========================================
// NORMALIZAR NOMBRES PARA COMPARAR
// ===========================================

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// ===========================================
// COMPONENTE
// ===========================================

export default function UploadPlan() {

  const { careers, reload } = useCareers();

  const {
    msg,
    flash,
    flashFromError,
    clear,
  } = useFlashMessage();

  const [savedPlansVersion, setSavedPlansVersion] = useState(0);

  const [jobs, setJobs] = useState<ImportJob[]>([]);

  const [previews, setPreviews] = useState<
    Record<string, PreviewEntry>
  >({});

  // ===========================================
  // DETERMINAR CARRERA AUTOMATICAMENTE
  // ===========================================

  const resolveCareerId = (preview: PreviewEntry) => {
    // Si el administrador ya eligió una carrera,
    // respetamos esa selección.
    if (
      preview.careerId &&
      careers.some(
        (career) => career._id === preview.careerId
      )
    ) {
      return preview.careerId;
    }

    // Si solamente existe una carrera,
    // seleccionarla automáticamente.
    if (careers.length === 1) {
      return careers[0]._id;
    }

    // Si existen varias carreras,
    // intentar encontrar una coincidencia
    // con el nombre del PDF.
    const detectedName = normalizeName(
      careerNameFromFilename(preview.fileName)
    );

    const matches = careers.filter(
      (career) =>
        normalizeName(career.name) === detectedName
    );

    // Solo seleccionar automáticamente
    // si la coincidencia es inequívoca.
    if (matches.length === 1) {
      return matches[0]._id;
    }

    return '';
  };

  // ===========================================
  // ANALIZAR PDF
  // ===========================================

  const importOfficial = async (file: File) => {
    const id = makeJobId(file.name);

    setJobs((previous) => [
      ...previous,
      {
        id,
        file: file.name,
        status: 'parseando',
      },
    ]);

    try {
      const parsed = await uploadPdf<PreviewResponse>(
        '/plan-imports/preview',
        file
      );

      if (
        !Array.isArray(parsed.subjects) ||
        parsed.subjects.length === 0
      ) {
        throw new Error(
          'No se pudieron detectar materias o el PDF continúa procesándose.'
        );
      }

      setPreviews((previous) => ({
        ...previous,
        [id]: {
          fileName: file.name,
          result: parsed,

          subjects: parsed.subjects.map(
            (subject) => ({ ...subject })
          ),

          // El nombre del plan puede editarse.
          planName: 'Plan de estudios',

          careerId: '',
          saving: false,
        },
      }));

      setJobs((previous) =>
        previous.map((job) =>
          job.id === id
            ? {
                ...job,
                status: 'listo',
                careerName:
                  careerNameFromFilename(file.name),
                count: parsed.detectedCount,
              }
            : job
        )
      );

      if (parsed.cached) {
        flash(
          'info',
          `Se reutilizó la caché: ${parsed.detectedCount} materias.`
        );
      } else if (parsed.aiFallback) {
        flash(
          'warning',
          `Se detectaron ${parsed.detectedCount} materias con ayuda de IA. Revisá los resultados.`
        );
      } else {
        flash(
          'success',
          `Se detectaron ${parsed.detectedCount} materias.`
        );
      }
    } catch (error) {
      setJobs((previous) =>
        previous.map((job) =>
          job.id === id
            ? {
                ...job,
                status: 'error',
                error:
                  error instanceof Error
                    ? error.message
                    : 'Error al analizar PDF',
              }
            : job
        )
      );

      flashFromError(
        error,
        `Error con ${file.name}`
      );
    }
  };

  // ===========================================
  // SUBIR ARCHIVOS
  // ===========================================

  const onFiles = (files: File[]) => {
    files.forEach((file) => {
      void importOfficial(file);
    });
  };

  // ===========================================
  // EDITAR VISTA PREVIA
  // ===========================================

  const updatePreview = (
    id: string,
    changes: Partial<PreviewEntry>
  ) => {
    setPreviews((previous) => {
      const current = previous[id];

      if (!current || current.saved || current.saving) {
        return previous;
      }

      return {
        ...previous,
        [id]: {
          ...current,
          ...changes,
        },
      };
    });
  };

  // ===========================================
  // EDITAR MATERIA
  // ===========================================

  const updateSubject = (
    id: string,
    index: number,
    changes: Partial<PreviewSubject>
  ) => {
    setPreviews((previous) => {
      const current = previous[id];

      if (!current || current.saved || current.saving) {
        return previous;
      }

      const subjects = current.subjects.map(
        (subject, subjectIndex) =>
          subjectIndex === index
            ? { ...subject, ...changes }
            : subject
      );

      return {
        ...previous,
        [id]: {
          ...current,
          subjects,
        },
      };
    });
  };

  // ===========================================
  // GUARDAR PLAN EN MONGODB
  // ===========================================

  const savePlan = async (id: string) => {
    const preview = previews[id];

    if (!preview || preview.saving || preview.saved) {
      return;
    }

    const careerId = resolveCareerId(preview);

    if (!careerId) {
      flash(
        'warning',
        'Primero creá o seleccioná una carrera.'
      );
      return;
    }

    if (!preview.planName.trim()) {
      flash(
        'warning',
        'Escribí un nombre para el plan.'
      );
      return;
    }

    setPreviews((previous) => ({
      ...previous,
      [id]: {
        ...previous[id],
        saving: true,
      },
    }));

    try {
      const saved = await request<ConfirmResponse>(
        '/plan-imports/confirm',
        {
          method: 'POST',
          body: JSON.stringify({
            fileHash: preview.result.fileHash,
            fileName: preview.fileName,

            // Carrera seleccionada automáticamente
            // o elegida por el administrador.
            careerId,

            name: preview.planName.trim(),

            subjects: preview.subjects,

            creditsFinal:
              preview.result.creditsFinal ?? 0,

            creditsIntermediate:
              preview.result.creditsIntermediate ?? 0,

            intermediateTitle:
              preview.result.intermediateTitle ?? null,
          }),
        }
      );

      setPreviews((previous) => ({
        ...previous,
        [id]: {
          ...previous[id],
          saving: false,
          saved,
        },
      }));

      flash(
        'success',
        `Plan guardado correctamente con ${saved.saved} materias.`
      );

      await reload();
      setSavedPlansVersion(v => v + 1);
    } catch (error) {
      setPreviews((previous) => ({
        ...previous,
        [id]: {
          ...previous[id],
          saving: false,
        },
      }));

      flashFromError(
        error,
        'No se pudo guardar el plan'
      );
    }
  };

  // ===========================================
  // MOSTRAR IMPORTACION TERMINADA
  // ===========================================

  const renderReady = (job: ImportJob) => (
    <div>
      <span className="text-success">
        <strong>
          {job.careerName ?? job.file}
        </strong>

        {' · '}

        {job.count ?? 0} materias detectadas
      </span>
    </div>
  );

  // ===========================================
  // INTERFAZ
  // ===========================================

  return (
    <div>
      <PageHeader
        title="Cargar plan de estudios"
        sub="Administrá universidades y carreras, subí un PDF, revisá las materias y guardá el plan."
      />

      <MessageBanner
        message={msg}
        onClose={clear}
      />

      {/* ADMINISTRACIÓN */}

      <AdminCatalog onCareerCreated={reload} />

      {/* SUBIR PDF */}

      <Card className="mb-4">
        <Card.Header>
          <strong>
            Importar plan de estudios (PDF)
          </strong>
        </Card.Header>

        <Card.Body>
          <PdfDropzone
            onFiles={onFiles}
            multiple
          />

          <ImportJobList
            jobs={jobs}
            labels={JOB_STATUS_LABEL}
            renderReady={renderReady}
          />
        </Card.Body>
      </Card>

      {/* VISTAS PREVIAS */}

      {Object.entries(previews).map(([id, preview]) => {
        const careerId = resolveCareerId(preview);

        const selectedCareer = careers.find(
          (career) => career._id === careerId
        );

        return (
          <Card className="mb-4" key={id}>
            <Card.Header className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <strong>{preview.fileName}</strong>

              <span
                className={
                  preview.result.cached
                    ? 'badge bg-info'
                    : 'badge bg-success'
                }
              >
                {preview.result.cached
                  ? 'Desde caché'
                  : 'PDF analizado'}
              </span>
            </Card.Header>

            <Card.Body>
              {/* RESULTADOS */}

              <p>
                <strong>Materias detectadas:</strong>{' '}
                {preview.subjects.length}
              </p>

              {preview.result.aiFallback && (
                <p className="text-warning">
                  Se utilizó inteligencia artificial.
                  Revisá las materias antes de guardar.
                </p>
              )}

              {/* TABLA EDITABLE */}

              <div className="table-responsive">
                <Table
                  striped
                  bordered
                  hover
                  size="sm"
                >
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Código</th>
                      <th>Materia</th>
                      <th>Año</th>
                      <th>Cuatrimestre</th>
                      <th>Correlatividades</th>
                    </tr>
                  </thead>

                  <tbody>
                    {preview.subjects.map(
                      (subject, index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>

                          <td>
                            <Form.Control
                              size="sm"
                              value={subject.code ?? ''}
                              disabled={
                                preview.saving ||
                                Boolean(preview.saved)
                              }
                              onChange={(event) =>
                                updateSubject(
                                  id,
                                  index,
                                  {
                                    code: event.target.value,
                                  }
                                )
                              }
                            />
                          </td>

                          <td style={{ minWidth: 230 }}>
                            <Form.Control
                              size="sm"
                              value={subject.name}
                              disabled={
                                preview.saving ||
                                Boolean(preview.saved)
                              }
                              onChange={(event) =>
                                updateSubject(
                                  id,
                                  index,
                                  {
                                    name: event.target.value,
                                  }
                                )
                              }
                            />
                          </td>

                          <td style={{ minWidth: 85 }}>
                            <Form.Control
                              type="number"
                              size="sm"
                              min={1}
                              max={20}
                              value={subject.year ?? ''}
                              disabled={
                                preview.saving ||
                                Boolean(preview.saved)
                              }
                              onChange={(event) =>
                                updateSubject(
                                  id,
                                  index,
                                  {
                                    year: event.target.value
                                      ? Number(event.target.value)
                                      : null,
                                  }
                                )
                              }
                            />
                          </td>

                          <td style={{ minWidth: 95 }}>
                            <Form.Control
                              type="number"
                              size="sm"
                              min={1}
                              max={12}
                              value={
                                subject.period ??
                                subject.cuatrimestre ??
                                ''
                              }
                              disabled={
                                preview.saving ||
                                Boolean(preview.saved)
                              }
                              onChange={(event) => {
                                const period = event.target.value
                                  ? Number(event.target.value)
                                  : null;

                                updateSubject(
                                  id,
                                  index,
                                  {
                                    period,
                                    cuatrimestre: period,
                                  }
                                );
                              }}
                            />
                          </td>

                          <td style={{ minWidth: 180 }}>
                            <small>
                              {subject.correlativasTexto ||
                                subject.requires?.join(', ') ||
                                '—'}
                            </small>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </Table>
              </div>

              {/* GUARDADO EXITOSO */}

              {preview.saved ? (
                <div
                  className="alert alert-success mt-3"
                  role="status"
                >
                  <strong>
                    Plan guardado correctamente.
                  </strong>

                  <div>
                    {preview.saved.saved} materias
                    guardadas como borrador.
                  </div>

                  <small>
                    ID del plan:{' '}
                    {preview.saved.studyPlanId}
                  </small>
                </div>
              ) : (
                // =================================
                // GUARDAR PLAN SIMPLIFICADO
                // =================================

                <div className="border rounded p-3 mt-3">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">
                      Guardar plan
                    </h5>

                    <span className="badge bg-secondary">
                      Borrador
                    </span>
                  </div>

                  {/* NOMBRE DEL PLAN */}

                  <Form.Group className="mb-3">
                    <Form.Label>
                      Nombre del plan
                    </Form.Label>

                    <Form.Control
                      value={preview.planName}
                      placeholder="Ejemplo: Plan 2024"
                      disabled={preview.saving}
                      onChange={(event) =>
                        updatePreview(id, {
                          planName: event.target.value,
                        })
                      }
                    />
                  </Form.Group>

                  {/* SIN CARRERAS */}

                  {careers.length === 0 && (
                    <div className="alert alert-warning">
                      Todavía no hay carreras registradas.
                      Creá una universidad y una carrera
                      desde el panel superior.
                    </div>
                  )}

                  {/* UNA SOLA CARRERA:
                      SELECCION AUTOMATICA */}

                  {careers.length === 1 &&
                    selectedCareer && (
                      <p className="text-muted small mb-3">
                        <strong>Carrera:</strong>{' '}
                        {selectedCareer.name}
                        {' '}
                        <span className="text-success">
                          (seleccionada automáticamente)
                        </span>
                      </p>
                    )}

                  {/* VARIAS CARRERAS:
                      PERMITIR ELEGIR O CAMBIAR */}

                  {careers.length > 1 && (
                    <Form.Group className="mb-3">
                      <Form.Label>
                        Carrera
                      </Form.Label>

                      <Form.Select
                        value={careerId}
                        disabled={preview.saving}
                        onChange={(event) =>
                          updatePreview(id, {
                            careerId: event.target.value,
                          })
                        }
                      >
                        <option value="">
                          Seleccionar carrera...
                        </option>

                        {careers.map((career) => (
                          <option
                            key={career._id}
                            value={career._id}
                          >
                            {career.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  )}

                  <p className="text-muted small">
                    Las materias se guardarán como
                    borrador personal. Las
                    correlatividades detectadas
                    todavía no se vincularán
                    automáticamente en el grafo.
                  </p>

                  {/* BOTÓN GUARDAR */}

                  <Button
                    className="btn-gradify"
                    disabled={
                      preview.saving ||
                      !careerId ||
                      !preview.planName.trim()
                    }
                    onClick={() => void savePlan(id)}
                  >
                    {preview.saving
                      ? 'Guardando...'
                      : 'Guardar plan'}
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        );
      })}

      {/* Los planes reales pertenecen a StudyPlan, no a Career. */}
      <SavedPlansPanel refreshKey={savedPlansVersion} />
    </div>
  );
}
