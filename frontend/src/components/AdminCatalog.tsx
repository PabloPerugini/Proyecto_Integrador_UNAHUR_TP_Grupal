import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';

import {
  Alert,
  Button,
  Card,
  Dropdown,
  Form,
  Modal,
  Spinner,
  Tab,
  Table,
  Tabs,
} from 'react-bootstrap';

import { request } from '../api/client';
import { academicUnitsApi } from '../api/academicUnits';
import { careersApi } from '../api/careers';
import SearchSelect from './SearchSelect';
import { instituteColor } from '../utils/instituteColors';
import type { FlashMessage } from '../hooks/useFlashMessage';
import type { AcademicUnit, Career, CareerType } from '../types';

const CAREER_TYPES: { value: CareerType; label: string }[] = [
  { value: 'Licenciatura', label: 'Licenciatura' },
  { value: 'Tecnicatura', label: 'Tecnicatura' },
  { value: 'Profesorado', label: 'Profesorado' },
  { value: 'Ingenieria', label: 'Ingeniería' },
  { value: 'Otro', label: 'Otro' },
];

const UNIT_TYPES: { value: string; label: string }[] = [
  { value: 'INSTITUTO', label: 'Instituto' },
  { value: 'FACULTAD', label: 'Facultad' },
  { value: 'DEPARTAMENTO', label: 'Departamento' },
  { value: 'SEDE', label: 'Sede' },
  { value: 'OTRO', label: 'Otro' },
];

const DEFAULT_UNIT_COLOR = '#238a42';

interface University {
  _id: string;
  name: string;
  description?: string;
}

type AdminTab = 'institutos' | 'universidades' | 'carreras' | 'articulacion';

type UniversityRef = string | { _id: string; name: string } | null | undefined;

interface AdminCatalogProps {
  onCareerCreated: () => Promise<unknown> | void;
  onNotify?: (type: FlashMessage['type'], text: string) => void;
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function universityIdOf(ref: UniversityRef): string {
  if (!ref) return '';
  return typeof ref === 'string' ? ref : ref._id;
}

function universityLabelOf(ref: UniversityRef): string {
  if (!ref || typeof ref === 'string') return '—';
  return ref.name;
}

function unitNameOf(ref: Career['academicUnit']): string {
  if (!ref || typeof ref === 'string') return '—';
  return ref.name;
}

function unitIdOf(ref: Career['academicUnit']): string {
  if (!ref) return '';
  return typeof ref === 'string' ? ref : ref._id;
}

function unitsOfUniversity(units: AcademicUnit[], universityId: string): AcademicUnit[] {
  return units.filter(
    (unit) => universityIdOf(unit.university) === universityId,
  );
}

// Selector de color por fila con autoguardado (debounce).
function UnitColorPicker({
  unit,
  disabled,
  onSave,
}: {
  unit: AcademicUnit;
  disabled?: boolean;
  onSave: (color: string) => void;
}) {
  const [color, setColor] = useState(
    unit.color ?? instituteColor(unit.name),
  );
  const timer = useRef<number | null>(null);

  useEffect(() => {
    setColor(unit.color ?? instituteColor(unit.name));
  }, [unit._id, unit.color, unit.name]);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const handleChange = (next: string) => {
    setColor(next);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onSave(next), 700);
  };

  return (
    <input
      type="color"
      className="form-control form-control-color form-control-sm"
      style={{ width: 40 }}
      title={`Color de ${unit.name}`}
      aria-label={`Color de ${unit.name}`}
      value={color}
      disabled={disabled}
      onChange={(event) => handleChange(event.target.value)}
    />
  );
}

