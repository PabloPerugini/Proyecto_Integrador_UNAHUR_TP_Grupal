export type FaqCategory =
  | 'importar-plan'
  | 'correlatividades'
  | 'progreso'
  | 'bajas'
  | 'admin'
  | 'cuenta';

export interface Faq {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
  tags: string[];
  link?: string;
}

export const FAQS: Faq[] = [
  {
    id: 'importar-plan-1',
    category: 'importar-plan',
    question: '¿Cómo importo un plan de estudios?',
    answer:
      'Ingresá como ADMIN a "Cargar plan", subí el PDF del plan de estudios y revisá la vista previa. Confirmá la importación y luego revisá o cargá las correlatividades del plan.',
    tags: ['importar', 'pdf', 'plan', 'cargar'],
    link: '/cargar',
  },
  {
    id: 'importar-plan-2',
    category: 'importar-plan',
    question: '¿Qué hago si el PDF no se lee?',
    answer:
      'Asegurate de que el PDF tenga texto seleccionable y no sea un escaneo. Si el problema continúa, revisá que el archivo corresponda al plan y volvé a intentar la carga.',
    tags: ['pdf', 'error', 'lectura'],
  },
  {
    id: 'correlatividades-1',
    category: 'correlatividades',
    question: '¿Qué son las correlatividades?',
    answer:
      'Son materias que debés aprobar (o tener regularizadas) antes de poder cursar otras. Gradify las muestra en un grafo para que veas qué podés cursar en cada momento.',
    tags: ['correlativas', 'materias', 'grafo'],
    link: '/grafo',
  },
  {
    id: 'correlatividades-2',
    category: 'correlatividades',
    question: '¿Cómo sé qué materias puedo cursar?',
    answer:
      'Entrá al grafo o tablero de tu carrera. Las materias disponibles se destacan; las bloqueadas muestran cuáles son sus correlativas pendientes.',
    tags: ['cursar', 'disponibles', 'bloqueadas'],
    link: '/grafo',
  },
  {
    id: 'progreso-1',
    category: 'progreso',
    question: '¿Cómo guardo mi progreso académico?',
    answer:
      'En "Mi progreso" podés marcar materias como Pendiente, Cursando, Regular o Aprobada, con nota y fecha. Los cambios se guardan al instante.',
    tags: ['progreso', 'estado', 'nota'],
    link: '/progreso',
  },
  {
    id: 'progreso-2',
    category: 'progreso',
    question: '¿Puedo importar mi historial académico?',
    answer:
      'Sí. Usá "Importar historial" para subir tu PDF de notas. Gradify extrae las materias y te las sugiere para confirmar.',
    tags: ['historial', 'notas', 'importar'],
  },
  {
    id: 'bajas-1',
    category: 'bajas',
    question: '¿Cómo doy de baja una carrera o universidad?',
    answer:
      'Solo un ADMIN puede eliminar carreras o universidades desde el catálogo. No se puede borrar una universidad que tenga institutos o carreras asociadas (se muestra un error 409).',
    tags: ['baja', 'eliminar', 'admin', '409'],
    link: '/admin',
  },
  {
    id: 'bajas-2',
    category: 'bajas',
    question: '¿Qué pasa con mi progreso si doy de baja un plan?',
    answer:
      'Dar de baja un plan lo archiva, pero conserva tu progreso. Si te volvés a inscribir, el progreso se reactiva.',
    tags: ['baja', 'plan', 'archivar'],
    link: '/progreso',
  },
  {
    id: 'admin-1',
    category: 'admin',
    question: '¿Quién puede crear universidades, institutos y carreras?',
    answer:
      'Solo usuarios con rol ADMIN. Desde el panel de administración podés crear, editar y archivar universidades, institutos y carreras.',
    tags: ['admin', 'crear', 'carreras', 'institutos'],
    link: '/admin',
  },
  {
    id: 'admin-2',
    category: 'admin',
    question: '¿Puedo editar el nombre de una materia?',
    answer:
      'Sí. En "Editar plan" podés editar el nombre visible de las materias del plan y guardar los cambios en lote.',
    tags: ['editar', 'materia', 'nombre'],
    link: '/admin',
  },
  {
    id: 'cuenta-1',
    category: 'cuenta',
    question: '¿Cómo cambio mis datos de cuenta?',
    answer:
      'Entrá a "Mi cuenta" para editar tu nombre, email y contraseña. Los cambios se validan antes de guardarse.',
    tags: ['cuenta', 'perfil', 'contraseña'],
    link: '/cuenta',
  },
  {
    id: 'cuenta-2',
    category: 'cuenta',
    question: '¿Cómo cierro sesión?',
    answer:
      'Usá el botón "Cerrar sesión" en el sidebar. Se invalida tu sesión y redirige al login.',
    tags: ['sesión', 'logout'],
  },
];
