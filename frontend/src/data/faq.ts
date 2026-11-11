export type FaqCategory =
  | 'importar-plan'
  | 'correlatividades'
  | 'progreso'
  | 'bajas'
  | 'admin'
  | 'cuenta';

export type FaqRole = 'ADMIN' | 'USUARIO';

export interface Faq {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
  tags: string[];
  roles?: FaqRole[];
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
    roles: ['ADMIN'],
    link: '/cargar',
  },
  {
    id: 'importar-plan-2',
    category: 'importar-plan',
    question: '¿Qué hago si el PDF no se lee?',
    answer:
      'Asegurate de que el archivo sea un PDF con texto seleccionable y no un escaneo. Si importás un plan, verificá también que corresponda a ese plan; si importás tu historia académica, probá con el PDF descargado del sistema de alumnos.',
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
    id: 'correlatividades-camino-critico',
    category: 'correlatividades',
    question: '¿Qué muestra el camino crítico?',
    answer:
      'En el grafo o tablero, activa «Camino crítico» para resaltar la secuencia de materias pendientes que más tiempo requiere. Tiene en cuenta las correlatividades y supone que podés cursar materias en paralelo; las materias anuales cuentan como más tiempo que las cuatrimestrales. Si hay un ciclo entre correlativas, no se puede calcular.',
    tags: ['camino', 'crítico', 'critico', 'tiempo', 'demora', 'secuencia', 'finalizar'],
    link: '/grafo',
  },
  {
    id: 'correlatividades-camino-optimo',
    category: 'correlatividades',
    question: '¿Cómo uso el camino óptimo?',
    answer:
      'En el grafo o tablero, activa «Camino óptimo» y elegí una materia pendiente. Se resalta la secuencia de correlativas pendientes que más tiempo requiere para llegar a aprobar esa materia, suponiendo que cursás en paralelo cuando es posible. Las materias ya aprobadas no forman parte del recorrido.',
    tags: ['camino', 'óptimo', 'optimo', 'recorrido', 'ruta', 'materia', 'aprobar', 'correlativas'],
    link: '/grafo',
  },
  {
    id: 'progreso-1',
    category: 'progreso',
    question: '¿Cómo guardo mi progreso académico?',
    answer:
      'En "Mi progreso" podés marcar materias como Pendiente, Cursando, Regularizada o Aprobada e ingresar la nota. Después, presioná "Guardar cambios" para registrar las modificaciones.',
    tags: ['progreso', 'estado', 'nota'],
    link: '/progreso',
  },
  {
    id: 'progreso-2',
    category: 'progreso',
    question: '¿Puedo importar mi historial académico?',
    answer:
      'Sí. En "Mi progreso", agregá el plan a tu cuenta y subí el PDF en "Importar historia académica". Revisá las materias aprobadas que se reconocieron y presioná "Guardar cambios" para registrarlas.',
    tags: ['historial', 'notas', 'importar'],
  },
  {
    id: 'bajas-1',
    category: 'bajas',
    question: '¿Cómo doy de baja una carrera o universidad?',
    answer:
      'Solo un ADMIN puede eliminar carreras o universidades desde el catálogo. No se puede borrar una universidad que tenga institutos o carreras asociadas (se muestra un error 409).',
    tags: ['baja', 'eliminar', 'admin', '409'],
    roles: ['ADMIN'],
    link: '/admin',
  },
  {
    id: 'bajas-2',
    category: 'bajas',
    question: '¿Qué pasa con mi progreso si quito un plan de Mi progreso?',
    answer:
      'Si ya registraste progreso, se conserva al quitar el plan. Si lo agregás de nuevo a tu cuenta, se recupera ese avance. Si todavía no tenías progreso registrado, se elimina la inscripción al plan.',
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
    roles: ['ADMIN'],
    link: '/admin',
  },
  {
    id: 'admin-2',
    category: 'admin',
    question: '¿Puedo editar el nombre de una materia?',
    answer:
      'Sí. En "Editar plan" podés editar el nombre visible de las materias del plan y guardar los cambios en lote.',
    tags: ['editar', 'materia', 'nombre'],
    roles: ['ADMIN'],
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