export default function AdminCatalog({
  onCareerCreated,
  onNotify,
}: AdminCatalogProps) {
  const [tab, setTab] = useState<AdminTab>('institutos');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [localMessage, setLocalMessage] = useState<FlashMessage | null>(null);

  const [universities, setUniversities] = useState<University[]>([]);
  const [units, setUnits] = useState<AcademicUnit[]>([]);
  const [careers, setCareers] = useState<Career[]>([]);

  // Alta de instituto
  const [unitName, setUnitName] = useState('');
  const [unitType, setUnitType] = useState('INSTITUTO');
  const [unitUniversityId, setUnitUniversityId] = useState('');
  const [unitDescription, setUnitDescription] = useState('');
  const [unitColor, setUnitColor] = useState(DEFAULT_UNIT_COLOR);

  // Edición de instituto
  const [editingUnit, setEditingUnit] = useState<AcademicUnit | null>(null);
  const [editUnitName, setEditUnitName] = useState('');
  const [editUnitType, setEditUnitType] = useState('INSTITUTO');
  const [editUnitUniversityId, setEditUnitUniversityId] = useState('');
  const [editUnitDescription, setEditUnitDescription] = useState('');

  // Alta de universidad
  const [universityName, setUniversityName] = useState('');
  const [universityDescription, setUniversityDescription] = useState('');

  // Alta de carrera
  const [careerUniversityId, setCareerUniversityId] = useState('');
  const [careerName, setCareerName] = useState('');
  const [careerType, setCareerType] = useState<CareerType | ''>('');
  const [careerDescription, setCareerDescription] = useState('');
  const [careerSearch, setCareerSearch] = useState('');
  const [showArchivedCareers, setShowArchivedCareers] = useState(false);

  // Edición de carrera
  const [editingCareer, setEditingCareer] = useState<Career | null>(null);
  const [editCareerName, setEditCareerName] = useState('');
  const [editCareerType, setEditCareerType] = useState<CareerType | ''>('');
  const [editCareerUniversityId, setEditCareerUniversityId] = useState('');
  const [editCareerUnitId, setEditCareerUnitId] = useState('');
  const [editCareerDescription, setEditCareerDescription] = useState('');

  // Articulación
  const [articCareerId, setArticCareerId] = useState('');
  const [articChecked, setArticChecked] = useState<string[]>([]);
  const [articCareerType, setArticCareerType] = useState<CareerType | ''>('');
  const [articSearch, setArticSearch] = useState('');
  const [savingArtic, setSavingArtic] = useState(false);

  const notify = (type: FlashMessage['type'], text: string) => {
    if (onNotify) onNotify(type, text);
    else setLocalMessage({ type, text });
  };

  const loadUnits = async () => {
    const list = await academicUnitsApi.getAll(true);
    setUnits(Array.isArray(list) ? list : []);
  };

  const loadCareers = async () => {
    const list = await careersApi.getAll(undefined, true);
    setCareers(
      (Array.isArray(list) ? list : []).sort((a, b) =>
        a.name.localeCompare(b.name, 'es'),
      ),
    );
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      request<University[]>('/universities'),
      academicUnitsApi.getAll(true),
      careersApi.getAll(undefined, true),
    ])
      .then(([universityList, unitList, careerList]) => {
        if (!active) return;
        setUniversities(universityList);
        setUnits(Array.isArray(unitList) ? unitList : []);
        setCareers(
          (Array.isArray(careerList) ? careerList : []).sort((a, b) =>
            a.name.localeCompare(b.name, 'es'),
          ),
        );
      })
      .catch((err) => {
        if (!active) return;
        const text =
          err instanceof Error
            ? err.message
            : 'No se pudo cargar el catálogo';
        if (onNotify) onNotify('danger', text);
        else setLocalMessage({ type: 'danger', text });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [onNotify]);

  const universityOptions = useMemo(
    () =>
      universities.map((university) => ({
        value: university._id,
        label: university.name,
      })),
    [universities],
  );

  // ── Universidades ──────────────────────────────────────────────
  const createUniversity = async (event: FormEvent) => {
    event.preventDefault();
    if (working || !universityName.trim()) return;
    setWorking(true);
    try {
      const response = await request<{ university: University }>(
        '/universities',
        {
          method: 'POST',
          body: JSON.stringify({
            name: universityName.trim(),
            description: universityDescription.trim(),
          }),
        },
      );
      setUniversities((current) => [...current, response.university]);
      // Pre-selección inteligente: queda lista para crear carreras.
      setCareerUniversityId(response.university._id);
      setUniversityName('');
      setUniversityDescription('');
      notify(
        'success',
        `Universidad "${response.university.name}" creada. Ya quedó seleccionada en "Crear carrera".`,
      );
    } catch (err) {
      notify(
        'danger',
        err instanceof Error ? err.message : 'No se pudo crear la universidad',
      );
    } finally {
      setWorking(false);
    }
  };

  // ── Institutos ─────────────────────────────────────────────────
  const createUnit = async (event: FormEvent) => {
    event.preventDefault();
    if (working || !unitName.trim() || !unitUniversityId) return;
    setWorking(true);
    try {
      const unit = await academicUnitsApi.create({
        name: unitName.trim(),
        type: unitType,
        university: unitUniversityId,
        description: unitDescription.trim(),
        color: unitColor,
      });
      await loadUnits();
      setUnitName('');
      setUnitDescription('');
      setUnitColor(DEFAULT_UNIT_COLOR);
      notify('success', `Instituto "${unit.name}" creado correctamente.`);
    } catch (err) {
      notify(
        'danger',
        err instanceof Error ? err.message : 'No se pudo crear el instituto',
      );
    } finally {
      setWorking(false);
    }
  };

  const openUnitEdit = (unit: AcademicUnit) => {
    setEditingUnit(unit);
    setEditUnitName(unit.name);
    setEditUnitType(unit.type ?? 'INSTITUTO');
    setEditUnitUniversityId(universityIdOf(unit.university));
    setEditUnitDescription(unit.description ?? '');
  };

  const saveUnitEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (
      !editingUnit ||
      working ||
      !editUnitName.trim() ||
      !editUnitUniversityId
    )
      return;
    setWorking(true);
    try {
      await academicUnitsApi.update(editingUnit._id, {
        name: editUnitName.trim(),
        type: editUnitType,
        university: editUnitUniversityId,
        description: editUnitDescription.trim(),
      });
      await loadUnits();
      setEditingUnit(null);
      notify('success', 'Instituto actualizado correctamente.');
    } catch (err) {
      notify(
        'danger',
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar el instituto',
      );
    } finally {
      setWorking(false);
    }
  };

  const saveUnitColor = async (unit: AcademicUnit, color: string) => {
    try {
      await academicUnitsApi.update(unit._id, { color });
      setUnits((current) =>
        current.map((item) =>
          item._id === unit._id ? { ...item, color } : item,
        ),
      );
      notify('success', `Color de "${unit.name}" actualizado.`);
    } catch (err) {
      notify(
        'danger',
        err instanceof Error ? err.message : 'No se pudo guardar el color',
      );
    }
  };

  const removeUnit = async (unit: AcademicUnit) => {
    if (working) return;
    if (
      !window.confirm(
        `¿Eliminar "${unit.name}"? Solo es posible si no tiene carreras ni subunidades.`,
      )
    )
      return;
    setWorking(true);
    try {
      await academicUnitsApi.remove(unit._id);
      await loadUnits();
      notify('success', 'Instituto eliminado.');
    } catch (err) {
      notify(
        'danger',
        err instanceof Error ? err.message : 'No se pudo eliminar el instituto',
      );
    } finally {
      setWorking(false);
    }
  };

  // ── Carreras ───────────────────────────────────────────────────
  const createCareer = async (event: FormEvent) => {
    event.preventDefault();
    if (working || !careerUniversityId || !careerName.trim()) return;
    setWorking(true);
    try {
      const savedName = careerName.trim();
      await careersApi.create({
        name: savedName,
        description: careerDescription.trim(),
        university: careerUniversityId,
        careerType: careerType || null,
      });
      setCareerName('');
      setCareerDescription('');
      setCareerType('');
      await loadCareers();
      await onCareerCreated();
      notify('success', `Carrera "${savedName}" creada correctamente.`);
    } catch (err) {
      notify(
        'danger',
        err instanceof Error ? err.message : 'No se pudo crear la carrera',
      );
    } finally {
      setWorking(false);
    }
  };

  const openCareerEdit = (career: Career) => {
    setEditingCareer(career);
    setEditCareerName(career.name);
    setEditCareerType(career.careerType ?? '');
    setEditCareerUniversityId(universityIdOf(career.university));
    setEditCareerUnitId(unitIdOf(career.academicUnit));
    setEditCareerDescription(career.description ?? '');
  };

  const saveCareerEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (
      !editingCareer ||
      working ||
      !editCareerName.trim() ||
      !editCareerUniversityId
    )
      return;
    setWorking(true);
    try {
      await careersApi.update(editingCareer._id, {
        name: editCareerName.trim(),
        university: editCareerUniversityId,
        academicUnit: editCareerUnitId || null,
        careerType: editCareerType || null,
        description: editCareerDescription.trim(),
      });
      await loadCareers();
      await onCareerCreated();
      setEditingCareer(null);
      notify('success', 'Carrera actualizada correctamente.');
    } catch (err) {
      notify(
        'danger',
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar la carrera',
      );
    } finally {
      setWorking(false);
    }
  };

  const archiveCareer = async (career: Career) => {
    if (working) return;
    if (
      !window.confirm(
        `¿Archivar "${career.name}"? Deja de listarse para los usuarios. La vas a poder restaurar desde "Ver archivadas".`,
      )
    )
      return;
    setWorking(true);
    try {
      await careersApi.update(career._id, { isArchived: true });
      await loadCareers();
      await onCareerCreated();
      notify(
        'success',
        'Carrera archivada. La encontrás en "Ver archivadas".',
      );
    } catch (err) {
      notify(
        'danger',
        err instanceof Error ? err.message : 'No se pudo archivar la carrera',
      );
    } finally {
      setWorking(false);
    }
  };

  const restoreCareer = async (career: Career) => {
    if (working) return;
    setWorking(true);
    try {
      await careersApi.update(career._id, { isArchived: false });
      await loadCareers();
      await onCareerCreated();
      notify('success', `Carrera "${career.name}" restaurada.`);
    } catch (err) {
      notify(
        'danger',
        err instanceof Error ? err.message : 'No se pudo restaurar la carrera',
      );
    } finally {
      setWorking(false);
    }
  };

  const removeCareer = async (career: Career) => {
    if (working) return;
    if (
      !window.confirm(
        `¿Eliminar definitivamente "${career.name}"? Solo es posible si no tiene planes de estudio.`,
      )
    )
      return;
    setWorking(true);
    try {
      await careersApi.deleteCareer(career._id);
      await loadCareers();
      await onCareerCreated();
      notify('success', `Carrera "${career.name}" eliminada.`);
    } catch (err) {
      notify(
        'danger',
        err instanceof Error
          ? err.message
          : 'No se pudo eliminar la carrera. Si tiene planes de estudio, archivala.',
      );
    } finally {
      setWorking(false);
    }
  };

  const activeCareers = useMemo(
    () => careers.filter((career) => !career.isArchived),
    [careers],
  );
  const archivedCareerCount = careers.length - activeCareers.length;

  const visibleCareers = useMemo(() => {
    const q = normalize(careerSearch);
    return careers.filter((career) => {
      if (!showArchivedCareers && career.isArchived) return false;
      if (!q) return true;
      return normalize(
        [
          career.name,
          universityLabelOf(career.university),
          unitNameOf(career.academicUnit),
          career.careerType ?? '',
        ].join(' '),
      ).includes(q);
    });
  }, [careers, careerSearch, showArchivedCareers]);

  // ── Articulación ───────────────────────────────────────────────
  useEffect(() => {
    const found = careers.find((career) => career._id === articCareerId);
    setArticChecked(
      (found?.continuesIn ?? []).map((career) =>
        typeof career === 'string' ? career : career._id,
      ),
    );
    setArticCareerType(found?.careerType ?? '');
  }, [articCareerId, careers]);

  const visibleArticCareers = useMemo(() => {
    const q = normalize(articSearch);
    return careers.filter(
      (career) =>
        !career.isArchived &&
        career._id !== articCareerId &&
        (!q || normalize(career.name).includes(q)),
    );
  }, [careers, articCareerId, articSearch]);

  const toggleArticCareer = (id: string) => {
    setArticChecked((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const saveArticulation = async () => {
    const found = careers.find((career) => career._id === articCareerId);
    if (!found || savingArtic || working) return;
    setSavingArtic(true);
    try {
      await careersApi.update(found._id, {
        continuesIn: articChecked,
        careerType: articCareerType || null,
      });
      await loadCareers();
      notify('success', 'Articulación guardada correctamente.');
    } catch (err) {
      notify(
        'danger',
        err instanceof Error
          ? err.message
          : 'No se pudo guardar la articulación',
      );
    } finally {
      setSavingArtic(false);
    }
  };

  const editCareerUnitOptions = useMemo(
    () =>
      unitsOfUniversity(units, editCareerUniversityId).map((unit) => ({
        value: unit._id,
        label: unit.name,
      })),
    [units, editCareerUniversityId],
  );

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <strong>Administrar entidades</strong>
        <span className="text-muted small">
          Institutos, universidades, carreras y articulación
        </span>
      </Card.Header>
      <Card.Body>
        {!onNotify && localMessage && (
          <Alert
            variant={localMessage.type}
            dismissible
            onClose={() => setLocalMessage(null)}
          >
            {localMessage.text}
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-4 text-muted">
            <Spinner animation="border" size="sm" className="me-2" />
            Cargando catálogo…
          </div>
        ) : (
          <Tabs
            activeKey={tab}
            onSelect={(key) => {
              if (typeof key === 'string') setTab(key as AdminTab);
            }}
            className="mb-3"
          >
            {/* ── Institutos ─────────────────────────────────── */}
            <Tab eventKey="institutos" title="Institutos">
              <p className="text-muted small mb-3">
                Creá, editá o eliminá institutos y asignales un color. Las
                carreras se asignan a un instituto desde la pestaña Carreras.
              </p>

              <Form onSubmit={createUnit} className="mb-4">
                <div className="row g-2">
                  <div className="col-12 col-md-5">
                    <Form.Group>
                      <Form.Label className="small">Nombre</Form.Label>
                      <Form.Control
                        required
                        minLength={2}
                        maxLength={150}
                        value={unitName}
                        placeholder="Instituto de …"
                        onChange={(event) => setUnitName(event.target.value)}
                      />
                    </Form.Group>
                  </div>
                  <div className="col-6 col-md-2">
                    <Form.Group>
                      <Form.Label className="small">Tipo</Form.Label>
                      <Form.Select
                        value={unitType}
                        onChange={(event) => setUnitType(event.target.value)}
                      >
                        {UNIT_TYPES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </div>
                  <div className="col-6 col-md-2">
                    <Form.Group>
                      <Form.Label className="small">Color</Form.Label>
                      <Form.Control
                        type="color"
                        className="form-control-color w-100"
                        value={unitColor}
                        title="Color del instituto"
                        onChange={(event) => setUnitColor(event.target.value)}
                      />
                    </Form.Group>
                  </div>
                  <div className="col-12 col-md-3">
                    <Form.Group>
                      <Form.Label className="small">Universidad</Form.Label>
                      <SearchSelect
                        options={universityOptions}
                        value={unitUniversityId}
                        onChange={setUnitUniversityId}
                        placeholder="Buscar universidad…"
                        ariaLabel="Universidad del instituto"
                      />
                    </Form.Group>
                  </div>
                  <div className="col-12">
                    <Form.Group>
                      <Form.Label className="small">
                        Descripción (opcional)
                      </Form.Label>
                      <Form.Control
                        maxLength={300}
                        value={unitDescription}
                        placeholder="Breve descripción del instituto"
                        onChange={(event) =>
                          setUnitDescription(event.target.value)
                        }
                      />
                    </Form.Group>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="btn-gradify mt-3"
                  disabled={working || !unitName.trim() || !unitUniversityId}
                >
                  {working ? 'Guardando…' : 'Crear instituto'}
                </Button>
              </Form>

              {units.length === 0 ? (
                <p className="text-muted mb-0">Todavía no hay institutos.</p>
              ) : (
                <div className="table-responsive">
                  <Table size="sm" striped hover className="align-middle">
                    <thead>
                      <tr>
                        <th style={{ width: 60 }}>Color</th>
                        <th>Instituto</th>
                        <th>Tipo</th>
                        <th>Universidad</th>
                        <th>Carreras</th>
                        <th className="text-end">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {units.map((unit) => (
                        <tr key={unit._id}>
                          <td>
                            <UnitColorPicker
                              unit={unit}
                              disabled={working}
                              onSave={(color) => {
                                void saveUnitColor(unit, color);
                              }}
                            />
                          </td>
                          <td>
                            <strong>{unit.name}</strong>
                            {unit.description ? (
                              <div className="text-muted small">
                                {unit.description}
                              </div>
                            ) : null}
                          </td>
                          <td>
                            {UNIT_TYPES.find(
                              (option) => option.value === unit.type,
                            )?.label ??
                              unit.type ??
                              '—'}
                          </td>
                          <td>{universityLabelOf(unit.university)}</td>
                          <td>{unit.careerCount ?? '—'}</td>
                          <td className="text-end">
                            <Button
                              size="sm"
                              variant="outline-primary"
                              disabled={working}
                              onClick={() => openUnitEdit(unit)}
                            >
                              Editar
                            </Button>{' '}
                            <Button
                              size="sm"
                              variant="outline-danger"
                              disabled={working}
                              onClick={() => {
                                void removeUnit(unit);
                              }}
                            >
                              Eliminar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Tab>

            {/* ── Universidades ──────────────────────────────── */}
            <Tab eventKey="universidades" title="Universidades">
              <p className="text-muted small">
                Registrá las universidades para asociar institutos y carreras.
              </p>
              <Form
                onSubmit={createUniversity}
                className="mb-4"
                style={{ maxWidth: 520 }}
              >
                <Form.Group className="mb-3">
                  <Form.Label>Nombre de la universidad</Form.Label>
                  <Form.Control
                    required
                    minLength={2}
                    maxLength={150}
                    value={universityName}
                    placeholder="Universidad Nacional de Hurlingham"
                    onChange={(event) => setUniversityName(event.target.value)}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Descripción (opcional)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    maxLength={300}
                    value={universityDescription}
                    onChange={(event) =>
                      setUniversityDescription(event.target.value)
                    }
                  />
                </Form.Group>
                <Button
                  type="submit"
                  className="btn-gradify"
                  disabled={working || !universityName.trim()}
                >
                  {working ? 'Creando…' : 'Crear universidad'}
                </Button>
              </Form>

              {universities.length > 0 && (
                <Table size="sm" striped>
                  <thead>
                    <tr>
                      <th>Universidad</th>
                      <th>Institutos</th>
                      <th>Carreras</th>
                    </tr>
                  </thead>
                  <tbody>
                    {universities.map((university) => (
                      <tr key={university._id}>
                        <td>{university.name}</td>
                        <td>
                          {unitsOfUniversity(units, university._id).length}
                        </td>
                        <td>
                          {
                            careers.filter(
                              (career) =>
                                !career.isArchived &&
                                universityIdOf(career.university) ===
                                  university._id,
                            ).length
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Tab>

            {/* ── Carreras ───────────────────────────────────── */}
            <Tab eventKey="carreras" title="Carreras">
              <p className="text-muted small mb-3">
                Creá carreras, editalas, asignales instituto o archivalas /
                eliminalas. Las archivadas se muestran con “Ver archivadas” y
                se restauran desde la misma tabla.
              </p>

              <Form onSubmit={createCareer} className="mb-4">
                <div className="row g-2">
                  <div className="col-12 col-md-4">
                    <Form.Group>
                      <Form.Label className="small">Universidad</Form.Label>
                      <SearchSelect
                        options={universityOptions}
                        value={careerUniversityId}
                        onChange={setCareerUniversityId}
                        placeholder="Buscar universidad…"
                        ariaLabel="Universidad de la carrera"
                      />
                    </Form.Group>
                  </div>
                  <div className="col-12 col-md-5">
                    <Form.Group>
                      <Form.Label className="small">
                        Nombre de la carrera
                      </Form.Label>
                      <Form.Control
                        required
                        minLength={2}
                        maxLength={150}
                        value={careerName}
                        placeholder="Tecnicatura Universitaria en Programación"
                        onChange={(event) => setCareerName(event.target.value)}
                      />
                    </Form.Group>
                  </div>
                  <div className="col-12 col-md-3">
                    <Form.Group>
                      <Form.Label className="small">Tipo de carrera</Form.Label>
                      <Form.Select
                        value={careerType}
                        onChange={(event) =>
                          setCareerType(event.target.value as CareerType | '')
                        }
                      >
                        <option value="">Sin definir</option>
                        {CAREER_TYPES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Text muted>
                        Marcá &quot;Tecnicatura&quot; en las carreras de
                        pregrado.
                      </Form.Text>
                    </Form.Group>
                  </div>
                  <div className="col-12">
                    <Form.Group>
                      <Form.Label className="small">
                        Descripción (opcional)
                      </Form.Label>
                      <Form.Control
                        maxLength={300}
                        value={careerDescription}
                        onChange={(event) =>
                          setCareerDescription(event.target.value)
                        }
                      />
                    </Form.Group>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="btn-gradify mt-3"
                  disabled={working || !careerUniversityId || !careerName.trim()}
                >
                  {working ? 'Guardando…' : 'Crear carrera'}
                </Button>
              </Form>

              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                <strong>
                  Carreras ({visibleCareers.length}
                  {careerSearch
                    ? ` de ${
                        showArchivedCareers
                          ? careers.length
                          : activeCareers.length
                      }`
                    : ''}
                  )
                </strong>
                <div className="d-flex flex-wrap align-items-center gap-3">
                  {archivedCareerCount > 0 && (
                    <Form.Check
                      type="switch"
                      id="show-archived-careers"
                      className="small mb-0"
                      label={`Ver archivadas (${archivedCareerCount})`}
                      checked={showArchivedCareers}
                      onChange={(event) =>
                        setShowArchivedCareers(event.target.checked)
                      }
                    />
                  )}
                  <Form.Control
                    size="sm"
                    type="search"
                    style={{ maxWidth: 320 }}
                    placeholder="Buscar carrera, universidad o instituto…"
                    aria-label="Buscar carreras"
                    value={careerSearch}
                    onChange={(event) => setCareerSearch(event.target.value)}
                  />
                </div>
              </div>

              {activeCareers.length === 0 && archivedCareerCount === 0 ? (
                <p className="text-muted mb-0">Todavía no hay carreras.</p>
              ) : visibleCareers.length === 0 ? (
                <p className="text-muted mb-0">
                  {careerSearch || showArchivedCareers
                    ? 'Sin resultados para esa búsqueda.'
                    : 'No hay carreras activas. Activá "Ver archivadas" para ver las archivadas.'}
                </p>
              ) : (
                <div className="table-responsive">
                  <Table size="sm" striped hover className="align-middle">
                    <thead>
                      <tr>
                        <th>Carrera</th>
                        <th>Tipo</th>
                        <th>Universidad</th>
                        <th>Instituto</th>
                        <th className="text-end">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleCareers.map((career) => (
                        <tr
                          key={career._id}
                          style={career.isArchived ? { opacity: 0.78 } : undefined}
                        >
                          <td>
                            <strong>{career.name}</strong>
                            {career.isArchived && (
                              <span className="badge bg-secondary ms-2">
                                Archivada
                              </span>
                            )}
                          </td>
                          <td>{career.careerType ?? '—'}</td>
                          <td>{universityLabelOf(career.university)}</td>
                          <td>{unitNameOf(career.academicUnit)}</td>
                          <td className="text-end">
                            {career.isArchived ? (
                              <Button
                                size="sm"
                                variant="outline-success"
                                disabled={working}
                                onClick={() => {
                                  void restoreCareer(career);
                                }}
                              >
                                Restaurar
                              </Button>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline-primary"
                                  disabled={working}
                                  onClick={() => openCareerEdit(career)}
                                >
                                  Editar
                                </Button>{' '}
                                <Dropdown
                                  align="end"
                                  className="d-inline-block"
                                >
                                  <Dropdown.Toggle
                                    size="sm"
                                    variant="outline-secondary"
                                    id={`career-more-${career._id}`}
                                    aria-label={`Más acciones para ${career.name}`}
                                  >
                                    ⋮
                                  </Dropdown.Toggle>
                                  <Dropdown.Menu
                                    popperConfig={{ strategy: 'fixed' }}
                                  >
                                    <Dropdown.Item
                                      disabled={working}
                                      onClick={() => {
                                        void archiveCareer(career);
                                      }}
                                    >
                                      Archivar
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                      className="text-danger"
                                      disabled={working}
                                      onClick={() => {
                                        void removeCareer(career);
                                      }}
                                    >
                                      Eliminar
                                    </Dropdown.Item>
                                  </Dropdown.Menu>
                                </Dropdown>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Tab>

            {/* ── Articulación ───────────────────────────────── */}
            <Tab eventKey="articulacion" title="Articulación">
              <p className="text-muted small mb-3">
                Elegí una carrera y marcá en cuáles se puede continuar (ej. la
                Tecnicatura en Producción Agroecológica continúa en Desarrollo
                Agrario). Se muestra al estudiante como el mismo trayecto.
              </p>

              <div className="row g-3 mb-3">
                <div className="col-12 col-md-6">
                  <Form.Group>
                    <Form.Label>Carrera</Form.Label>
                    <SearchSelect
                      options={activeCareers.map((career) => ({
                        value: career._id,
                        label: career.name,
                        hint: universityLabelOf(career.university),
                      }))}
                      value={articCareerId}
                      onChange={setArticCareerId}
                      placeholder="Buscar carrera…"
                      ariaLabel="Carrera a articular"
                    />
                  </Form.Group>
                </div>
                {articCareerId && (
                  <div className="col-12 col-md-4">
                    <Form.Group>
                      <Form.Label>Tipo de carrera</Form.Label>
                      <Form.Select
                        value={articCareerType}
                        onChange={(event) =>
                          setArticCareerType(
                            event.target.value as CareerType | '',
                          )
                        }
                      >
                        <option value="">Sin definir</option>
                        {CAREER_TYPES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Text muted>
                        Las tecnicaturas se etiquetan en el catálogo del inicio.
                      </Form.Text>
                    </Form.Group>
                  </div>
                )}
              </div>

              {articCareerId && (
                <>
                  <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
                    <Form.Control
                      size="sm"
                      type="search"
                      style={{ maxWidth: 300 }}
                      placeholder="Buscar entre las carreras…"
                      aria-label="Buscar carreras para articular"
                      value={articSearch}
                      onChange={(event) => setArticSearch(event.target.value)}
                    />
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      onClick={() =>
                        setArticChecked((current) => [
                          ...new Set([
                            ...current,
                            ...visibleArticCareers.map(
                              (career) => career._id,
                            ),
                          ]),
                        ])
                      }
                    >
                      Marcar las visibles
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      onClick={() => setArticChecked([])}
                    >
                      Limpiar selección
                    </Button>
                    <span className="text-muted small">
                      {articChecked.length} carrera(s) seleccionada(s)
                    </span>
                  </div>

                  <div
                    className="d-flex flex-column gap-1 mb-3"
                    style={{ maxHeight: 240, overflowY: 'auto' }}
                  >
                    {visibleArticCareers.length === 0 && (
                      <span className="text-muted small">
                        Sin carreras que coincidan.
                      </span>
                    )}
                    {visibleArticCareers.map((career) => (
                      <Form.Check
                        key={career._id}
                        type="checkbox"
                        id={`artic-${career._id}`}
                        label={career.name}
                        checked={articChecked.includes(career._id)}
                        onChange={() => toggleArticCareer(career._id)}
                      />
                    ))}
                  </div>

                  <Button
                    className="btn-gradify"
                    disabled={savingArtic || working}
                    onClick={() => {
                      void saveArticulation();
                    }}
                  >
                    {savingArtic ? 'Guardando…' : 'Guardar articulación'}
                  </Button>
                </>
              )}
            </Tab>
          </Tabs>
        )}
      </Card.Body>

      {/* Modal de edición de instituto */}
      <Modal
        show={Boolean(editingUnit)}
        onHide={() => {
          if (!working) setEditingUnit(null);
        }}
        centered
      >
        <Form onSubmit={saveUnitEdit}>
          <Modal.Header closeButton>
            <Modal.Title>Editar instituto</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                required
                minLength={2}
                maxLength={150}
                value={editUnitName}
                onChange={(event) => setEditUnitName(event.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Tipo</Form.Label>
              <Form.Select
                value={editUnitType}
                onChange={(event) => setEditUnitType(event.target.value)}
              >
                {UNIT_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Universidad</Form.Label>
              <SearchSelect
                options={universityOptions}
                value={editUnitUniversityId}
                onChange={setEditUnitUniversityId}
                placeholder="Buscar universidad…"
                ariaLabel="Universidad del instituto"
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Descripción (opcional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                maxLength={300}
                value={editUnitDescription}
                onChange={(event) => setEditUnitDescription(event.target.value)}
              />
            </Form.Group>
            <Form.Text muted>
              El color se edita directo en la tabla (swatch de la fila).
            </Form.Text>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="outline-secondary"
              disabled={working}
              onClick={() => setEditingUnit(null)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="btn-gradify"
              disabled={working || !editUnitName.trim() || !editUnitUniversityId}
            >
              {working ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal de edición de carrera */}
      <Modal
        show={Boolean(editingCareer)}
        onHide={() => {
          if (!working) setEditingCareer(null);
        }}
        centered
      >
        <Form onSubmit={saveCareerEdit}>
          <Modal.Header closeButton>
            <Modal.Title>Editar carrera</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                required
                minLength={2}
                maxLength={150}
                value={editCareerName}
                onChange={(event) => setEditCareerName(event.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Tipo de carrera</Form.Label>
              <Form.Select
                value={editCareerType}
                onChange={(event) =>
                  setEditCareerType(event.target.value as CareerType | '')
                }
              >
                <option value="">Sin definir</option>
                {CAREER_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Universidad</Form.Label>
              <SearchSelect
                options={universityOptions}
                value={editCareerUniversityId}
                onChange={(next) => {
                  setEditCareerUniversityId(next);
                  setEditCareerUnitId('');
                }}
                placeholder="Buscar universidad…"
                ariaLabel="Universidad de la carrera"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Instituto</Form.Label>
              <SearchSelect
                options={editCareerUnitOptions}
                value={editCareerUnitId}
                onChange={setEditCareerUnitId}
                placeholder={
                  editCareerUniversityId
                    ? 'Buscar instituto…'
                    : 'Elegí primero la universidad'
                }
                disabled={!editCareerUniversityId}
                ariaLabel="Instituto de la carrera"
              />
              <Form.Text muted>
                Dejalo vacío para dejarla sin instituto.
              </Form.Text>
            </Form.Group>
            <Form.Group>
              <Form.Label>Descripción (opcional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                maxLength={300}
                value={editCareerDescription}
                onChange={(event) =>
                  setEditCareerDescription(event.target.value)
                }
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="outline-secondary"
              disabled={working}
              onClick={() => setEditingCareer(null)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="btn-gradify"
              disabled={
                working || !editCareerName.trim() || !editCareerUniversityId
              }
            >
              {working ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Card>
  );
}
