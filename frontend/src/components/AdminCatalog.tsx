
import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';

import {
  Alert,
  Button,
  Card,
  Form,
} from 'react-bootstrap';

import { request } from '../api/client';
import { careersApi } from '../api/careers';
import type { Career } from '../types';

interface University {
  _id: string;
  name: string;
  description?: string;
}

interface AdminCatalogProps {
  onCareerCreated: () => Promise<unknown> | void;
}

export default function AdminCatalog({
  onCareerCreated,
}: AdminCatalogProps) {
  const [universities, setUniversities] = useState<
    University[]
  >([]);

  const [universityName, setUniversityName] =
    useState('');

  const [
    universityDescription,
    setUniversityDescription,
  ] = useState('');

  const [selectedUniversityId, setSelectedUniversityId] =
    useState('');

  const [careerName, setCareerName] = useState('');
  const [careerDescription, setCareerDescription] =
    useState('');

  const [loading, setLoading] = useState(true);
  const [creatingUniversity, setCreatingUniversity] =
    useState(false);
  const [creatingCareer, setCreatingCareer] =
    useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [allCareers, setAllCareers] = useState<Career[]>([]);
  const [articCareerId, setArticCareerId] = useState('');
  const [articChecked, setArticChecked] = useState<string[]>([]);
  const [savingArtic, setSavingArtic] = useState(false);

  const loadCareersForArtic = async () => {
    try {
      const list = await careersApi.getAll();
      setAllCareers(Array.isArray(list) ? list : []);
    } catch {
      // se informa al guardar
    }
  };

  useEffect(() => {
    void loadCareersForArtic();
  }, []);

  useEffect(() => {
    const found = allCareers.find((c) => c._id === articCareerId);
    setArticChecked(
      (found?.continuesIn ?? []).map((c) =>
        typeof c === 'string' ? c : c._id,
      ),
    );
  }, [articCareerId, allCareers]);

  const toggleArtic = (id: string) => {
    setArticChecked((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id],
    );
  };

  const saveArticulation = async () => {
    if (!articCareerId || savingArtic) return;
    setError('');
    setMessage('');
    setSavingArtic(true);
    try {
      await careersApi.update(articCareerId, {
        continuesIn: articChecked,
      });
      await loadCareersForArtic();
      setMessage('Articulación guardada correctamente.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar la articulación'
      );
    } finally {
      setSavingArtic(false);
    }
  };

  // ----------------------------------------
  // CARGAR UNIVERSIDADES
  // ----------------------------------------

  useEffect(() => {
    let active = true;

    request<University[]>('/universities')
      .then((result) => {
        if (active) {
          setUniversities(result);
        }
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudieron cargar las universidades'
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // ----------------------------------------
  // CREAR UNIVERSIDAD
  // ----------------------------------------

  const createUniversity = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (creatingUniversity) return;

    setError('');
    setMessage('');
    setCreatingUniversity(true);

    try {
      const result = await request<{ university: University } | University>(
        '/universities',
        {
          method: 'POST',
          body: JSON.stringify({
            name: universityName.trim(),
            description: universityDescription.trim(),
          }),
        }
      );

      const university = 'university' in result ? result.university : result;
      setUniversities((current) =>
        [...current, university].sort((a, b) =>
          a.name.localeCompare(b.name, 'es')
        )
      );

      setSelectedUniversityId(university._id);

      setUniversityName('');
      setUniversityDescription('');

      setMessage(
        `Universidad "${university.name}" creada correctamente.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo crear la universidad'
      );
    } finally {
      setCreatingUniversity(false);
    }
  };

  // ----------------------------------------
  // CREAR CARRERA
  // ----------------------------------------

  const createCareer = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (creatingCareer) return;

    if (!selectedUniversityId) {
      setError('Primero seleccioná una universidad.');
      return;
    }

    setError('');
    setMessage('');
    setCreatingCareer(true);

    try {
      await request('/careers', {
        method: 'POST',
        body: JSON.stringify({
          name: careerName.trim(),
          description: careerDescription.trim(),
          university: selectedUniversityId,
          academicUnit: null,
        }),
      });

      const savedName = careerName.trim();

      setCareerName('');
      setCareerDescription('');

      // Actualizar el desplegable de carreras
      // en la pantalla de importación.
      await onCareerCreated();

      setMessage(
        `Carrera "${savedName}" creada correctamente. Ya podés seleccionarla para guardar el PDF.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo crear la carrera'
      );
    } finally {
      setCreatingCareer(false);
    }
  };

  return (
    <Card className="mb-4">
      <Card.Header>
        <strong>Administrar universidades y carreras</strong>
      </Card.Header>

      <Card.Body>
        <p className="text-muted">
          Registrá las universidades y sus carreras
          para que después puedan seleccionarse
          al guardar planes de estudio.
        </p>

        {message && (
          <Alert
            variant="success"
            dismissible
            onClose={() => setMessage('')}
          >
            {message}
          </Alert>
        )}

        {error && (
          <Alert
            variant="danger"
            dismissible
            onClose={() => setError('')}
          >
            {error}
          </Alert>
        )}

        <div className="row g-4">
          {/* CREAR UNIVERSIDAD */}

          <div className="col-12 col-lg-6">
            <h5>1. Crear universidad</h5>

            <Form onSubmit={createUniversity}>
              <Form.Group className="mb-3">
                <Form.Label>
                  Nombre de la universidad
                </Form.Label>

                <Form.Control
                  required
                  minLength={2}
                  maxLength={150}
                  value={universityName}
                  placeholder="Universidad Nacional de Hurlingham"
                  onChange={(event) =>
                    setUniversityName(event.target.value)
                  }
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>
                  Descripción (opcional)
                </Form.Label>

                <Form.Control
                  as="textarea"
                  rows={2}
                  value={universityDescription}
                  onChange={(event) =>
                    setUniversityDescription(
                      event.target.value
                    )
                  }
                />
              </Form.Group>

              <Button
                type="submit"
                className="btn-gradify"
                disabled={
                  creatingUniversity ||
                  !universityName.trim()
                }
              >
                {creatingUniversity
                  ? 'Creando...'
                  : 'Crear universidad'}
              </Button>
            </Form>
          </div>

          {/* CREAR CARRERA */}

          <div className="col-12 col-lg-6">
            <h5>2. Crear carrera</h5>

            <Form onSubmit={createCareer}>
              <Form.Group className="mb-3">
                <Form.Label>
                  Universidad
                </Form.Label>

                <Form.Select
                  required
                  disabled={loading || creatingCareer}
                  value={selectedUniversityId}
                  onChange={(event) =>
                    setSelectedUniversityId(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Seleccionar universidad...
                  </option>

                  {universities.map((university) => (
                    <option
                      key={university._id}
                      value={university._id}
                    >
                      {university.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>
                  Nombre de la carrera
                </Form.Label>

                <Form.Control
                  required
                  value={careerName}
                  placeholder="Tecnicatura Universitaria en Programación"
                  onChange={(event) =>
                    setCareerName(event.target.value)
                  }
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>
                  Descripción (opcional)
                </Form.Label>

                <Form.Control
                  as="textarea"
                  rows={2}
                  value={careerDescription}
                  onChange={(event) =>
                    setCareerDescription(
                      event.target.value
                    )
                  }
                />
              </Form.Group>

              <Button
                type="submit"
                className="btn-gradify"
                disabled={
                  creatingCareer ||
                  !selectedUniversityId ||
                  !careerName.trim()
                }
              >
                {creatingCareer
                  ? 'Creando...'
                  : 'Crear carrera'}
              </Button>
            </Form>
          </div>
        </div>

        {/* ARTICULACIÓN ENTRE CARRERAS */}

        <hr />

        <h5>3. Articulación (continuidad entre carreras)</h5>

        <p className="text-muted small">
          Elegí una carrera y marcá en cuáles se puede continuar
          (ej. la Tecnicatura en Producción Agroecológica continúa
          en Desarrollo Agrario). Se muestra al estudiante como el
          mismo trayecto.
        </p>

        <Form.Group className="mb-3" style={{ maxWidth: 420 }}>
          <Form.Label>Carrera</Form.Label>

          <Form.Select
            value={articCareerId}
            onChange={(event) =>
              setArticCareerId(event.target.value)
            }
          >
            <option value="">
              Seleccionar carrera...
            </option>

            {allCareers.map((career) => (
              <option key={career._id} value={career._id}>
                {career.name}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        {articCareerId && (
          <>
            <div
              className="d-flex flex-column gap-1 mb-3"
              style={{ maxHeight: 220, overflowY: 'auto' }}
            >
              {allCareers
                .filter((career) => career._id !== articCareerId)
                .map((career) => (
                  <Form.Check
                    key={career._id}
                    type="checkbox"
                    label={career.name}
                    checked={articChecked.includes(career._id)}
                    onChange={() => toggleArtic(career._id)}
                  />
                ))}
            </div>

            <Button
              className="btn-gradify"
              disabled={savingArtic}
              onClick={() => { void saveArticulation(); }}
            >
              {savingArtic
                ? 'Guardando...'
                : 'Guardar articulación'}
            </Button>
          </>
        )}
      </Card.Body>
    </Card>
  );
}
