import { useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { apiService } from '../api';
import type { Career } from '../types';
import { deriveCareerColor } from '../utils/careerColor';
import { careerNameFromFilename, instituteFromCareer } from '../utils/careerName';
import { toSubjectPayload } from '../utils/subjectMappers';
import { useCareers } from '../hooks/useCareers';
import { useFlashMessage } from '../hooks/useFlashMessage';
import PdfDropzone from '../components/PdfDropzone';
import MessageBanner from '../components/MessageBanner';
import PageHeader from '../components/PageHeader';
import ImportJobList from '../components/ImportJobList';
import CareersTable from '../components/CareersTable';
import ModalConfirm from '../components/ModalConfirm';
import type { ImportJob } from '../components/ImportJobList';

const JOB_STATUS_LABEL: Record<'creando' | 'parseando' | 'guardando', string> = {
  creando: 'Creando la carrera…',
  parseando: 'Leyendo el PDF…',
  guardando: 'Guardando materias…',
};

const CONFIRM_DELETE = (name: string) =>
  `¿Eliminar el plan "${name}"? Se borrarán también todas sus materias y el avance de los usuarios. Esta acción no se puede deshacer.`;

export default function UploadPlan() {
  const { careers, reload } = useCareers();
  const { msg, flash, flashFromError, clear } = useFlashMessage();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [candidate, setCandidate] = useState<Career | null>(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const importOfficial = async (file: File) => {
    const id = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setJobs((j) => [...j, { id, file: file.name, status: 'creando' }]);
    try {
      const name = careerNameFromFilename(file.name);
      const institute = instituteFromCareer(name);
      const career = await apiService.create({
        name,
        institute,
        color: deriveCareerColor(institute, name),
        durationYears: 5,
      });
      const reused = career.reused === true;

      setJobs((j) => j.map((x) => (x.id === id ? { ...x, status: 'parseando' } : x)));
      const parsed = await apiService.parseOfficial(career._id, file);

      if (!parsed.subjects.length) {
        setJobs((j) =>
          j.map((x) =>
            x.id === id
              ? { ...x, status: 'error', error: 'No se pudo leer texto del PDF (parece escaneado). Quedó creada vacía para importar el plan personal.' }
              : x,
          ),
        );
        flash('info', `"${career.name}" creada pero el PDF no tenía texto extraíble.`);
        await reload();
        return;
      }

      setJobs((j) => j.map((x) => (x.id === id ? { ...x, status: 'guardando' } : x)));
      await apiService.saveSubjects(
        career._id,
        parsed.subjects.map(toSubjectPayload),
        parsed.intermediateTitle ?? null,
        parsed.creditsFinal,
        parsed.creditsIntermediate,
      );

      setJobs((j) =>
        j.map((x) =>
          x.id === id
            ? { ...x, status: 'listo', careerName: career.name, careerId: career._id, count: parsed.detectedCount }
            : x,
        ),
      );
      setSelectedId(career._id);
      flash(
        reused ? 'warning' : parsed.detectedCount ? 'success' : 'info',
        reused
          ? `"${career.name}" ya existía: se reimportó el PDF y se actualizaron sus materias (${parsed.detectedCount}).`
          : `"${career.name}" generada automáticamente con ${parsed.detectedCount} materias.`,
      );
      await reload();
    } catch (err) {
      setJobs((j) => j.map((x) => (x.id === id ? { ...x, status: 'error', error: err instanceof Error ? err.message : 'Error' } : x)));
      flashFromError(err, `Error con ${file.name}`);
    }
  };

  const onFiles = (files: File[]) => {
    files.forEach((f) => void importOfficial(f));
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

  const confirmRemove = async () => {
    if (!candidate) return;
    setDeleting(true);
    try {
      await apiService.deleteCareer(candidate._id);
      if (selectedId === candidate._id) setSelectedId(null);
      flash('success', `Plan "${candidate.name}" eliminado`);
      setCandidate(null);
      await reload();
    } catch (err) {
      flashFromError(err, 'Error eliminando el plan');
    } finally {
      setDeleting(false);
    }
  };

  const renderReady = (j: ImportJob) => (
    <>
      <span className="text-success">
        <strong>{j.careerName ?? j.file}</strong> · {j.count} materias
      </span>
      {j.careerId && (
        <span className="d-inline-flex gap-1">
          <Link to={`/grafo/${j.careerId}`}>ver grafo</Link>
          <Link to={`/tablero/${j.careerId}`}>ver tablero</Link>
          <Link to={`/admin/${j.careerId}`}>editar</Link>
        </span>
      )}
    </>
  );

  return (
    <div>
      <PageHeader
        title="Cargar plan de estudios"
        sub={
          <>
            Subí el PDF del plan oficial de una carrera. A partir del PDF se genera el plan, y después podés
            editarlo o publicarlo desde <Link to="/admin">Editar plan</Link>.
          </>
        }
      />
      <MessageBanner message={msg} onClose={clear} />

      <Card className="mb-4">
        <Card.Header>Importar plan de estudios (PDF)</Card.Header>
        <Card.Body>
          <PdfDropzone onFiles={onFiles} multiple />
          <ImportJobList jobs={jobs} labels={JOB_STATUS_LABEL} renderReady={renderReady} />
        </Card.Body>
      </Card>

      <Card className="mb-4">
        <Card.Header>Carreras generadas</Card.Header>
        <Card.Body>
          <CareersTable
            careers={careers}
            selectedId={selectedId}
            onSelect={(c) => setSelectedId(c._id)}
            emptyText={
              <p className="text-muted mb-0">Subí un PDF arriba para generar tu primera carrera.</p>
            }
            actions={(c) => (
              <>
                {c.status !== 'published' && (
                  <Button size="sm" variant="outline-success" onClick={() => publish(c._id)}>Publicar</Button>
                )}{' '}
                <Button size="sm" variant="outline-primary" onClick={() => navigate(`/admin/${c._id}`)}>Editar</Button>{' '}
                <Button size="sm" variant="outline-secondary" onClick={() => navigate(`/grafo/${c._id}`)}>Grafo</Button>{' '}
                <Button size="sm" variant="outline-danger" onClick={() => setCandidate(c)}>Eliminar</Button>
              </>
            )}
          />
        </Card.Body>
      </Card>

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