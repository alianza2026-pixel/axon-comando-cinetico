import React, { useState, useEffect, useMemo } from 'react';
// @ts-ignore
import html2pdf from 'html2pdf.js';

import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Users, 
  Settings, 
  Bell, 
  Search, 
  Cpu, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  HardHat, 
  Eye, 
  Hand, 
  Footprints,
  ChevronRight,
  MoreVertical,
  Maximize2,
  RefreshCw,
  Terminal,
  Building,
  Briefcase,
  Stethoscope,
  Syringe,
  Plus,
  Trash2,
  UserMinus,
  UserPlus,
  FileText,
  ExternalLink,
  Copy,
  Upload,
  Download,
  ShieldCheck,
  X,
  BarChart3,
  TrendingDown,
  Calendar,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { cn } from './lib/utils';
import { Worker, Alert, PPEStatus, DiagnosticResult, Company, MedicalExam, Vaccination, Incidence, Absenteeism, MonthlyActivity } from './types';
import { analyzeSafetyData, generateFormat, extractDocumentData, extractFuratData, generateAccidentInvestigation } from './services/gemini';
import { AccidentDashboard } from './components/AccidentDashboard';
// Firebase y Auth reemplazados por Supabase
import { supabase, loginWithMagicLink, loginWithPassword, logout } from './supabase';
import { User } from '@supabase/supabase-js';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  getDocFromServer,
  query,
  orderBy,
  db
} from './firebase-adapter';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: undefined, // Ignoramos esto temporalmente
      email: undefined,
      emailVerified: undefined,
      isAnonymous: undefined,
      tenantId: undefined,
      providerInfo: []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // No lanzar un error fatal, solo registrarlo para que la app no se caiga. Esto es CRÍTICO para el arranque.
}

// Mock Data
const STANDARDS = [
  { id: 'S-1', title: 'Asignación de persona que diseña el SG-SST', level: 7 },
  { id: 'S-2', title: 'Afiliación al Sistema de Seguridad Social Integral', level: 7 },
  { id: 'S-3', title: 'Capacitación en SST', level: 7 },
  { id: 'S-4', title: 'Plan Anual de Trabajo', level: 7 },
  { id: 'S-5', title: 'Evaluaciones médicas ocupacionales', level: 7 },
  { id: 'S-6', title: 'Identificación de peligros; evaluación y valoración de riesgos', level: 7 },
  { id: 'S-7', title: 'Medidas de prevención y control frente a peligros/riesgos identificados', level: 7 },
  { id: 'S-8', title: 'Asignación de recursos para el SG-SST', level: 21 },
  { id: 'S-9', title: 'Conformación y funcionamiento del COPASST', level: 21 },
  { id: 'S-10', title: 'Conformación y funcionamiento del Comité de Convivencia Laboral', level: 21 },
  { id: 'S-11', title: 'Programa de Capacitación', level: 21 },
  { id: 'S-12', title: 'Inducción y Reinducción en SST', level: 21 },
  { id: 'S-13', title: 'Curso Virtual de Capacitación de 50 horas', level: 21 },
  { id: 'S-14', title: 'Archivo y retención documental del SG-SST', level: 21 },
  { id: 'S-15', title: 'Rendición de cuentas', level: 21 },
  { id: 'S-16', title: 'Matriz de Requisitos Legales', level: 21 },
  { id: 'S-17', title: 'Mecanismos de comunicación', level: 21 },
  { id: 'S-18', title: 'Identificación y evaluación en la adquisición de bienes y servicios', level: 21 },
  { id: 'S-19', title: 'Evaluación y selección de proveedores y contratistas', level: 21 },
  { id: 'S-20', title: 'Gestión del cambio', level: 21 },
  { id: 'S-21', title: 'Descripción sociodemográfica y diagnóstico de condiciones de salud', level: 21 },
  { id: 'S-22', title: 'Actividades de medicina del trabajo y de prevención y promoción de la salud', level: 62 },
  { id: 'S-23', title: 'Perfiles de cargo', level: 62 },
  { id: 'S-24', title: 'Estilos de vida y entorno saludable', level: 62 },
  { id: 'S-25', title: 'Servicios de higiene', level: 62 },
  { id: 'S-26', title: 'Manejo de residuos', level: 62 },
  { id: 'S-27', title: 'Reporte de accidentes de trabajo y enfermedades laborales', level: 62 },
  { id: 'S-28', title: 'Investigación de incidentes, accidentes de trabajo y enfermedades laborales', level: 62 },
  { id: 'S-29', title: 'Registro y análisis estadístico de accidentes y enfermedades', level: 62 },
  { id: 'S-30', title: 'Frecuencia de accidentalidad', level: 62 },
  { id: 'S-31', title: 'Severidad de accidentalidad', level: 62 },
  { id: 'S-32', title: 'Proporción de accidentes de trabajo mortales', level: 62 },
  { id: 'S-33', title: 'Prevalencia de la enfermedad laboral', level: 62 },
  { id: 'S-34', title: 'Incidencia de la enfermedad laboral', level: 62 },
  { id: 'S-35', title: 'Ausentismo por causa médica', level: 62 },
  { id: 'S-36', title: 'Metodología para identificación de peligros', level: 62 },
  { id: 'S-37', title: 'Identificación de peligros con participación de todos los niveles', level: 62 },
  { id: 'S-38', title: 'Identificación de sustancias catalogadas como carcinógenas', level: 62 },
  { id: 'S-39', title: 'Realización de mediciones ambientales', level: 62 },
  { id: 'S-40', title: 'Mantenimiento periódico de instalaciones, equipos, máquinas y herramientas', level: 62 },
  { id: 'S-41', title: 'Entrega de elementos de protección personal (EPP) y capacitación', level: 62 },
  { id: 'S-42', title: 'Aplicación de medidas de prevención y control', level: 62 },
  { id: 'S-43', title: 'Inspecciones a instalaciones, maquinaria o equipos', level: 62 },
  { id: 'S-44', title: 'Mantenimiento preventivo y correctivo de equipos y herramientas', level: 62 },
  { id: 'S-45', title: 'Plan de prevención, preparación y respuesta ante emergencias', level: 62 },
  { id: 'S-46', title: 'Brigada de prevención, preparación y respuesta ante emergencias', level: 62 },
  { id: 'S-47', title: 'Simulacros de emergencias', level: 62 },
  { id: 'S-48', title: 'Auditoría anual', level: 62 },
  { id: 'S-49', title: 'Revisión por la alta dirección', level: 62 },
  { id: 'S-50', title: 'Planificación de la auditoría con el COPASST', level: 62 },
  { id: 'S-51', title: 'Acciones preventivas y correctivas', level: 62 },
  { id: 'S-52', title: 'Cumplimiento de ejecución de planes de acción', level: 62 },
  { id: 'S-53', title: 'Mantenimiento de la documentación', level: 62 },
  { id: 'S-54', title: 'Custodia de las historias clínicas', level: 62 },
  { id: 'S-55', title: 'Restricciones y recomendaciones médico-laborales', level: 62 },
  { id: 'S-56', title: 'Evaluación de los perfiles epidemiológicos', level: 62 },
  { id: 'S-57', title: 'Campañas de promoción y prevención', level: 62 },
  { id: 'S-58', title: 'Control de plagas', level: 62 },
  { id: 'S-59', title: 'Suministro de agua potable', level: 62 },
  { id: 'S-60', title: 'Eliminación de residuos sólidos', level: 62 },
  { id: 'S-61', title: 'Tratamiento de aguas residuales', level: 62 },
  { id: 'S-62', title: 'Sistemas de ventilación', level: 62 },
];

const INITIAL_COMPANIES: Company[] = [
  {
    id: 'C-001',
    name: 'Constructora Alfa',
    nit: '900.123.456-1',
    riskLevel: 5,
    workerCount: 45,
    sector: 'Construcción',
    standardsCount: 62,
    completedStandards: ['S-1', 'S-2', 'S-3', 'S-4', 'S-5'],
    compliancePercentage: 85,
    logoUrl: 'https://img.icons8.com/?size=256&id=13108&format=png',
    responsibleName: 'Ing. Sofia Vergara',
    incidences: [],
    absenteeismList: [],
    monthlyActivities: []
  },
  {
    id: 'C-002',
    name: 'Logística Express',
    nit: '800.987.654-2',
    riskLevel: 2,
    workerCount: 8,
    sector: 'Transporte',
    standardsCount: 7,
    completedStandards: ['S-1', 'S-2', 'S-3', 'S-4', 'S-5', 'S-6'],
    compliancePercentage: 92,
    logoUrl: 'https://img.icons8.com/?size=256&id=13115&format=png',
    responsibleName: 'Carlos Mendoza',
    incidences: [],
    absenteeismList: [],
    monthlyActivities: []
  }
];

const INITIAL_WORKERS: Worker[] = [
  {
    id: 'W-1024',
    name: 'Marcus Thorne',
    role: 'Técnico de Alta Tensión',
    location: 'Sector 7G - Red Eléctrica',
    riskLevel: 'high',
    lastCheck: new Date().toISOString(),
    status: { helmet: true, vest: true, gloves: true, glasses: true, boots: true },
    vitals: { heartRate: 88, temp: 36.8 },
    employmentStatus: 'Activo',
    companyId: 'C-001',
    medicalExams: [
      { id: 'E-1', type: 'Ingreso', date: '2025-01-15', expiryDate: '2026-01-15', status: 'Vencido' }
    ],
    vaccinations: [
      { id: 'V-1', type: 'Tétanos', dose: 1, date: '2025-02-10', status: 'En Proceso', nextDoseDate: '2025-03-10' }
    ]
  },
  {
    id: 'W-2056',
    name: 'Elena Vance',
    role: 'Ingeniera Estructural',
    location: 'Nivel 4 - Andamiaje',
    riskLevel: 'medium',
    lastCheck: new Date().toISOString(),
    status: { helmet: true, vest: true, gloves: false, glasses: true, boots: true },
    vitals: { heartRate: 72, temp: 37.1 },
    employmentStatus: 'Activo',
    companyId: 'C-001',
    medicalExams: [
      { id: 'E-2', type: 'Periódico', date: '2025-06-20', expiryDate: '2026-06-20', status: 'Vigente' }
    ],
    vaccinations: [
      { id: 'V-2', type: 'Hepatitis B', dose: 3, date: '2024-12-05', status: 'Completo' }
    ]
  },
  {
    id: 'W-0982',
    name: 'Kaelen Miller',
    role: 'Operador Logístico',
    location: 'Muelle de Carga B',
    riskLevel: 'low',
    lastCheck: new Date().toISOString(),
    status: { helmet: true, vest: true, gloves: true, glasses: true, boots: true },
    vitals: { heartRate: 65, temp: 36.5 },
    employmentStatus: 'Activo',
    companyId: 'C-002',
    medicalExams: [],
    vaccinations: []
  },
  {
    id: 'W-4412',
    name: 'Sarah Connor',
    role: 'Manipuladora de Materiales Peligrosos',
    location: 'Zona de Contención 3',
    riskLevel: 'high',
    lastCheck: new Date().toISOString(),
    status: { helmet: true, vest: false, gloves: true, glasses: true, boots: true },
    vitals: { heartRate: 94, temp: 37.4 },
    employmentStatus: 'Retirado',
    companyId: 'C-001',
    medicalExams: [
      { id: 'E-3', type: 'Retiro', date: '2026-03-01', expiryDate: '2027-03-01', status: 'Vigente' }
    ],
    vaccinations: []
  }
];

const INITIAL_ALERTS: Alert[] = [
  {
    id: 'A-001',
    timestamp: new Date().toISOString(),
    workerId: 'W-2056',
    workerName: 'Elena Vance',
    type: 'PPE_MISSING',
    severity: 'warning',
    message: 'Guantes de seguridad no detectados en la zona del Nivel 4.'
  },
  {
    id: 'A-002',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    workerId: 'W-4412',
    workerName: 'Sarah Connor',
    type: 'PPE_MISSING',
    severity: 'critical',
    message: 'Chaleco de alta visibilidad faltante en área de contención peligrosa.'
  }
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginMethod, setLoginMethod] = useState<'magic' | 'password'>('magic');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [companies, setCompanies] = useState<Company[]>(INITIAL_COMPANIES);
  const [workers, setWorkers] = useState<Worker[]>(INITIAL_WORKERS);
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [diagnosticCompanyId, setDiagnosticCompanyId] = useState<string>('all');
  const [showIncidenceModal, setShowIncidenceModal] = useState(false);
  const [showAccidentDashboard, setShowAccidentDashboard] = useState(false);
  const [dashboardCompany, setDashboardCompany] = useState<Company | null>(null);
  const [showSurveillanceModal, setShowSurveillanceModal] = useState(false);
  const [surveillanceEditTarget, setSurveillanceEditTarget] = useState<{ company: Company; programId: string; programName: string } | null>(null);
  const [surveillanceForm, setSurveillanceForm] = useState({ percentage: 0, notes: '', evidence: '', responsibleName: '' });
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'workers' | 'alerts' | 'diagnostics' | 'surveillance' | 'settings' | 'companies' | 'ai-assistant'>('overview');
  const [newCompany, setNewCompany] = useState<Partial<Company>>({
    name: '',
    nit: '',
    riskLevel: 1,
    workerCount: 0,
    sector: '',
    standardsCount: 7,
    completedStandards: [],
    compliancePercentage: 0,
    driveFolderUrl: '',
    responsibleName: '',
    incidences: [],
    absenteeismList: [],
    monthlyActivities: []
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [alertFilter, setAlertFilter] = useState<'Todos' | 'Críticos' | 'Avisos'>('Todos');
  const [alertSort, setAlertSort] = useState<'Recientes' | 'Antiguos'>('Recientes');

  // Form states for new company
  const [showNewCompanyModal, setShowNewCompanyModal] = useState(false);
  const [showNewWorkerModal, setShowNewWorkerModal] = useState(false);
  const [showStandardsModal, setShowStandardsModal] = useState<Company | null>(null);
  const [workerFilter, setWorkerFilter] = useState<'Todos' | 'Activos' | 'Retirados'>('Todos');
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [selectedStandardId, setSelectedStandardId] = useState<string | null>(null);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(null);
  const [generatedDocCompany, setGeneratedDocCompany] = useState<Company | null>(null);
  const [selectedCompanyForAi, setSelectedCompanyForAi] = useState<Company | null>(null);
  const [newWorker, setNewWorker] = useState<Partial<Worker>>({
    name: '',
    role: '',
    companyId: '',
    employmentStatus: 'Activo',
    riskLevel: 'low'
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Guardia de seguridad: si Supabase no se inicializó, no podemos configurar la autenticación.
    if (!supabase || !supabase.auth) {
      setIsAuthReady(true);
      return;
    }

    const handleAuthChange = async (_event: string, session: any) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        const profile = await getUserProfile(u.id);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      setIsAuthReady(true);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange('INITIAL_SESSION', session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = useMemo(() => {
    return userProfile?.role === 'admin' || user?.email === 'alianza2026@sociedadsst26.com';
  }, [userProfile, user]);

  const filteredCompanies = useMemo(() => {
    if (isAdmin) return companies;
    return companies.filter(c => c.id === userProfile?.company_id);
  }, [companies, userProfile, isAdmin]);

  const filteredWorkers = useMemo(() => {
    const companyIds = filteredCompanies.map(c => c.id);
    return workers.filter(w => companyIds.includes(w.companyId));
  }, [workers, filteredCompanies]);

  const filteredAlerts = useMemo(() => {
    const workerIds = filteredWorkers.map(w => w.id);
    const localAlerts = alerts.filter(a => a.workerId && workerIds.includes(a.workerId));
    // Combinar con alertas globales si es admin
    return isAdmin ? alerts : localAlerts;
  }, [alerts, filteredWorkers, isAdmin]);

  const handleDownloadPDF = () => {
    const element = document.getElementById('printable-document');
    if (!element || !generatedDocCompany) {
      alert("No se puede generar el PDF en este momento.");
      return;
    }
    
    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number],
      filename: `AXON-SST_REPORTE-${generatedDocCompany.name.toUpperCase().replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        letterRendering: true
      },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save()
      .catch((err: any) => alert("Error generando PDF: " + err.message));
  };

  const handleDownloadMarkdown = () => {
    if (!generatedDoc || !generatedDocCompany) return;
    const blob = new Blob([generatedDoc], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AXON-SST_BORRADOR-${generatedDocCompany.name.toUpperCase().replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadReport = () => {
    const currentCompany = filteredCompanies[0];
    if (!currentCompany) {
      alert('No hay datos de empresa para generar el reporte.');
      return;
    }

    const reportContent = `
===========================================================
REPORTAJE DE CUMPLIMIENTO SST - AXÓN COMANDO CINÉTICO
===========================================================
Empresa: ${currentCompany.name}
NIT: ${currentCompany.nit}
Fecha de Reporte: ${new Date().toLocaleString()}
Responsable: ${user?.email}
-----------------------------------------------------------
RESUMEN DE ESTADO:
- Cumplimiento Resolución 0312: ${currentCompany.compliancePercentage}%
- Estándares Auditados: ${currentCompany.completedStandards.length} de ${currentCompany.standardsCount}
- Personal en Vigilancia: ${filteredWorkers.filter(w => w.employmentStatus === 'Activo').length} unidades
- Alertas Críticas Detectadas: ${filteredAlerts.filter(a => a.severity === 'critical').length}
- Avisos de Vigilancia: ${filteredAlerts.filter(a => a.severity === 'warning').length}

Este documento certifica el estado actual de los protocolos SST.
Validado por el Sistema de Comando Cinético Axón.
===========================================================
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reporte_SST_${currentCompany.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Real-time updates from Firestore
  useEffect(() => {
    // Modificación: Escuchar siempre que la autenticación esté lista, 
    // en lugar de esperar a un usuario. La lógica de filtrado (isAdmin)
    // se encargará de mostrar los datos correctos.
    if (!isAuthReady) return;
    if (!isAdmin) return; // Solo el admin necesita escuchar todo

    const companiesUnsubscribe = onSnapshot(collection(db, 'companies'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Company);
      setCompanies(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'companies'));

    const workersUnsubscribe = onSnapshot(collection(db, 'workers'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Worker);
      setWorkers(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'workers'));

    const alertsUnsubscribe = onSnapshot(query(collection(db, 'alerts'), orderBy('timestamp', 'desc')), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Alert);
      setAlerts(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'alerts'));

    return () => {
      companiesUnsubscribe();
      workersUnsubscribe();
      alertsUnsubscribe();
    };
  }, [isAuthReady, isAdmin]);

  // Test connection
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Check for medical and vaccination alerts
  useEffect(() => {
    if (!isAuthReady) return;

    const generateAlerts = async () => {
      const newAlerts: Alert[] = [];
      const now = new Date();
      
      workers.forEach(worker => {
        worker.medicalExams.forEach(exam => {
          const expiryDate = new Date(exam.expiryDate);
          const isPeriodic = exam.type === 'Periódico';
          
          if (isPeriodic && expiryDate < now) {
            newAlerts.push({
              id: `A-MED-V-${worker.id}-${exam.id}`,
              timestamp: now.toISOString(),
              workerId: worker.id,
              workerName: worker.name,
              type: 'MEDICAL_EXAM_EXPIRED',
              severity: 'critical',
              message: `¡ALERTA SST! Examen Médico Periódico VENCIDO para ${worker.name}. Fecha límite: ${new Date(exam.expiryDate).toLocaleDateString()}.`
            });
          } else if (isPeriodic && expiryDate > now && (expiryDate.getTime() - now.getTime()) < (30 * 24 * 60 * 60 * 1000)) {
            newAlerts.push({
              id: `A-MED-W-${worker.id}-${exam.id}`,
              timestamp: now.toISOString(),
              workerId: worker.id,
              workerName: worker.name,
              type: 'MEDICAL_EXAM_EXPIRED',
              severity: 'warning',
              message: `VIGILANCIA: Examen Periódico de ${worker.name} próximo a vencer (${new Date(exam.expiryDate).toLocaleDateString()}).`
            });
          }
        });
        worker.vaccinations.forEach(vac => {
          if (vac.status === 'Pendiente' || (vac.nextDoseDate && new Date(vac.nextDoseDate) < new Date())) {
            newAlerts.push({
              id: `A-VAC-${worker.id}-${vac.id}`,
              timestamp: new Date().toISOString(),
              workerId: worker.id,
              workerName: worker.name,
              type: 'VACCINATION_DUE',
              severity: 'warning',
              message: `Vacunación (${vac.type}) pendiente o próxima dosis para ${worker.name}.`
            });
          }
        });
      });
      // Persist new alerts to Firestore
      for (const alert of newAlerts) {
        const alertExists = alerts.some(a => a.id === alert.id);
        if (!alertExists) {
          try {
            await setDoc(doc(db, 'alerts', alert.id), alert);
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, `alerts/${alert.id}`);
          }
        }
      }
    };

    if (workers.length > 0) {
      generateAlerts();
    }
  }, [workers, alerts, isAdmin, isAuthReady]);

  const handleAutoFillDocument = async (file: File) => {
    if (!editingWorker) return;
    setIsAiLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const data = await extractDocumentData(base64, file.type);
        if (data && editingWorker) {
          if (data.docType === 'EXAMEN_MEDICO') {
            const newExam: MedicalExam = {
              id: Math.random().toString(36).substr(2, 9),
              type: 'Periódico',
              date: data.issueDate || new Date().toISOString().split('T')[0],
              expiryDate: data.expiryDate || new Date().toISOString().split('T')[0],
              status: data.status?.includes('APTO') ? 'Vigente' : 'Pendiente',
              findings: data.details || ''
            };
            setEditingWorker({
              ...editingWorker,
              medicalExams: [...editingWorker.medicalExams, newExam]
            });
          } else {
            const newCert = {
              id: Math.random().toString(36).substr(2, 9),
              name: data.docType.replace('_', ' ') + (data.details ? `: ${data.details}` : ''),
              type: (data.docType.includes('ALTURAS') ? 'Curso Alturas' : 'Otro') as any,
              date: data.issueDate || new Date().toISOString().split('T')[0],
              expiryDate: data.expiryDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
            };
            setEditingWorker({
              ...editingWorker,
              certificates: [...(editingWorker.certificates || []), newCert]
            });
          }
          alert("IA: Información extraída y cargada correctamente.");
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error extraiendo datos:", error);
      alert("Error al procesar el archivo con IA.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const calculateStandards = (risk: number, count: number): number => {
    if (risk >= 4) return 62;
    if (count <= 10) return 7;
    if (count <= 50) return 21;
    return 62;
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.name || !newCompany.nit || !user) return;
    
    setIsLoggingIn(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .insert([{
          name: newCompany.name,
          nit: newCompany.nit,
          risk_level: newCompany.riskLevel || 1,
          worker_count: newCompany.workerCount || 0,
          sector: newCompany.sector || 'Otros',
          standards_count: newCompany.standardsCount || 7,
          completed_standards: [],
          compliance_percentage: 0,
          user_id: user.id,
          logo_url: newCompany.logoUrl || '',
          responsible_name: newCompany.responsibleName || ''
        }])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        const item = data[0];
        const newCo: Company = {
          id: item.id,
          name: item.name,
          nit: item.nit,
          riskLevel: item.risk_level,
          workerCount: item.worker_count,
          sector: item.sector,
          standardsCount: item.standards_count,
          completedStandards: item.completed_standards || [],
          compliancePercentage: item.compliance_percentage || 0,
          logoUrl: item.logo_url || '',
          responsibleName: item.responsible_name || '',
          incidences: [],
          absenteeismList: [],
          monthlyActivities: []
        };
        setCompanies([...companies, newCo]);
        setNewCompany({
          name: '',
          nit: '',
          riskLevel: 1,
          workerCount: 0,
          sector: '',
          standardsCount: 7,
          compliancePercentage: 0,
          driveFolderUrl: '',
          logoUrl: '',
          responsibleName: '',
          incidences: [],
          absenteeismList: [],
          monthlyActivities: []
        });
        alert('¡EMPRESA REGISTRADA EXITOSAMENTE EN SUPABASE! 🏢✅');
      }
    } catch (error: any) {
      console.error('Error añadiendo empresa:', error);
      alert('Error al registrar: ' + error.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAddWorker = async () => {
    if (!newWorker.name || !newWorker.role || !newWorker.companyId || !isAdmin) return;

    const id = `W-${Math.floor(1000 + Math.random() * 9000)}`;
    const worker: Worker = {
      id,
      name: newWorker.name as string,
      role: newWorker.role as string,
      companyId: newWorker.companyId as string,
      employmentStatus: (newWorker.employmentStatus as any) || 'Activo',
      riskLevel: (newWorker.riskLevel as any) || 'low',
      location: newWorker.location || 'Por asignar',
      lastCheck: new Date().toISOString(),
      status: { helmet: false, vest: false, gloves: false, glasses: false, boots: false },
      vitals: { heartRate: 75, temp: 36.6 },
      medicalExams: [],
      vaccinations: []
    };

    try {
      await setDoc(doc(db, 'workers', id), worker);
      setShowNewWorkerModal(false);
      setNewWorker({ name: '', role: '', companyId: '', employmentStatus: 'Activo', riskLevel: 'low', location: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `workers/${id}`);
    }
  };

  const [incidenceData, setIncidenceData] = useState<Partial<Incidence>>({
    type: 'Accidente',
    severity: 'Leve',
    daysLost: 0,
    date: new Date().toISOString().split('T')[0]
  });

  const handleAddIncidence = async () => {
    if (!selectedCompanyForAi || !incidenceData.workerId) return;
    setIsAnalyzing(true);
    
    try {
      const worker = workers.find(w => w.id === incidenceData.workerId);
      let investigationReport = '';
      let improvementPlan = '';
      let epsNotificationLetter = '';

      if (incidenceData.type === 'Accidente' && worker) {
        const result = await generateAccidentInvestigation(incidenceData, selectedCompanyForAi, worker);
        investigationReport = result.investigation;
        improvementPlan = result.improvementPlan;
        epsNotificationLetter = result.epsNotificationLetter;
      }

      const newIncidence: Incidence = {
        id: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
        type: (incidenceData.type as any) || 'Accidente',
        workerId: incidenceData.workerId,
        date: incidenceData.date || new Date().toISOString(),
        severity: (incidenceData.severity as any) || 'Leve',
        daysLost: incidenceData.daysLost || 0,
        description: incidenceData.description || '',
        furatDescription: incidenceData.furatDescription,
        investigationReport,
        improvementPlan,
        epsNotificationLetter,
        mitigationPlanned: improvementPlan
      };

      const updatedCompany = {
        ...selectedCompanyForAi,
        incidences: [...(selectedCompanyForAi.incidences || []), newIncidence]
      };

      setCompanies(prevCompanies => prevCompanies.map(c => c.id === selectedCompanyForAi.id ? updatedCompany : c));
      setShowIncidenceModal(false);
      // Abrir el dashboard con los datos actualizados
      setDashboardCompany(updatedCompany);
      setShowAccidentDashboard(true);
      alert('¡INCIDENCIA E INVESTIGACIÓN GENERADAS EXITOSAMENTE! ⚠️⚒️⚙️');
    } catch (error) {
      console.error('Error registrando incidencia e investigación:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const handleFileUpload = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        alert('Error al subir imagen: ' + uploadError.message);
        return null;
      }

      const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err: any) {
      console.error('Error en upload:', err);
      alert('Error inesperado al subir archivo.');
      return null;
    }
  };

  const handleToggleStandard = async (companyId: string, standardId: string) => {
    if (!isAdmin) return;
    const company = companies.find(c => c.id === companyId);
    if (!company) return;

    const isCompleted = company.completedStandards.includes(standardId);
    const newCompleted = isCompleted 
      ? company.completedStandards.filter(id => id !== standardId)
      : [...company.completedStandards, standardId];
    
    const percentage = Math.round((newCompleted.length / company.standardsCount) * 100);
    
    try {
      await updateDoc(doc(db, 'companies', companyId), {
        completedStandards: newCompleted,
        compliancePercentage: percentage
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `companies/${companyId}`);
    }
  };

  const handleSaveSurveillanceCompliance = () => {
    if (!surveillanceEditTarget) return;
    const { company, programId } = surveillanceEditTarget;
    const updatedCompany: Company = {
      ...company,
      surveillanceCompliance: {
        ...(company.surveillanceCompliance || {}),
        [programId]: {
          percentage: Math.min(100, Math.max(0, surveillanceForm.percentage)),
          lastUpdated: new Date().toISOString().slice(0, 10),
          evidence: surveillanceForm.evidence,
          responsibleName: surveillanceForm.responsibleName,
          notes: surveillanceForm.notes,
        }
      }
    };
    setCompanies(prev => prev.map(c => c.id === company.id ? updatedCompany : c));
    setShowSurveillanceModal(false);
    setSurveillanceEditTarget(null);
    setSurveillanceForm({ percentage: 0, notes: '', evidence: '', responsibleName: '' });
  };

  const handleToggleWorkerStatus = async (workerId: string) => {
    if (!isAdmin) return;
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;

    const newStatus = worker.employmentStatus === 'Activo' ? 'Retirado' : 'Activo';
    
    try {
      await updateDoc(doc(db, 'workers', workerId), { employmentStatus: newStatus });
      
      const alertId = `A-STAT-${workerId}-${Date.now()}`;
      await setDoc(doc(db, 'alerts', alertId), {
        id: alertId,
        timestamp: new Date().toISOString(),
        workerId: worker.id,
        workerName: worker.name,
        type: 'SYSTEM_UPDATE',
        severity: 'info',
        message: `Estado laboral de ${worker.name} actualizado a ${newStatus}.`
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `workers/${workerId}`);
    }
  };

  const handleDeleteWorker = async (workerId: string) => {
    if (!isAdmin) return;
    if (window.confirm('¿Está seguro de que desea eliminar este trabajador del sistema?')) {
      try {
        await deleteDoc(doc(db, 'workers', workerId));
        if (selectedWorker?.id === workerId) setSelectedWorker(null);
        if (editingWorker?.id === workerId) setEditingWorker(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `workers/${workerId}`);
      }
    }
  };

  const handleRunDiagnostics = async () => {
    setIsAnalyzing(true);
    try {
      const selectedCompany = companies.find(c => c.id === diagnosticCompanyId);
      const targetWorkers = diagnosticCompanyId === 'all' ? workers : workers.filter(w => w.companyId === diagnosticCompanyId);
      const targetAlerts = diagnosticCompanyId === 'all' ? alerts : alerts.filter(a => a.workerId && targetWorkers.find(w => w.id === a.workerId));
      
      const payload = {
        company: selectedCompany || { name: 'Todas las empresas' },
        workers: targetWorkers,
        alerts: targetAlerts,
        incidences: selectedCompany?.incidences || [],
        absenteeism: selectedCompany?.absenteeismList || [],
        monthlyActivities: selectedCompany?.monthlyActivities || []
      };

      const result = await analyzeSafetyData(payload);
      setDiagnostic(result);
    } catch (error) {
      console.error("El diagnóstico falló:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateFormat = async () => {
    if (!aiPrompt || !isAdmin) return;
    setIsAiLoading(true);
    try {
      let finalPrompt = aiPrompt;
      if (selectedCompanyForAi) {
        finalPrompt = `Actúa como un experto en SST. Genera el siguiente documento técnico solicitado por el usuario: "${aiPrompt}".
        EMPRESA: "${selectedCompanyForAi.name}"
        NIT: "${selectedCompanyForAi.nit}"
        SECTOR: "${selectedCompanyForAi.sector}"
        RESPONSABLE: "${selectedCompanyForAi.responsibleName || 'Firma autorizada'}"
        LOGO_URL: "${selectedCompanyForAi.logoUrl || ''}"
        INSTRUCCIÓN: Genera un documento técnico formal siguiendo la normativa colombiana. Incluye encabezados, tablas, y espacio para firmas. Si se proporciona LOGO_URL, inclúyelo al inicio: ![LOGO](LOGO_URL).`;
      }
      const result = await generateFormat(finalPrompt);
      setAiResponse(result);
    } catch (error) {
      console.error("Error generating format:", error);
      setAiResponse("Lo sentimos, hubo un error al generar el documento. Por favor intenta de nuevo.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleDownloadAiMonthlyReport = async () => {
    if (!diagnostic || !selectedCompanyForAi) return;
    setIsAiLoading(true);
    
    // Crear contenedor temporal para el reporte
    const reportElement = document.createElement('div');
    reportElement.className = "bg-white text-black p-20";
    reportElement.style.width = "800px";
    reportElement.innerHTML = `
      <div style="display: flex; justify-content: space-between; border-bottom: 2px solid black; padding-bottom: 20px; margin-bottom: 30px;">
        ${selectedCompanyForAi.logoUrl ? `<img src="${selectedCompanyForAi.logoUrl}" style="height: 60px;"/>` : `<div style="font-weight: bold; font-size: 24px;">AXON SST</div>`}
        <div style="text-align: right;">
          <h1 style="font-size: 18px; margin: 0; font-weight: 900;">INFORME MENSUAL DE GESTIÓN SST</h1>
          <p style="font-size: 10px; margin: 0; color: #666;">EMPRESA: ${selectedCompanyForAi.name} | NIT: ${selectedCompanyForAi.nit}</p>
          <p style="font-size: 10px; margin: 0; color: #666;">FECHA: ${new Date().toLocaleDateString()}</p>
        </div>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 14px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">1. RESUMEN EJECUTIVO</h2>
        <p style="font-size: 11px; line-height: 1.6;">${diagnostic.summary}</p>
      </div>

      <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
        <div style="border: 1px solid #eee; padding: 15px;">
          <h3 style="font-size: 10px; margin: 0 0 10px 0;">KPI: ÍNDICE DE SEGURIDAD</h3>
          <div style="font-size: 24px; font-weight: 900; color: #22c55e;">${diagnostic.safetyScore}%</div>
        </div>
        <div style="border: 1px solid #eee; padding: 15px;">
          <h3 style="font-size: 10px; margin: 0 0 10px 0;">KPI: ACCIDENTALIDAD</h3>
          <div style="font-size: 24px; font-weight: 900; color: #ef4444;">${diagnostic.accidentRate || 0}</div>
        </div>
      </div>

      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 14px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">2. PROGRAMA DE MITIGACIÓN RECOMENDADO</h2>
        <div style="font-size: 10px; line-height: 1.5; white-space: pre-wrap; background: #f9f9f9; padding: 15px;">${diagnostic.mitigationPlan}</div>
      </div>

      <div style="margin-top: 100px; display: grid; grid-template-columns: 1fr 1fr; gap: 50px;">
        <div style="border-top: 1px solid black; padding-top: 10px; text-align: center;">
          <p style="font-size: 10px; font-weight: bold; margin: 0;">${selectedCompanyForAi.responsibleName || 'Responsable SST'}</p>
          <p style="font-size: 8px; margin: 0;">Responsable del Sistema de Gestión</p>
        </div>
        <div style="border-top: 1px solid black; padding-top: 10px; text-align: center;">
          <p style="font-size: 10px; font-weight: bold; margin: 0;">${selectedCompanyForAi.legalRepresentativeName || 'Representante Legal'}</p>
          <p style="font-size: 8px; margin: 0;">Representante Legal de la Empresa</p>
        </div>
      </div>
    `;

    try {
      const opt = {
        margin: 10 as unknown as number,
        filename: `reporte-sst-${selectedCompanyForAi.name}-${new Date().toISOString().slice(0,7)}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      await html2pdf().from(reportElement).set(opt).save();
    } catch (error) {
      console.error("Error generating report:", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleDownloadInvestigationPDF = async (incidence: Incidence) => {
    if (!incidence.investigationReport || !selectedCompanyForAi) return;
    setIsAiLoading(true);
    
    const worker = workers.find(w => w.id === incidence.workerId);
    const reportElement = document.createElement('div');
    reportElement.className = "bg-white text-black p-20";
    reportElement.style.width = "800px";
    reportElement.innerHTML = `
      <div style="display: flex; justify-content: space-between; border-bottom: 2px solid black; padding-bottom: 20px; margin-bottom: 30px;">
        ${selectedCompanyForAi.logoUrl ? `<img src="${selectedCompanyForAi.logoUrl}" style="height: 60px;"/>` : `<div style="font-weight: bold; font-size: 24px;">AXON SST</div>`}
        <div style="text-align: right;">
          <h1 style="font-size: 16px; margin: 0; font-weight: 900;">INVESTIGACIÓN TÉCNICA DE ACCIDENTE</h1>
          <p style="font-size: 10px; margin: 0; color: #666;">EMPRESA: ${selectedCompanyForAi.name}</p>
          <p style="font-size: 10px; margin: 0; color: #666;">ID CASO: ${incidence.id}</p>
        </div>
      </div>
      
      <div style="background: #f4f4f4; padding: 15px; margin-bottom: 30px; font-size: 10px;">
        <strong>TRABAJADOR:</strong> ${worker?.name || 'N/A'} | <strong>CARGO:</strong> ${worker?.role || 'N/A'}<br/>
        <strong>FECHA EVENTO:</strong> ${incidence.date} | <strong>SEVERIDAD:</strong> ${incidence.severity}
      </div>

      <div style="margin-bottom: 40px;">
        <h2 style="font-size: 14px; border-bottom: 1px solid #000; padding-bottom: 5px;">I. ANÁLISIS DE CAUSALIDAD (IA)</h2>
        <div style="font-size: 11px; line-height: 1.6;">${incidence.investigationReport.replace(/\n/g, '<br/>')}</div>
      </div>

      ${incidence.improvementPlan ? `
      <div style="margin-bottom: 40px;">
        <h2 style="font-size: 14px; border-bottom: 1px solid #000; padding-bottom: 5px;">II. PLAN DE MEJORAMIENTO Y CIERRE</h2>
        <div style="font-size: 11px; line-height: 1.6; background: #fffbe6; padding: 15px; border-left: 5px solid #faad14;">${incidence.improvementPlan.replace(/\n/g, '<br/>')}</div>
      </div>
      ` : ''}

      <div style="margin-top: 80px; display: grid; grid-template-columns: 1fr 1fr; gap: 50px;">
        <div style="border-top: 1px solid black; padding-top: 10px; text-align: center;">
          <p style="font-size: 9px; font-weight: bold; margin: 0;">Firma Investigador SST</p>
          <p style="font-size: 8px; margin: 0;">Especialista en SST</p>
        </div>
        <div style="border-top: 1px solid black; padding-top: 10px; text-align: center;">
          <p style="font-size: 9px; font-weight: bold; margin: 0;">Firma Representante Legal</p>
          <p style="font-size: 8px; margin: 0;">Aceptación de Medidas</p>
        </div>
      </div>
    `;

    try {
      await html2pdf().from(reportElement).set({
        margin: 10,
        filename: `investigacion-${incidence.id}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).save();
    } catch (error) {
      console.error("Error generating investigation PDF:", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleDownloadEpsLetterPDF = async (incidence: Incidence) => {
    if (!incidence.epsNotificationLetter || !selectedCompanyForAi) return;
    setIsAiLoading(true);
    
    const worker = workers.find(w => w.id === incidence.workerId);
    const reportElement = document.createElement('div');
    reportElement.className = "bg-white text-black p-20";
    reportElement.style.width = "800px";
    reportElement.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 50px;">
        ${selectedCompanyForAi.logoUrl ? `<img src="${selectedCompanyForAi.logoUrl}" style="height: 60px;"/>` : `<div style="font-weight: bold; font-size: 24px;">${selectedCompanyForAi.name}</div>`}
        <div style="text-align: right; font-size: 10px;">
          <p style="margin: 0;">FECHA: ${new Date().toLocaleDateString()}</p>
          <p style="margin: 0;">CIUDAD: TRABAJO REMOTO / SEDE PRINCIPAL</p>
        </div>
      </div>
      
      <div style="margin-bottom: 40px; font-size: 11px;">
        <p>Señores:</p>
        <p><strong>${worker?.eps || 'ENTIDAD PROMOTORA DE SALUD (EPS)'}</strong></p>
        <p>Departamento de Riesgos Laborales / Salud Ocupacional</p>
        <p>Ciudad</p>
      </div>

      <div style="margin-bottom: 30px; font-size: 11px; text-align: center;">
        <p><strong>ASUNTO: NOTIFICACIÓN DE ACCIDENTE DE TRABAJO - TRABAJADOR ${worker?.name.toUpperCase()}</strong></p>
      </div>

      <div style="font-size: 11px; line-height: 1.8; text-align: justify; margin-bottom: 50px;">
        ${incidence.epsNotificationLetter.replace(/\n/g, '<br/>')}
      </div>

      <div style="margin-top: 100px;">
        <p style="font-size: 11px; margin: 0;">Atentamente,</p>
        <br/><br/>
        <div style="width: 250px; border-top: 1px solid black; padding-top: 5px;">
          <p style="font-size: 10px; font-weight: bold; margin: 0;">${selectedCompanyForAi.legalRepresentativeName || 'GERENCIA GENERAL'}</p>
          <p style="font-size: 9px; margin: 0;">Representante Legal</p>
          <p style="font-size: 9px; margin: 0;">${selectedCompanyForAi.name}</p>
          <p style="font-size: 9px; margin: 0;">NIT: ${selectedCompanyForAi.nit}</p>
        </div>
      </div>
    `;

    try {
      await html2pdf().from(reportElement).set({
        margin: 15,
        filename: `carta-eps-${worker?.name || 'trabajador'}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).save();
    } catch (error) {
      console.error("Error generating EPS letter:", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleDownloadAiPDF = () => {
    const element = document.getElementById('ai-printable-document');
    if (!element || !selectedCompanyForAi) {
      alert("Para descargar el PDF oficial, primero selecciona una empresa.");
      return;
    }
    
    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number],
      filename: `AXON-SST_IA-${selectedCompanyForAi.name.toUpperCase().replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save();
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-error';
      case 'medium': return 'text-secondary';
      case 'low': return 'text-primary';
      default: return 'text-on-surface-variant';
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col font-body selection:bg-primary selection:text-background">

      {/* Dashboard Ejecutivo de Accidentalidad */}
      <AnimatePresence>
        {showAccidentDashboard && dashboardCompany && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AccidentDashboard
              company={dashboardCompany}
              workers={workers}
              onClose={() => setShowAccidentDashboard(false)}
              onDownloadReport={() => {
                setSelectedCompanyForAi(dashboardCompany);
                handleDownloadAiMonthlyReport();
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navigation Bar */}
      <header className="fixed top-0 w-full z-50 flex items-center justify-between px-8 bg-background h-20 shadow-[0_0_20px_rgba(63,255,139,0.1)] border-b border-outline-variant/10">
        <div className="flex items-center gap-8">
          <span className="text-2xl font-black text-primary tracking-tighter font-headline">COMANDO CINÉTICO</span>
          <nav className="hidden md:flex gap-6">
            <button 
              onClick={() => setActiveTab('overview')}
              className={cn(
                "font-headline uppercase tracking-widest font-bold text-sm py-2 transition-all border-b-2",
                activeTab === 'overview' ? "text-primary border-primary" : "text-on-surface-variant border-transparent hover:text-on-surface"
              )}
            >
              TABLERO
            </button>
            <button 
              onClick={() => setActiveTab('surveillance')}
              className={cn(
                "font-headline uppercase tracking-widest font-bold text-sm py-2 transition-all border-b-2",
                activeTab === 'surveillance' ? "text-primary border-primary" : "text-on-surface-variant border-transparent hover:text-on-surface"
              )}
            >
              VIGILANCIA
            </button>
            <button 
              onClick={() => setActiveTab('diagnostics')}
              className={cn(
                "font-headline uppercase tracking-widest font-bold text-sm py-2 transition-all border-b-2",
                activeTab === 'diagnostics' ? "text-primary border-primary" : "text-on-surface-variant border-transparent hover:text-on-surface"
              )}
            >
              ANALÍTICA
            </button>
            <button 
              onClick={() => setActiveTab('workers')}
              className={cn(
                "font-headline uppercase tracking-widest font-bold text-sm py-2 transition-all border-b-2",
                activeTab === 'workers' ? "text-primary border-primary" : "text-on-surface-variant border-transparent hover:text-on-surface"
              )}
            >
              PERSONAL
            </button>
            <button 
              onClick={() => setActiveTab('companies')}
              className={cn(
                "font-headline uppercase tracking-widest font-bold text-sm py-2 transition-all border-b-2",
                activeTab === 'companies' ? "text-primary border-primary" : "text-on-surface-variant border-transparent hover:text-on-surface"
              )}
            >
              EMPRESAS
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
            <input 
              className="bg-surface-container-highest border-none text-xs font-label tracking-widest px-10 py-2 w-64 focus:ring-1 focus:ring-primary rounded-sm" 
              placeholder="BUSCAR EN SISTEMA..." 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4 text-primary">
            <button 
              onClick={() => setActiveTab('alerts')}
              className={cn(
                "p-2 hover:bg-surface-bright transition-colors active:scale-95 relative",
                activeTab === 'alerts' && "text-primary bg-surface-bright"
              )}
            >
              <Bell className="w-5 h-5" />
              {filteredAlerts.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-error text-[8px] font-black text-on-error flex items-center justify-center rounded-full border-2 border-background">
                  {filteredAlerts.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={cn(
                "p-2 hover:bg-surface-bright transition-colors active:scale-95",
                activeTab === 'settings' && "text-primary bg-surface-bright"
              )}
            >
              <Settings className="w-5 h-5" />
            </button>
            
            {user ? (
              <div className="flex items-center gap-3 pl-4 border-l border-outline-variant/20">
                <div className="text-right hidden sm:block">
                  <div className="text-[10px] font-black text-on-surface uppercase tracking-widest leading-none mb-1">
                    {userProfile?.role === 'admin' ? 'SST ADMIN' : (companies.find(c => c.id === userProfile?.company_id)?.name || 'USUARIO EMPRESA')}
                  </div>
                  <div className="text-[8px] font-bold text-primary uppercase tracking-tighter leading-none">
                    {userProfile?.role === 'admin' ? 'COMANDO CINÉTICO' : 'PANEL CLIENTE'}
                  </div>
                </div>
                <button 
                  onClick={logout}
                  className="p-2 hover:bg-error/10 text-on-surface-variant hover:text-error transition-all rounded-full"
                  title="Cerrar Sesión"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-end gap-2 pr-4">
                <div className="flex bg-surface-container p-1 rounded-sm">
                  <button 
                    onClick={() => setLoginMethod('magic')}
                    className={cn("px-3 py-1 text-[8px] font-black uppercase tracking-widest transition-all", loginMethod === 'magic' ? "bg-primary text-background shadow-lg" : "text-on-surface-variant hover:text-on-surface")}
                  >USUARIO SST</button>
                  <button 
                    onClick={() => setLoginMethod('password')}
                    className={cn("px-3 py-1 text-[8px] font-black uppercase tracking-widest transition-all", loginMethod === 'password' ? "bg-primary text-background shadow-lg" : "text-on-surface-variant hover:text-on-surface")}
                  >DUEÑO EMPRESA</button>
                </div>
                
                <div className="flex items-center gap-2">
                  <input 
                    type="email"
                    placeholder="CORREO@EJEMPLO.COM"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-surface-container-highest border-none text-[9px] font-label tracking-widest px-3 py-2 w-48 focus:ring-1 focus:ring-primary rounded-sm uppercase"
                  />
                  {loginMethod === 'password' && (
                    <input 
                      type="password" 
                      placeholder="CONTRASEÑA"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-surface-container-highest border-none text-[9px] font-label tracking-widest px-3 py-2 w-32 focus:ring-1 focus:ring-primary rounded-sm"
                    />
                  )}
                  <button 
                    disabled={isLoggingIn || !email}
                    onClick={async () => {
                      if (!email) return;
                      setIsLoggingIn(true);
                      try {
                        const cleanEmail = email.trim().toLowerCase();
                        if (loginMethod === 'magic') {
                          // Bypass para el usuario admin en desarrollo si hay problemas de rate limit
                          if (cleanEmail === 'alianza2026@sociedadsst26.com' && window.location.hostname === 'localhost') {
                            setUser({ id: '0f6ccf5e-2ce0-4aa4-9c43-a7256bc55e02', email: cleanEmail } as any);
                            setUserProfile({ id: '0f6ccf5e-2ce0-4aa4-9c43-a7256bc55e02', role: 'admin' });
                            return;
                          }
                          await loginWithMagicLink(cleanEmail);
                          alert('¡Enlace enviado! Revisa tu correo para entrar.');
                        } else {
                          await loginWithPassword(cleanEmail, password);
                        }
                      } catch (error: any) {
                        console.error('Error al iniciar sesión:', error);
                        alert('Error: ' + (error.message || 'Error desconocido'));
                      } finally {
                        setIsLoggingIn(false);
                      }
                    }}
                    className="px-4 py-2 bg-primary text-background font-headline font-black text-[10px] tracking-widest uppercase hover:bg-primary-container active:scale-95 transition-all rounded-sm disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_15px_rgba(63,255,139,0.3)]"
                  >
                    {isLoggingIn ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      loginMethod === 'magic' && email.toLowerCase() === 'alianza2026@sociedadsst26.com' 
                        ? 'ENTRAR COMO ADMIN' 
                        : (loginMethod === 'magic' ? 'ENVIAR ACCESO' : 'ENTRAR AL PORTAL')
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Modal para Registrar Incidencia / Ausentismo */}
            <AnimatePresence>
              {showIncidenceModal && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-background/95 backdrop-blur-md">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="w-full max-w-xl bg-surface-container-low border border-outline-variant/30 rounded-sm shadow-2xl overflow-hidden"
                  >
                    <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center bg-primary/5">
                      <div>
                        <h2 className="text-2xl font-headline font-black uppercase tracking-tighter text-on-surface">REGISTRAR EVENTO SST</h2>
                        <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mt-1">REPORTAR ACCIDENTE // INCIDENTE // AUSENTISMO</p>
                      </div>
                      <button onClick={() => setShowIncidenceModal(false)} className="p-2 hover:bg-surface-variant rounded-full"><X className="w-6 h-6" /></button>
                    </div>

                    <div className="p-8 space-y-6">
                      <div className="flex gap-4">
                        <button 
                          className="flex-1 p-4 bg-secondary/10 border border-secondary/30 text-secondary text-[10px] font-black uppercase tracking-widest rounded-sm hover:bg-secondary hover:text-background transition-all flex items-center justify-center gap-2"
                          onClick={() => document.getElementById('furat-upload')?.click()}
                        >
                          <Upload className="w-4 h-4" /> CARGAR FURAT (IA)
                        </button>
                        <input 
                          id="furat-upload"
                          type="file" 
                          className="hidden" 
                          accept="image/*,application/pdf"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setIsAnalyzing(true);
                              const base64 = await new Promise<string>((resolve) => {
                                const reader = new FileReader();
                                reader.onload = () => resolve(reader.result as string);
                                reader.readAsDataURL(file);
                              });
                              const data = await extractFuratData(base64.split(',')[1], file.type);
                              if (data) {
                                setIncidenceData({
                                  ...incidenceData,
                                  description: data.description,
                                  date: data.date,
                                  severity: data.severity,
                                  furatDescription: `Datos extraídos de FURAT: ${data.description}`
                                });
                              }
                              setIsAnalyzing(false);
                            }
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">TIPO DE EVENTO</label>
                          <select 
                            value={incidenceData.type}
                            onChange={(e) => setIncidenceData({...incidenceData, type: e.target.value as any})}
                            className="w-full bg-surface-container-highest border-none text-xs font-bold uppercase p-3 rounded-sm focus:ring-1 focus:ring-primary"
                          >
                            <option value="Accidente">ACCIDENTE LABORAL</option>
                            <option value="Incidente">INCIDENTE (CASI-ACCIDENTE)</option>
                            <option value="Ausentismo">AUSENTISMO MÉDICO</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">FECHA</label>
                          <input 
                            type="date"
                            value={incidenceData.date}
                            onChange={(e) => setIncidenceData({...incidenceData, date: e.target.value})}
                            className="w-full bg-surface-container-highest border-none text-xs font-bold p-3 rounded-sm focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">TRABAJADOR AFECTADO</label>
                        <select 
                          value={incidenceData.workerId}
                          onChange={(e) => setIncidenceData({...incidenceData, workerId: e.target.value})}
                          className="w-full bg-surface-container-highest border-none text-xs font-bold uppercase p-3 rounded-sm focus:ring-1 focus:ring-primary"
                        >
                          <option value="">SELECCIONE EL TRABAJADOR...</option>
                          {workers.filter(w => w.companyId === selectedCompanyForAi?.id).map(w => (
                            <option key={w.id} value={w.id}>{w.name.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">SEVERIDAD / CAUSA</label>
                          <select 
                            value={incidenceData.severity}
                            onChange={(e) => setIncidenceData({...incidenceData, severity: e.target.value as any})}
                            className="w-full bg-surface-container-highest border-none text-xs font-bold uppercase p-3 rounded-sm focus:ring-1 focus:ring-primary"
                          >
                            <option value="Leve">LEVE / ENFERMEDAD COMÚN</option>
                            <option value="Grave">GRAVE / ENFERMEDAD LABORAL</option>
                            <option value="Mortal">MORTAL / ACCIDENTE GRAVE</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">DÍAS PERDIDOS / INCAPACIDAD</label>
                          <input 
                            type="number"
                            value={incidenceData.daysLost}
                            onChange={(e) => setIncidenceData({...incidenceData, daysLost: parseInt(e.target.value)})}
                            className="w-full bg-surface-container-highest border-none text-xs font-bold p-3 rounded-sm focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">DESCRIPCIÓN DE LOS HECHOS</label>
                        <textarea 
                          value={incidenceData.description}
                          onChange={(e) => setIncidenceData({...incidenceData, description: e.target.value})}
                          placeholder="Describe lo sucedido para el análisis de IA..."
                          className="w-full bg-surface-container-highest border-none text-xs font-bold p-4 rounded-sm focus:ring-1 focus:ring-primary h-32 resize-none"
                        />
                      </div>

                      <button 
                        onClick={handleAddIncidence}
                        disabled={isAnalyzing}
                        className="w-full py-5 bg-primary text-background font-headline font-black text-[10px] tracking-[0.3em] uppercase hover:bg-primary-container transition-all rounded-sm flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isAnalyzing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-4 h-4" />}
                        {isAnalyzing ? 'PROCESANDO E INVESTIGANDO...' : 'REGISTRAR E INVESTIGAR CON IA'}
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>


      <div className="flex flex-1 pt-20">
        {/* Side Navigation Bar */}
        <aside className="fixed left-0 top-20 h-[calc(100vh-80px)] w-64 flex flex-col z-40 bg-surface-container-low border-r border-outline-variant/10 font-body">
          <div className="p-6 border-b border-outline-variant/15">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-2 h-2 rounded-full bg-primary led-glow-green"></div>
              <span className="text-[0.6875rem] font-bold tracking-widest text-on-surface-variant uppercase">ESTADO DEL SISTEMA</span>
            </div>
            <div className="text-primary font-headline font-bold text-lg tracking-tight uppercase">OPERACIONAL</div>
          </div>
          <nav className="flex-1 mt-4">
            <SidebarLink 
              icon={<Activity className="w-5 h-5" />} 
              label="Tablero de Control" 
              active={activeTab === 'overview'} 
              onClick={() => setActiveTab('overview')} 
            />
            <SidebarLink 
              icon={<Maximize2 className="w-5 h-5" />} 
              label="Vigilancia" 
              active={activeTab === 'surveillance'} 
              onClick={() => setActiveTab('surveillance')} 
            />
            <SidebarLink 
              icon={<Cpu className="w-5 h-5" />} 
              label="Analítica IA" 
              active={activeTab === 'diagnostics'} 
              onClick={() => setActiveTab('diagnostics')} 
            />
            <SidebarLink 
              icon={<Users className="w-5 h-5" />} 
              label="Personal" 
              active={activeTab === 'workers'} 
              onClick={() => setActiveTab('workers')} 
            />
            <SidebarLink 
              icon={<Building className="w-5 h-5" />} 
              label="Empresas" 
              active={activeTab === 'companies'} 
              onClick={() => setActiveTab('companies')} 
            />
            <SidebarLink 
              icon={<FileText className="w-5 h-5" />} 
              label="Asistente IA" 
              active={activeTab === 'ai-assistant'} 
              onClick={() => setActiveTab('ai-assistant')} 
            />
          </nav>
          <div className="mt-auto p-4 space-y-2">
            <button className="w-full bg-error text-on-error font-headline font-black py-3 text-xs tracking-widest active:scale-95 transition-transform rounded-sm">
              PARADA DE EMERGENCIA
            </button>
            <div className="flex flex-col gap-1 pt-4">
              <button className="text-on-surface-variant text-xs px-2 py-1 flex items-center gap-2 hover:text-primary transition-colors">
                <Settings className="w-3 h-3" /> Soporte
              </button>
              <button 
                onClick={handleRunDiagnostics}
                className="text-on-surface-variant text-xs px-2 py-1 flex items-center gap-2 hover:text-primary transition-colors"
              >
                <Cpu className="w-3 h-3" /> Diagnóstico
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="ml-64 flex-1 p-8 pb-14 min-h-screen bg-background">
          <AnimatePresence mode="wait">
            {activeTab === 'companies' && (
              <motion.div 
                key="companies"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-end">
                  <div>
                    <h1 className="font-headline text-5xl font-black tracking-tighter text-on-surface uppercase">
                      GESTIÓN DE <span className="text-primary">EMPRESAS</span>
                    </h1>
                    <p className="text-on-surface-variant font-label tracking-widest text-xs mt-2 uppercase">
                      ESTÁNDARES MÍNIMOS // RESOLUCIÓN 0312 // NIVEL DE RIESGO
                    </p>
                  </div>
                  {userProfile?.role !== 'admin' && (
                    <button 
                      onClick={handleDownloadReport}
                      className="px-6 py-3 bg-primary text-background font-headline font-black text-xs tracking-widest uppercase hover:bg-primary-container transition-all rounded-sm"
                    >
                      DESCARGAR REPORTE
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Formulario de Nueva Empresa */}
                  {isAdmin && (
                    <div className="md:col-span-1">
                      <div className="bg-surface-container-low p-6 rounded-sm border border-outline-variant/10">
                        <h3 className="font-headline font-black text-xs tracking-widest text-primary uppercase mb-6 flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          REGISTRAR NUEVA EMPRESA
                        </h3>
                        <form onSubmit={handleAddCompany} className="space-y-4">
                          <div>
                            <label className="block text-[8px] font-bold text-on-surface-variant uppercase tracking-tighter mb-1">Nombre Comercial</label>
                            <input 
                              type="text" 
                              required
                              value={newCompany.name}
                              onChange={(e) => setNewCompany({...newCompany, name: e.target.value})}
                              className="w-full bg-surface-container-highest border-none text-[10px] font-body px-3 py-2 rounded-sm focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold text-on-surface-variant uppercase tracking-tighter mb-1">NIT / Identificación</label>
                            <input 
                              type="text" 
                              required
                              value={newCompany.nit}
                              onChange={(e) => setNewCompany({...newCompany, nit: e.target.value})}
                              className="w-full bg-surface-container-highest border-none text-[10px] font-body px-3 py-2 rounded-sm focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[8px] font-bold text-on-surface-variant uppercase tracking-tighter mb-1">Nivel Riesgo (1-5)</label>
                              <input 
                                type="number" 
                                min="1" max="5"
                                value={newCompany.riskLevel}
                                onChange={(e) => setNewCompany({...newCompany, riskLevel: Number(e.target.value) as 1|2|3|4|5})}
                                className="w-full bg-surface-container-highest border-none text-[10px] font-body px-3 py-2 rounded-sm focus:ring-1 focus:ring-primary"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold text-on-surface-variant uppercase tracking-tighter mb-1">Estándares (0312)</label>
                              <select 
                                value={newCompany.standardsCount}
                                onChange={(e) => setNewCompany({...newCompany, standardsCount: Number(e.target.value) as 7|21|62})}
                                className="w-full bg-surface-container-highest border-none text-[10px] font-body px-3 py-2 rounded-sm focus:ring-1 focus:ring-primary"
                              >
                                <option value={7}>7 Estándares</option>
                                <option value={21}>21 Estándares</option>
                                <option value={62}>62 Estándares</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[8px] font-bold text-on-surface-variant uppercase tracking-tighter mb-1">Nombre Responsable SST</label>
                                <input 
                                  type="text" 
                                  value={newCompany.responsibleName}
                                  onChange={(e) => setNewCompany({...newCompany, responsibleName: e.target.value})}
                                  placeholder="Ej: Ing. Ana Maria Diaz"
                                  className="w-full bg-surface-container-highest border-none text-[10px] font-body px-3 py-2 rounded-sm focus:ring-1 focus:ring-primary"
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] font-bold text-on-surface-variant uppercase tracking-tighter mb-1">URL Logo Empresa (Opcional)</label>
                                <div className="flex gap-2">
                                  <input 
                                    type="url" 
                                    value={newCompany.logoUrl}
                                    onChange={(e) => setNewCompany({...newCompany, logoUrl: e.target.value})}
                                    placeholder="https://..."
                                    className="flex-1 bg-surface-container-highest border-none text-[10px] font-body px-3 py-2 rounded-sm focus:ring-1 focus:ring-primary"
                                  />
                                  <label className="cursor-pointer p-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-sm">
                                    <Upload className="w-3 h-3" />
                                    <input 
                                      type="file" 
                                      className="hidden" 
                                      accept="image/*"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const url = await handleFileUpload(file);
                                          if (url) setNewCompany({...newCompany, logoUrl: url});
                                        }
                                      }}
                                    />
                                  </label>
                                </div>
                              </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                              <label className="block text-[8px] font-bold text-on-surface-variant uppercase tracking-tighter mb-1">Sector Económico</label>
                              <input 
                                type="text" 
                                value={newCompany.sector}
                                onChange={(e) => setNewCompany({...newCompany, sector: e.target.value})}
                                className="w-full bg-surface-container-highest border-none text-[10px] font-body px-3 py-2 rounded-sm focus:ring-1 focus:ring-primary"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold text-on-surface-variant uppercase tracking-tighter mb-1">Enlace Drive (Documentación)</label>
                              <input 
                                type="url" 
                                placeholder="https://drive.google.com/..."
                                value={newCompany.driveFolderUrl}
                                onChange={(e) => setNewCompany({...newCompany, driveFolderUrl: e.target.value})}
                                className="w-full bg-surface-container-highest border-none text-[10px] font-body px-3 py-2 rounded-sm focus:ring-1 focus:ring-primary"
                              />
                            </div>
                          </div>
                          <button 
                            type="submit"
                            className="w-full mt-4 py-3 bg-primary text-background font-headline font-black text-[10px] tracking-widest uppercase hover:bg-primary-container transition-all rounded-sm flex items-center justify-center gap-2"
                          >
                            <Plus className="w-3 h-3" />
                            GUARDAR EN BASE DE DATOS
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Lista de Empresas Existentes */}
                  <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-6", isAdmin ? "md:col-span-2" : "md:col-span-3")}>
                    {filteredCompanies.map(company => (
                    <div key={company.id} className="bg-surface-container-low border border-outline-variant/10 p-6 rounded-sm space-y-6 group hover:border-primary/30 transition-all">
                      <div className="flex justify-between items-start">
                        <div className="w-12 h-12 bg-surface-container-high rounded-sm flex items-center justify-center border border-outline-variant/20 overflow-hidden">
                          {company.logoUrl ? (
                            <img src={company.logoUrl} alt={company.name} className="w-full h-full object-contain" />
                          ) : (
                            <Building className="w-6 h-6 text-primary" />
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mb-1">RIESGO {company.riskLevel}</div>
                          <div className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest">{company.responsibleName || 'SIN RESPONSABLE'}</div>
                          <div className="text-[10px] text-on-surface-variant font-mono mt-1 opacity-50">{company.nit}</div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-xl font-headline font-black uppercase tracking-tight text-on-surface">{company.name}</h3>
                        <div className="flex flex-col gap-1 mt-1">
                          <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">{company.workerCount} TRABAJADORES ACTIVOS</p>
                          <p className="text-[9px] text-primary font-bold uppercase tracking-widest">{company.sector || 'Sector no especificado'}</p>
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-outline-variant/10">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Estándares Mínimos</span>
                          <span className="text-sm font-headline font-bold text-on-surface">{company.standardsCount} REQUISITOS</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                            <span className="text-on-surface-variant">Cumplimiento</span>
                            <span className="text-primary">{company.compliancePercentage}%</span>
                          </div>
                          <div className="w-full bg-surface-variant h-1.5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${company.compliancePercentage}%` }}
                              className="bg-primary h-full"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button 
                          onClick={() => setShowStandardsModal(company)}
                          className="flex-1 py-2 bg-surface-container-high text-[10px] font-black uppercase tracking-widest hover:bg-surface-bright transition-colors border border-outline-variant/10 rounded-sm"
                        >
                          ESTÁNDARES
                        </button>
                        {company.driveFolderUrl && (
                          <a 
                            href={company.driveFolderUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex-1 py-2 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-colors border border-primary/20 rounded-sm text-center flex items-center justify-center gap-2"
                          >
                            <FileText className="w-3 h-3" />
                            GOOGLE DRIVE
                          </a>
                        )}
                        {isAdmin && (
                          <>
                            <button 
                              onClick={() => setEditingCompany(company)}
                              className="p-2 bg-surface-container-high text-primary hover:bg-primary/10 transition-colors border border-outline-variant/10 rounded-sm"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={async () => {
                                if (window.confirm('¿Está seguro de que desea eliminar esta empresa? Se perderán todos los datos asociados.')) {
                                  try {
                                    await deleteDoc(doc(db, 'companies', company.id));
                                  } catch (error) {
                                    handleFirestoreError(error, OperationType.DELETE, `companies/${company.id}`);
                                  }
                                }
                              }}
                              className="p-2 bg-surface-container-high text-error hover:bg-error/10 transition-colors border border-outline-variant/10 rounded-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'ai-assistant' && (
              <motion.div 
                key="ai-assistant"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-5xl mx-auto space-y-8"
              >
                <div className="mb-8">
                  <h1 className="font-headline text-5xl font-black tracking-tighter text-on-surface uppercase">
                    ASISTENTE <span className="text-primary">IA SST</span>
                  </h1>
                  <p className="text-on-surface-variant font-label tracking-widest text-xs mt-2 uppercase">
                    GENERACIÓN DE FORMATOS // MATRICES DE RIESGO // DOCUMENTACIÓN TÉCNICA
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-surface-container-low p-6 border border-outline-variant/10 rounded-sm space-y-4">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                        <Terminal className="w-4 h-4" /> SOLICITUD TÉCNICA
                      </h3>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Vincular a Empresa (Opcional)</label>
                        <select 
                          value={selectedCompanyForAi?.id || ''}
                          onChange={(e) => {
                            const company = companies.find(c => c.id === e.target.value);
                            setSelectedCompanyForAi(company || null);
                          }}
                          className="w-full bg-surface-container-high border border-outline-variant rounded-sm py-2 px-3 text-xs focus:outline-none focus:border-primary uppercase font-bold"
                        >
                          <option value="">-- DOCUMENTO GENÉRICO --</option>
                          {companies.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <textarea 
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Ej: Crea una matriz de riesgos GTC 45 para una empresa de construcción..."
                        className="w-full h-48 bg-surface-container-high border border-outline-variant rounded-sm p-4 text-sm focus:outline-none focus:border-primary resize-none font-mono"
                      />
                      <button 
                        onClick={handleGenerateFormat}
                        disabled={isAiLoading || !aiPrompt || !isAdmin}
                        className="w-full py-4 bg-primary text-background font-headline font-black text-xs tracking-[0.2em] uppercase hover:bg-primary-container active:scale-95 transition-all rounded-sm disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isAiLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            GENERANDO...
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4" /> GENERAR DOCUMENTO
                          </>
                        )}
                      </button>
                    </div>

                    <div className="bg-surface-container-low p-6 border border-outline-variant/10 rounded-sm space-y-4">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant">SUGERENCIAS</h3>
                      <div className="space-y-2">
                        {[
                          "Matriz de Riesgos GTC 45",
                          "Formato de Inspección de EPP",
                          "Plan de Emergencias (Esquema)",
                          "Matriz de Requisitos Legales",
                          "Formato de Reporte de Accidentes"
                        ].map((sug, i) => (
                          <button 
                            key={i}
                            onClick={() => setAiPrompt(sug)}
                            className="w-full text-left p-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary hover:bg-surface-bright transition-all border border-outline-variant/5 rounded-sm"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <div className="bg-surface-container-low border border-outline-variant/10 rounded-sm min-h-[600px] flex flex-col">
                      <div className="p-4 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container">
                        <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">VISTA PREVIA DEL DOCUMENTO</span>
                        {aiResponse && (
                          <div className="flex gap-4">
                            <button 
                              onClick={handleDownloadAiPDF}
                              disabled={!selectedCompanyForAi}
                              className="text-[10px] font-black text-secondary uppercase tracking-widest hover:underline disabled:opacity-30 flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" /> DESCARGAR PDF
                            </button>
                            <button 
                              onClick={() => {
                                const blob = new Blob([aiResponse], { type: 'text/markdown' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'formato-sst.md';
                                a.click();
                              }}
                              className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                            >
                              DESCARGAR .MD
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="p-8 flex-1 overflow-y-auto custom-scrollbar bg-surface-container-highest/20">
                        {aiResponse ? (
                          <div 
                            id="ai-printable-document" 
                            className={cn(
                              "max-w-4xl mx-auto p-12 transition-all",
                              selectedCompanyForAi ? "bg-white text-black shadow-2xl rounded-sm" : "markdown-body"
                            )}
                          >
                            {selectedCompanyForAi && (
                              <div className="space-y-8">
                                <style>{`
                                  #ai-printable-document.bg-white { color: black !important; font-family: 'Inter', sans-serif !important; }
                                  #ai-printable-document.bg-white h1, #ai-printable-document.bg-white h2, #ai-printable-document.bg-white h3 { color: black !important; border-bottom-color: #eee !important; }
                                  #ai-printable-document.bg-white .markdown-body { color: black !important; }
                                  #ai-printable-document.bg-white table { border-color: #ddd !important; }
                                  #ai-printable-document.bg-white th { background: #f4f4f4 !important; color: black !important; border-color: #ddd !important; }
                                  #ai-printable-document.bg-white td { border-color: #ddd !important; color: #333 !important; }
                                `}</style>

                                {selectedCompanyForAi.logoUrl && (
                                  <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
                                    <img src={selectedCompanyForAi.logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
                                    <div className="text-right">
                                      <h2 className="text-lg font-black uppercase m-0">{selectedCompanyForAi.name}</h2>
                                      <p className="text-[9px] font-bold text-gray-500 m-0">NIT: {selectedCompanyForAi.nit}</p>
                                    </div>
                                  </div>
                                )}

                                <div className="markdown-body">
                                  <Markdown>{aiResponse}</Markdown>
                                </div>

                                <div className="mt-16 pt-12 border-t border-gray-200 flex justify-between items-end">
                                  <div className="space-y-2 flex flex-col items-center">
                                    {selectedCompanyForAi.responsibleSignatureUrl && (
                                      <img src={selectedCompanyForAi.responsibleSignatureUrl} alt="Firma" className="h-12 w-auto object-contain mb-[-8px]" />
                                    )}
                                    <div className="w-56 h-px bg-black mb-2" />
                                    <p className="text-[9px] font-black uppercase m-0">{selectedCompanyForAi.responsibleName || 'Responsable SST'}</p>
                                    <p className="text-[8px] text-gray-400 m-0 italic">{selectedCompanyForAi.responsibleLicense || 'Sin Licencia'}</p>
                                  </div>
                                  <div className="space-y-2 flex flex-col items-center">
                                    {selectedCompanyForAi.legalRepresentativeSignatureUrl && (
                                      <img src={selectedCompanyForAi.legalRepresentativeSignatureUrl} alt="Firma Rep" className="h-12 w-auto object-contain mb-[-8px]" />
                                    )}
                                    <div className="w-56 h-px bg-black mb-2" />
                                    <p className="text-[9px] font-black uppercase m-0">{selectedCompanyForAi.legalRepresentativeName || 'Representante Legal'}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                            {!selectedCompanyForAi && (
                              <div className="markdown-body">
                                <Markdown>{aiResponse}</Markdown>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-20">
                            <FileText className="w-16 h-16" />
                            <p className="text-xs font-black uppercase tracking-[0.2em]">EL DOCUMENTO GENERADO APARECERÁ AQUÍ</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-4xl mx-auto space-y-8"
              >
                <div className="mb-8">
                  <h1 className="font-headline text-5xl font-black tracking-tighter text-on-surface uppercase">
                    CONFIGURACIÓN <span className="text-primary">DEL SISTEMA</span>
                  </h1>
                  <p className="text-on-surface-variant font-label tracking-widest text-xs mt-2 uppercase">
                    PARÁMETROS DE RED // UMBRALES DE RIESGO // GESTIÓN DE DISPOSITIVOS
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-surface-container-low p-8 border border-outline-variant/10 rounded-sm space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                      <Shield className="w-4 h-4" /> UMBRALES DE SEGURIDAD
                    </h3>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                          <span>Sensibilidad de Detección EPP</span>
                          <span className="text-primary">95%</span>
                        </div>
                        <input type="range" className="w-full accent-primary bg-surface-variant h-1 rounded-full appearance-none cursor-pointer" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                          <span>Alerta de Ritmo Cardíaco (BPM)</span>
                          <span className="text-primary">120</span>
                        </div>
                        <input type="range" className="w-full accent-primary bg-surface-variant h-1 rounded-full appearance-none cursor-pointer" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                          <span>Umbral de Temperatura (°C)</span>
                          <span className="text-primary">38.5</span>
                        </div>
                        <input type="range" className="w-full accent-primary bg-surface-variant h-1 rounded-full appearance-none cursor-pointer" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface-container-low p-8 border border-outline-variant/10 rounded-sm space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary flex items-center gap-2">
                      <Zap className="w-4 h-4" /> CONECTIVIDAD Y RED
                    </h3>
                    <div className="space-y-4">
                      {[
                        { label: 'Protocolo Zigbee 3.0', status: 'ACTIVO', color: 'text-primary' },
                        { label: 'Encriptación AES-256', status: 'ACTIVO', color: 'text-primary' },
                        { label: 'Sincronización en Nube', status: 'ACTIVO', color: 'text-primary' },
                        { label: 'Red de Respaldo 5G', status: 'STANDBY', color: 'text-on-surface-variant' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-surface-container rounded-sm border border-outline-variant/5">
                          <span className="text-[10px] font-bold text-on-surface uppercase tracking-widest">{item.label}</span>
                          <span className={cn("text-[9px] font-black uppercase tracking-[0.2em]", item.color)}>{item.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-surface-container-low p-8 border border-outline-variant/10 rounded-sm space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant flex items-center gap-2">
                      <Bell className="w-4 h-4" /> NOTIFICACIONES
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-on-surface uppercase font-medium">Alertas Críticas Sonoras</span>
                        <div className="w-10 h-5 bg-primary rounded-full relative cursor-pointer">
                          <div className="absolute right-1 top-1 w-3 h-3 bg-background rounded-full"></div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-on-surface uppercase font-medium">Reportes Diarios Automáticos</span>
                        <div className="w-10 h-5 bg-surface-variant rounded-full relative cursor-pointer">
                          <div className="absolute left-1 top-1 w-3 h-3 bg-background rounded-full"></div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-on-surface uppercase font-medium">Modo de Entrenamiento IA</span>
                        <div className="w-10 h-5 bg-primary rounded-full relative cursor-pointer">
                          <div className="absolute right-1 top-1 w-3 h-3 bg-background rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface-container-low p-8 border border-outline-variant/10 rounded-sm flex flex-col justify-between">
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-error flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> ZONA DE PELIGRO
                      </h3>
                      <p className="text-[10px] text-on-surface-variant uppercase leading-relaxed">
                        ESTAS ACCIONES SON IRREVERSIBLES Y AFECTAN LA INTEGRIDAD DE LOS DATOS DEL SISTEMA.
                      </p>
                    </div>
                    <div className="space-y-3 mt-8">
                      <button className="w-full py-3 border border-error/30 text-error font-headline font-black text-[10px] tracking-widest uppercase hover:bg-error hover:text-on-error transition-all rounded-sm">
                        REINICIAR BASE DE DATOS
                      </button>
                      <button className="w-full py-3 bg-error text-on-error font-headline font-black text-[10px] tracking-widest uppercase active:scale-95 transition-transform rounded-sm">
                        DESACTIVAR NÚCLEO AXON
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'surveillance' && (
              <motion.div 
                key="surveillance"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-10"
              >
                {/* Header */}
                <div className="flex justify-between items-end">
                  <div>
                    <h1 className="font-headline text-5xl font-black tracking-tighter text-on-surface uppercase">
                      VIGILANCIA <span className="text-primary">EPIDEMIOLÓGICA</span>
                    </h1>
                    <p className="text-on-surface-variant font-label tracking-widest text-xs mt-2 uppercase">
                      PROGRAMAS DE CONTROL // DECRETO 1072 // RES 0312 // ISO 45001 // TODOS LOS CLIENTES
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <div className="glass-panel px-4 py-2 rounded-sm border-l-2 border-primary flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-on-surface">{companies.length} EMPRESAS MONITOREADAS</span>
                    </div>
                    <div className="glass-panel px-4 py-2 rounded-sm border-l-2 border-secondary flex items-center gap-3">
                      <Activity className="w-3 h-3 text-secondary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-on-surface">{workers.filter(w => w.employmentStatus === 'Activo').length} TRABAJADORES ACTIVOS</span>
                    </div>
                  </div>
                </div>

                {/* Programas de Vigilancia — definición maestra */}
                {(() => {
                  const PROGRAMS = [
                    { id: 'psq', name: 'Riesgo Psicosocial', icon: '🧠', color: '#8B5CF6', desc: 'Batería MRL / Factores intralaborales y extralaborales', norm: 'Res. 2646/2008', weight: 15 },
                    { id: 'ergo', name: 'Ergonomía', icon: '🪑', color: '#3B82F6', desc: 'Carga física, posturas y movimientos repetitivos', norm: 'GTC 45 / ISO 9241', weight: 12 },
                    { id: 'ruido', name: 'Ruido Ocupacional', icon: '🔊', color: '#F59E0B', desc: 'Dosimetría y medición de niveles sonoros', norm: 'Res. 1792/1990', weight: 10 },
                    { id: 'quim', name: 'Riesgo Químico', icon: '⚗️', color: '#EF4444', desc: 'Exposición a agentes químicos y SVE respiratorio', norm: 'Res. 2400/1979', weight: 13 },
                    { id: 'meocup', name: 'Medicina Ocupacional', icon: '🩺', color: '#10B981', desc: 'Exámenes periódicos y seguimiento a restricciones', norm: 'Res. 2346/2007', weight: 20 },
                    { id: 'alturas', name: 'Trabajo en Alturas', icon: '🏗️', color: '#F97316', desc: 'Certificación y plan de rescate en alturas', norm: 'Res. 4272/2021', weight: 15 },
                    { id: 'calor', name: 'Estrés Térmico', icon: '🌡️', color: '#EC4899', desc: 'Exposición a ambientes calurosos o fríos', norm: 'NTC 3981', weight: 8 },
                    { id: 'covid', name: 'Riesgo Biológico', icon: '🦠', color: '#6EE7B7', desc: 'Exposición a agentes biológicos y protocolos de bioseguridad', norm: 'Dec. 539/2020', weight: 7 },
                  ];

                  // Calcular cumplimiento: prioriza datos manuales del especialista SST, luego calcula automáticamente
                  const getComplianceForProgram = (company: Company, programId: string): number => {
                    // 1. Usar dato real si fue registrado manualmente
                    if (company.surveillanceCompliance?.[programId]?.percentage !== undefined) {
                      return company.surveillanceCompliance[programId].percentage;
                    }
                    // 2. Calcular automáticamente con base en exámenes médicos vigentes
                    const compWorkers = workers.filter(w => w.companyId === company.id && w.employmentStatus === 'Activo');
                    if (compWorkers.length === 0) return 0;
                    const withExams = compWorkers.filter(w => w.medicalExams && w.medicalExams.some(e => e.status === 'Vigente'));
                    const examFactor = Math.round((withExams.length / compWorkers.length) * 100);
                    // Medicina Ocupacional usa directamente el factor de exámenes
                    if (programId === 'meocup') return examFactor;
                    // Otros programas: valor base referencial (pendiente de carga manual)
                    const baseRefs: Record<string, number> = { psq: 0, ergo: 0, ruido: 0, quim: 0, alturas: 0, calor: 0, covid: 0 };
                    return baseRefs[programId] ?? 0;
                  };

                  const getColor = (pct: number) => pct >= 85 ? '#3FFF8B' : pct >= 60 ? '#faad14' : '#ef4444';
                  const getLabel = (pct: number) => pct >= 85 ? 'CONFORME' : pct >= 60 ? 'EN PROCESO' : 'CRÍTICO';

                  // Consolidado global
                  const globalCompliance = companies.length > 0
                    ? Math.round(companies.reduce((sum, co) => {
                        const avg = PROGRAMS.reduce((s, p) => s + getComplianceForProgram(co, p.id), 0) / PROGRAMS.length;
                        return sum + avg;
                      }, 0) / companies.length)
                    : 0;

                  const criticalCount = companies.reduce((sum, co) => {
                    return sum + PROGRAMS.filter(p => getComplianceForProgram(co, p.id) < 60).length;
                  }, 0);

                  return (
                    <>
                      {/* KPI Row */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: 'Cumplimiento Global', value: `${globalCompliance}%`, sub: 'Todos los programas', color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
                          { label: 'Programas Activos', value: `${PROGRAMS.length}`, sub: 'Vigentes en sistema', color: 'text-secondary', bg: 'bg-secondary/10 border-secondary/20' },
                          { label: 'Alertas Críticas', value: `${criticalCount}`, sub: 'Nivel < 60%', color: 'text-error', bg: 'bg-error/10 border-error/20' },
                          { label: 'Empresas Activas', value: `${companies.length}`, sub: 'Con programa activo', color: 'text-on-surface', bg: 'bg-surface-container-high border-outline-variant/20' },
                        ].map((kpi, i) => (
                          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                            className={`border rounded-sm p-6 ${kpi.bg}`}>
                            <div className={`text-4xl font-headline font-black ${kpi.color} mb-1`}>{kpi.value}</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-on-surface">{kpi.label}</div>
                            <div className="text-[9px] text-on-surface-variant mt-1">{kpi.sub}</div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Barra Global de Cumplimiento */}
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                        className="bg-surface-container-low border border-outline-variant/10 rounded-sm p-8">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-on-surface-variant">CONSOLIDADO GLOBAL — TODOS LOS SISTEMAS DE VIGILANCIA</h2>
                          <span className="text-2xl font-headline font-black" style={{ color: getColor(globalCompliance) }}>{globalCompliance}%</span>
                        </div>
                        <div className="w-full h-4 bg-surface-container-high rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${globalCompliance}%` }}
                            transition={{ duration: 1.2, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ background: `linear-gradient(90deg, ${getColor(globalCompliance)}88, ${getColor(globalCompliance)})` }}
                          />
                        </div>
                        <div className="flex justify-between mt-2 text-[8px] font-black uppercase tracking-widest text-on-surface-variant">
                          <span>0% — CRÍTICO</span><span>60% — EN PROCESO</span><span>85% — CONFORME</span><span>100%</span>
                        </div>
                      </motion.div>

                      {/* Programas — Grid de tarjetas */}
                      <div>
                        <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-on-surface-variant mb-6">PROGRAMAS DE VIGILANCIA // ESTADO POR SISTEMA</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                          {PROGRAMS.map((prog, pi) => {
                            const avgPct = companies.length > 0
                              ? Math.round(companies.reduce((s, co) => s + getComplianceForProgram(co, prog.id), 0) / companies.length)
                              : 0;
                            return (
                              <motion.div key={prog.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.1 + pi * 0.06 }}
                                className="bg-surface-container-low border border-outline-variant/10 rounded-sm p-6 hover:border-primary/30 transition-all group"
                              >
                                <div className="flex items-start justify-between mb-4">
                                  <span className="text-3xl">{prog.icon}</span>
                                  <span className="text-[8px] font-black px-2 py-1 rounded-sm"
                                    style={{ background: `${getColor(avgPct)}20`, color: getColor(avgPct) }}>
                                    {getLabel(avgPct)}
                                  </span>
                                </div>
                                <h3 className="text-sm font-headline font-black uppercase tracking-tight text-on-surface mb-1">{prog.name}</h3>
                                <p className="text-[9px] text-on-surface-variant mb-1">{prog.norm}</p>
                                <p className="text-[9px] text-on-surface-variant opacity-60 mb-4 leading-relaxed">{prog.desc}</p>
                                
                                {/* Progress ring visual */}
                                <div className="flex items-center gap-3">
                                  <div className="relative w-12 h-12 shrink-0">
                                    <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                                      <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                                      <circle cx="24" cy="24" r="20" fill="none"
                                        stroke={getColor(avgPct)} strokeWidth="4"
                                        strokeDasharray={`${(avgPct / 100) * 125.6} 125.6`}
                                        strokeLinecap="round"
                                      />
                                    </svg>
                                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black" style={{ color: getColor(avgPct) }}>{avgPct}%</span>
                                  </div>
                                  <div>
                                    <div className="text-[9px] text-on-surface-variant">PESO NORMATIVO</div>
                                    <div className="text-[11px] font-black text-on-surface">{prog.weight}%</div>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Cumplimiento por empresa — tabla semáforo */}
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                        className="bg-surface-container-low border border-outline-variant/10 rounded-sm p-8">
                        <div className="flex items-center justify-between mb-8">
                          <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-on-surface-variant">MATRIZ DE CUMPLIMIENTO // EMPRESA × PROGRAMA</h2>
                          <div className="flex gap-4 text-[8px] font-black uppercase">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3FFF8B] inline-block"></span> ≥85% CONFORME</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#faad14] inline-block"></span> 60-84% EN PROCESO</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ef4444] inline-block"></span> &lt;60% CRÍTICO</span>
                          </div>
                        </div>

                        {companies.length === 0 ? (
                          <div className="text-center py-16 text-on-surface-variant text-sm opacity-40">NO HAY EMPRESAS REGISTRADAS</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-outline-variant/20">
                                  <th className="pb-4 pr-6 text-[9px] font-black uppercase tracking-widest text-on-surface-variant min-w-[160px]">EMPRESA</th>
                                  {PROGRAMS.map(p => (
                                    <th key={p.id} className="pb-4 px-3 text-[8px] font-black uppercase tracking-widest text-on-surface-variant text-center min-w-[80px]">
                                      <span title={p.name}>{p.icon}</span><br/>{p.name.split(' ')[0]}
                                    </th>
                                  ))}
                                  <th className="pb-4 pl-6 text-[9px] font-black uppercase tracking-widest text-on-surface-variant text-right">TOTAL</th>
                                </tr>
                              </thead>
                              <tbody>
                                {companies.map((co, ci) => {
                                  const pcts = PROGRAMS.map(p => getComplianceForProgram(co, p.id));
                                  const avg = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
                                  return (
                                    <motion.tr key={co.id}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: 0.05 * ci }}
                                      className="border-b border-outline-variant/10 hover:bg-surface-container-high/50 transition-colors"
                                    >
                                      <td className="py-4 pr-6">
                                        <div className="flex items-center gap-3">
                                          {co.logoUrl
                                            ? <img src={co.logoUrl} alt="" className="w-6 h-6 object-contain rounded-sm" />
                                            : <div className="w-6 h-6 bg-primary/20 rounded-sm flex items-center justify-center text-[8px] font-black text-primary">{co.name[0]}</div>
                                          }
                                          <div>
                                            <div className="text-[10px] font-black text-on-surface uppercase tracking-tight max-w-[130px] truncate">{co.name}</div>
                                            <div className="text-[8px] text-on-surface-variant">NIT: {co.nit}</div>
                                          </div>
                                        </div>
                                      </td>
                                      {pcts.map((pct, pi) => (
                                        <td key={pi} className="py-4 px-3 text-center">
                                          <div className="relative w-10 h-10 mx-auto">
                                            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                                              <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                                              <circle cx="20" cy="20" r="16" fill="none"
                                                stroke={getColor(pct)} strokeWidth="3"
                                                strokeDasharray={`${(pct / 100) * 100.5} 100.5`}
                                                strokeLinecap="round"
                                              />
                                            </svg>
                                            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black" style={{ color: getColor(pct) }}>{pct}%</span>
                                          </div>
                                        </td>
                                      ))}
                                      <td className="py-4 pl-6 text-right">
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border"
                                          style={{ background: `${getColor(avg)}15`, borderColor: `${getColor(avg)}40`, color: getColor(avg) }}>
                                          <span className="text-sm font-headline font-black">{avg}%</span>
                                          <span className="text-[7px] font-black uppercase">{getLabel(avg)}</span>
                                        </div>
                                      </td>
                                    </motion.tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </motion.div>

                      {/* Alertas de Acción Requerida */}
                      {criticalCount > 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
                          className="bg-error/5 border border-error/20 rounded-sm p-8">
                          <div className="flex items-center gap-3 mb-6">
                            <AlertTriangle className="w-5 h-5 text-error" />
                            <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-error">INTERVENCIÓN INMEDIATA REQUERIDA — {criticalCount} HALLAZGO(S)</h2>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {companies.flatMap(co =>
                              PROGRAMS
                                .filter(p => getComplianceForProgram(co, p.id) < 60)
                                .map(p => ({ co, p, pct: getComplianceForProgram(co, p.id) }))
                            ).map(({ co, p, pct }, i) => (
                              <div key={i} className="bg-error/10 border border-error/20 rounded-sm p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-lg">{p.icon}</span>
                                  <span className="text-error font-black text-sm">{pct}%</span>
                                </div>
                                <div className="text-[10px] font-black text-on-surface uppercase">{co.name}</div>
                                <div className="text-[9px] text-error mt-1">{p.name} — {p.norm}</div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </>
                  );
                })()}
              </motion.div>
            )}


            {activeTab === 'overview' && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Header & Top Status */}
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <h1 className="font-headline text-5xl font-black tracking-tighter text-on-surface uppercase">
                      TABLERO DE CONTROL <span className="text-primary">AXON SST</span>
                    </h1>
                    <p className="text-on-surface-variant font-label tracking-widest text-xs mt-2 uppercase">
                      MULTISECTORIAL // GESTIÓN INTEGRAL SST // DECRETO 1072 & ISO 45001 // RES 0312
                    </p>
                  </div>
                  <div className="flex gap-4">
                    {isAdmin && (
                      <button 
                        onClick={() => setShowNewWorkerModal(true)}
                        className="px-6 py-4 bg-primary text-background font-headline font-black text-xs tracking-[0.2em] uppercase hover:bg-primary-container active:scale-95 transition-all rounded-sm flex items-center gap-3 shadow-[0_0_20px_rgba(63,255,139,0.2)]"
                      >
                        <UserPlus className="w-5 h-5" /> REGISTRAR TRABAJADOR
                      </button>
                    )}
                    <div className="glass-panel p-4 border-l-4 border-primary flex items-center gap-6 rounded-sm">
                      <div className="text-right">
                        <div className="text-[0.6875rem] text-on-surface-variant uppercase tracking-widest font-bold">NIVEL DE AMENAZA</div>
                        <div className="text-primary font-headline text-2xl font-black">CERO / DESPEJADO</div>
                      </div>
                      <div className="w-12 h-12 rounded-full border-2 border-primary flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-primary led-glow-green animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bento Grid Layout */}
                <div className="grid grid-cols-12 gap-6 h-[600px]">
                  {/* Left Panel: Compliance & Vitals */}
                  <div className="col-span-3 flex flex-col gap-6">
                    <div className="bg-surface-container-low p-6 flex flex-col flex-1 justify-between border border-outline-variant/10 rounded-sm">
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-[0.6875rem] font-bold text-on-surface-variant tracking-tighter uppercase">CUMPLIMIENTO DE EPP</span>
                          <Shield className="w-5 h-5 text-primary" />
                        </div>
                        <div className="font-headline text-6xl font-black text-on-surface">98<span className="text-2xl text-on-surface-variant">%</span></div>
                      </div>
                      <div className="mt-4">
                        <div className="w-full bg-surface-variant h-1">
                          <div className="bg-primary h-1" style={{ width: '98%' }}></div>
                        </div>
                        <p className="text-[0.6875rem] text-on-surface-variant mt-2 uppercase">2 PERSONAL NO CONFORME (SECTOR 4)</p>
                      </div>
                    </div>
                    <div className="bg-surface-container-low p-6 flex-1 border border-outline-variant/10 rounded-sm">
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-[0.6875rem] font-bold text-on-surface-variant tracking-tighter uppercase">Escaneo Atmosférico</span>
                        <Zap className="w-5 h-5 text-secondary" />
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-on-surface-variant uppercase">NIVELES O2</span>
                          <span className="text-sm font-headline text-on-surface">20.9%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-on-surface-variant uppercase">METANO (CH4)</span>
                          <span className="text-sm font-headline text-primary">0.02%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-on-surface-variant uppercase">DENSIDAD CO2</span>
                          <span className="text-sm font-headline text-on-surface">415 PPM</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Center Panel: 3D Digital Twin */}
                  <div className="col-span-6 relative group border border-outline-variant/10 rounded-sm overflow-hidden bg-surface-container-low">
                    <div className="absolute inset-0">
                      <img 
                        alt="3D digital twin" 
                        className="w-full h-full object-cover opacity-30 grayscale contrast-125 mix-blend-screen" 
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCtztHJMJfO44jFKd32HvoLuYafj8h1vSJC9090ZOLGB_egAQs6IikRuh39okBXqG-NPtNGriCi1Tbli_7AsyhZS35OmrdflhFvDJ0mIwGo-TwGcu5NXNkKKcejNjg7qWv6cw53PaNFWairxoMlCRikN3vypldA1wGnwk3gCeH-SOMTLxpSCT1keVtLIMeYr2fOftHehoVoShMsk7-PYHbC8261e-lpXhiTZ2IVtvBzsm-OSqCfMKeBkMmn7NxxJfF-_DYLvBN_LkY"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    
                    {/* Scanning Line */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      <div className="w-full h-1 bg-primary/20 shadow-[0_0_20px_rgba(63,255,139,0.5)] animate-scan"></div>
                    </div>

                    {/* Overlay Diagnostics */}
                    <div className="absolute top-6 left-6 pointer-events-none">
                      <div className="font-headline text-xs tracking-[0.3em] text-primary/60 mb-1 uppercase">MAPEO DE TERRENO ACTIVO</div>
                      <div className="w-32 h-[1px] bg-primary/30"></div>
                    </div>
                    <div className="absolute bottom-6 right-6 flex gap-4">
                      <button className="glass-panel p-3 border border-outline-variant/15 text-primary hover:bg-primary hover:text-on-primary transition-all rounded-sm">
                        <Maximize2 className="w-5 h-5" />
                      </button>
                      <button className="glass-panel p-3 border border-outline-variant/15 text-on-surface-variant rounded-sm">
                        <Activity className="w-5 h-5" />
                      </button>
                      <button className="glass-panel p-3 border border-outline-variant/15 text-on-surface-variant rounded-sm">
                        <RefreshCw className="w-5 h-5" />
                      </button>
                    </div>
                    {/* HUD Elements */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-[80%] h-[80%] border border-primary/10 rounded-full flex items-center justify-center animate-rotate-slow">
                        <div className="w-full h-full border-t-2 border-primary/20 rounded-full"></div>
                      </div>
                      <div className="absolute w-[60%] h-[60%] border border-primary/5 rounded-full animate-rotate-reverse-slow">
                        <div className="w-full h-full border-b-2 border-primary/10 rounded-full"></div>
                      </div>
                      <div className="absolute w-4 h-4 border border-primary/40 rounded-full"></div>
                    </div>
                  </div>

                  {/* Right Panel: Telemetry & Hazards */}
                  <div className="col-span-3 flex flex-col gap-6">
                    <div className="bg-surface-container-low p-6 flex-1 border border-outline-variant/10 rounded-sm">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[0.6875rem] font-bold text-on-surface-variant tracking-tighter uppercase">NIVELES ACÚSTICOS</span>
                        <Bell className="w-5 h-5 text-primary" />
                      </div>
                      <div className="font-headline text-4xl font-bold text-on-surface">72.4<span className="text-lg ml-1 text-on-surface-variant">dB</span></div>
                      <p className="text-[0.6875rem] text-primary mt-2 font-bold uppercase">RANGO OPERATIVO SEGURO</p>
                      <div className="flex gap-1 mt-4 h-8 items-end">
                        <div className="flex-1 bg-primary h-[30%] opacity-40"></div>
                        <div className="flex-1 bg-primary h-[50%] opacity-50"></div>
                        <div className="flex-1 bg-primary h-[70%] opacity-70"></div>
                        <div className="flex-1 bg-primary h-[40%] opacity-60"></div>
                        <div className="flex-1 bg-primary h-[90%]"></div>
                        <div className="flex-1 bg-primary h-[60%] opacity-80"></div>
                      </div>
                    </div>
                    <div className="bg-surface-container-low p-6 flex-1 border border-outline-variant/10 rounded-sm">
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-[0.6875rem] font-bold text-on-surface-variant tracking-tighter uppercase">ACTIVIDAD SÍSMICA</span>
                        <Activity className="w-5 h-5 text-on-surface-variant" />
                      </div>
                      <div className="space-y-6">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-[10px] uppercase text-on-surface-variant">Pozo Principal</span>
                            <span className="text-[10px] text-primary">0.2 MM/S</span>
                          </div>
                          <div className="w-full bg-surface-variant h-1 overflow-hidden">
                            <div className="bg-primary/40 h-full w-[15%]"></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-[10px] uppercase text-on-surface-variant">Hub de Ventilación</span>
                            <span className="text-[10px] text-primary">0.8 MM/S</span>
                          </div>
                          <div className="w-full bg-surface-variant h-1 overflow-hidden">
                            <div className="bg-primary/40 h-full w-[25%]"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-surface-container p-6 border-t-2 border-primary rounded-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <Zap className="w-4 h-4 text-primary" />
                        <span className="text-[0.6875rem] font-bold text-on-surface uppercase tracking-widest">Alertas Activas</span>
                      </div>
                      <div className="text-[0.6875rem] text-on-surface-variant leading-relaxed uppercase">
                        {filteredAlerts.length > 0 
                          ? `SE DETECTARON ${filteredAlerts.length} ANOMALÍAS EN EL SECTOR. REVISAR PROTOCOLO.`
                          : "NO SE DETECTARON ANOMALÍAS CRÍTICAS EN LAS ÚLTIMAS 24H. SISTEMAS NOMINALES."}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Event Log Execution */}
                <div className="bg-surface-container-low border border-outline-variant/10 rounded-sm">
                  <div className="px-6 py-3 border-b border-outline-variant/15 flex justify-between items-center">
                    <span className="text-[0.6875rem] font-bold tracking-widest text-on-surface uppercase">REGISTRO DE EVENTOS EN TIEMPO REAL</span>
                    <span className="text-[10px] text-on-surface-variant uppercase">AUTO-ACTUALIZAR: 2S</span>
                  </div>
                  <div className="h-48 overflow-y-auto font-label">
                    {filteredAlerts.map((alert, idx) => (
                      <div key={alert.id} className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-outline-variant/10 items-center hover:bg-surface-variant/50 transition-colors">
                        <div className="col-span-2 text-[10px] text-on-surface-variant">{new Date(alert.timestamp).toLocaleTimeString()}</div>
                        <div className="col-span-1">
                          <span className={cn(
                            "text-[9px] px-2 py-0.5 font-black",
                            alert.severity === 'critical' ? "bg-error/10 text-error" : "bg-secondary/10 text-secondary"
                          )}>
                            {alert.severity === 'critical' ? 'CRÍTICO' : 'AVISO'}
                          </span>
                        </div>
                        <div className="col-span-7 text-xs text-on-surface">{alert.message}</div>
                        <div className="col-span-2 text-right"><span className="text-[10px] text-on-surface-variant">SST-CORE</span></div>
                      </div>
                    ))}
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-outline-variant/10 items-center hover:bg-surface-variant/50 transition-colors">
                      <div className="col-span-2 text-[10px] text-on-surface-variant">14:20:04.45</div>
                      <div className="col-span-1"><span className="bg-primary/10 text-primary text-[9px] px-2 py-0.5 font-black">INFO</span></div>
                      <div className="col-span-7 text-xs text-on-surface">Diagnóstico del sistema completo. Sensores de metano recalibrados para precisión del 100%.</div>
                      <div className="col-span-2 text-right"><span className="text-[10px] text-on-surface-variant">SYS-ADMIN</span></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'workers' && (
              <motion.div 
                key="workers"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-surface-container-low p-6 border border-outline-variant/10 rounded-sm space-y-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                      <h2 className="text-3xl font-headline font-black text-on-surface uppercase tracking-tighter flex items-center gap-3">
                        <Users className="w-8 h-8 text-primary" /> DIRECTORIO DE PERSONAL
                      </h2>
                      <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-[0.3em] mt-2">
                        GESTIÓN DE UNIDADES // VIGILANCIA MÉDICA // CUMPLIMIENTO SST
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4">
                      {isAdmin && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setShowNewWorkerModal(true)}
                            className="px-6 py-4 bg-primary text-background font-headline font-black text-xs tracking-[0.2rem] uppercase hover:bg-primary-container active:scale-95 transition-all rounded-sm flex items-center gap-3 shadow-[0_0_20px_rgba(63,255,139,0.2)]"
                          >
                            <UserPlus className="w-5 h-5" /> AGREGAR TRABAJADOR
                          </button>
                          
                          <label className="cursor-pointer">
                            <input 
                              type="file" 
                              className="hidden" 
                              accept=".pdf,image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setShowNewWorkerModal(true);
                                  // El modal ya tiene la lógica de IA vinculada al estado isAiLoading
                                }
                              }}
                            />
                            <div className="px-6 py-4 bg-surface-container-highest text-primary border border-primary/30 font-headline font-black text-xs tracking-[0.2rem] uppercase hover:bg-primary/10 transition-all rounded-sm flex items-center gap-3">
                              <Zap className="w-5 h-5" /> VINCULAR CON IA
                            </div>
                          </label>
                        </div>
                      )}
                      
                      <div className="flex bg-surface-container-high p-1 rounded-sm border border-outline-variant/10">
                        {['Todos', 'Activos', 'Retirados'].map((f) => (
                          <button
                            key={f}
                            onClick={() => setWorkerFilter(f as any)}
                            className={cn(
                              "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all",
                              workerFilter === f ? "bg-primary text-background" : "text-on-surface-variant hover:text-on-surface"
                            )}
                          >
                            {f}
                          </button>
                        ))}
                      </div>

                      <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant group-focus-within:text-primary transition-colors" />
                        <input 
                          type="text" 
                          placeholder="BUSCAR UNIDAD (DNI / NOMBRE)..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="bg-surface-container-high border border-outline-variant/10 rounded-sm py-4 pl-12 pr-6 text-xs font-bold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all w-72 uppercase"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-panel rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-high border-b border-outline-variant">
                        <th className="p-4 text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">ID Trabajador</th>
                        <th className="p-4 text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">Personal</th>
                        <th className="p-4 text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">Empresa / Rol</th>
                        <th className="p-4 text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">Salud / Vacunas</th>
                        <th className="p-4 text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">Estado</th>
                        <th className="p-4 text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWorkers
                        .filter(w => {
                          const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) || w.id.toLowerCase().includes(searchQuery.toLowerCase());
                          if (!matchesSearch) return false;
                          if (workerFilter === 'Activos') return w.employmentStatus === 'Activo';
                          if (workerFilter === 'Retirados') return w.employmentStatus === 'Retirado';
                          return true;
                        })
                        .map(worker => {
                        const company = companies.find(c => c.id === worker.companyId);
                        const hasMedicalAlert = worker.medicalExams.some(e => e.status === 'Vencido');
                        const hasVaccineAlert = worker.vaccinations.some(v => v.status === 'Pendiente');

                        return (
                          <tr 
                            key={worker.id} 
                            className={cn(
                              "border-b border-outline-variant hover:bg-surface-container-high transition-colors group cursor-pointer",
                              worker.employmentStatus === 'Retirado' && "opacity-60 grayscale"
                            )}
                            onClick={() => setSelectedWorker(worker)}
                          >
                            <td className="p-4 font-mono text-xs text-primary">{worker.id}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-surface-container-highest border border-outline-variant overflow-hidden">
                                  <img src={`https://picsum.photos/seed/${worker.id}/100/100`} alt={worker.name} referrerPolicy="no-referrer" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold">{worker.name}</span>
                                  <span className="text-[10px] text-on-surface-variant uppercase">{worker.role}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col">
                                <span className="text-xs font-medium text-primary">{company?.name || 'N/A'}</span>
                                <span className="text-[10px] text-on-surface-variant">{worker.location}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex gap-3">
                                <div className={cn("flex items-center gap-1", hasMedicalAlert ? "text-error" : "text-primary")}>
                                  <Stethoscope className="w-4 h-4" />
                                  <span className="text-[10px] font-bold">{worker.medicalExams.length}</span>
                                </div>
                                <div className={cn("flex items-center gap-1", hasVaccineAlert ? "text-secondary" : "text-primary")}>
                                  <Syringe className="w-4 h-4" />
                                  <span className="text-[10px] font-bold">{worker.vaccinations.length}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={cn(
                                "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border",
                                worker.employmentStatus === 'Activo' 
                                  ? "bg-primary/10 border-primary/20 text-primary" 
                                  : "bg-surface-variant border-outline-variant text-on-surface-variant"
                              )}>
                                {worker.employmentStatus}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                {isAdmin && (
                                  <>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingWorker(worker);
                                      }}
                                      className="p-2 bg-surface-container-high text-primary hover:bg-primary/10 transition-colors border border-outline-variant/10 rounded-sm"
                                    >
                                      <Settings className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteWorker(worker.id);
                                      }}
                                      className="p-2 bg-surface-container-high text-error hover:bg-error/10 transition-colors border border-outline-variant/10 rounded-sm"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                <button className="p-2 hover:bg-surface-bright rounded-md transition-colors">
                                  <ChevronRight className="w-4 h-4 text-on-surface-variant group-hover:text-primary" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'diagnostics' && (
              <motion.div 
                key="diagnostics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-6xl mx-auto space-y-10 pb-20"
              >
                {/* Header Control */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-surface-container-low p-8 border border-outline-variant/10 rounded-sm">
                  <div>
                    <h2 className="text-4xl font-headline font-black text-on-surface uppercase tracking-tighter">NÚCLEO ANALÍTICO IA</h2>
                    <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-[0.3em] mt-2">INTELIGENCIA PREDICTIVA // GESTIÓN DE INDICADORES SST</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-black uppercase text-on-surface-variant tracking-widest ml-1">CLIENTE / PROYECTO</label>
                      <select 
                        value={diagnosticCompanyId}
                        onChange={(e) => { 
                          const newId = e.target.value;
                          setDiagnosticCompanyId(newId); 
                          setDiagnostic(null);
                          const co = companies.find(c => c.id === newId);
                          setSelectedCompanyForAi(co || null);
                        }}
                        className="bg-surface-container-high border border-outline-variant/10 py-3 px-4 text-[10px] font-black uppercase tracking-widest text-primary focus:outline-none focus:border-primary rounded-sm w-64"
                      >
                        <option value="all">TODAS LAS EMPRESAS (GLOBAL)</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    
                    <button 
                      onClick={handleRunDiagnostics}
                      disabled={isAnalyzing}
                      className="px-8 py-4 bg-primary text-background font-headline font-black text-[10px] tracking-[0.2em] uppercase hover:bg-primary-container active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50 mt-4 rounded-sm"
                    >
                      {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      {isAnalyzing ? 'GENERANDO INFORMES...' : 'EJECUTAR ANÁLISIS IA'}
                    </button>

                    {diagnosticCompanyId !== 'all' && (
                      <button 
                        onClick={() => setShowIncidenceModal(true)}
                        className="px-8 py-4 bg-error/10 text-error border border-error/30 font-headline font-black text-[10px] tracking-[0.2em] uppercase hover:bg-error hover:text-background transition-all mt-4 rounded-sm flex items-center gap-2"
                      >
                        <AlertTriangle className="w-4 h-4" /> REGISTRAR EVENTO
                      </button>
                    )}
                  </div>
                </div>

                {!diagnostic ? (
                  <div className="p-32 border border-dashed border-outline-variant/20 rounded-sm flex flex-col items-center justify-center text-center space-y-8 bg-surface-container-low/30">
                    <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center border border-outline-variant/10">
                      <BarChart3 className="w-10 h-10 text-on-surface-variant opacity-20" />
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-xl font-headline font-black uppercase tracking-tight text-on-surface-variant">SISTEMA DE MANDO EN ESPERA</h3>
                       <p className="text-xs text-on-surface-variant uppercase tracking-widest max-w-sm mx-auto leading-relaxed">SELECCIONE UNA EMPRESA PARA ANALIZAR TENDENCIAS DE ACCIDENTALIDAD, AUSENTISMO Y DESEMPEÑO MENSUAL.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-12 gap-8">
                    {/* KPI CARDS */}
                    <div className="col-span-12 grid grid-cols-4 gap-6">
                      <div className="bg-surface-container-low p-6 border-b-4 border-primary rounded-sm flex flex-col items-center">
                        <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-4">SEGURIDAD GENERAL</span>
                        <div className="text-5xl font-headline font-bold text-primary">{diagnostic.safetyScore}<span className="text-sm ml-1">%</span></div>
                        <div className="text-[9px] font-black text-primary uppercase mt-2">ESTADO OPERACIONAL</div>
                      </div>
                      <div className="bg-surface-container-low p-6 border-b-4 border-error rounded-sm flex flex-col items-center">
                        <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-4">ACCIDENTALIDAD</span>
                        <div className="text-5xl font-headline font-bold text-error">{diagnostic.accidentRate || 0}</div>
                        <div className="text-[9px] font-black text-error uppercase mt-2">INCIDENTES MES</div>
                      </div>
                      <div className="bg-surface-container-low p-6 border-b-4 border-secondary rounded-sm flex flex-col items-center">
                        <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-4">AUSENTISMO</span>
                        <div className="text-5xl font-headline font-bold text-secondary">{diagnostic.absenteeismRate || 0}<span className="text-sm ml-1">D</span></div>
                        <div className="text-[9px] font-black text-secondary uppercase mt-2">DÍAS PERDIDOS</div>
                      </div>
                      <div className="bg-surface-container-low p-6 border-b-4 border-on-surface-variant rounded-sm flex flex-col items-center">
                        <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-4">ACTIVIDADES</span>
                        <div className="text-5xl font-headline font-bold text-on-surface">12</div>
                        <div className="text-[9px] font-black text-on-surface-variant uppercase mt-2">HITOS LOGRADOS</div>
                      </div>
                    </div>

                    {/* MAIN INSIGHTS */}
                    <div className="col-span-12 lg:col-span-8 space-y-8">
                      <div className="bg-surface-container-low p-8 border border-outline-variant/10 rounded-sm">
                        <div className="flex items-center gap-3 mb-6">
                          <Activity className="w-5 h-5 text-primary" />
                          <h3 className="text-xs font-black uppercase tracking-widest text-on-surface">ANÁLISIS DE INDICADORES Y TENDENCIAS</h3>
                        </div>
                        <div className="prose prose-sm prose-invert max-w-none text-on-surface-variant italic leading-relaxed">
                          "{diagnostic.summary}"
                        </div>
                      </div>

                      <div className="bg-surface-container-low p-8 border border-outline-variant/10 rounded-sm">
                        <div className="flex items-center gap-3 mb-6">
                          <CheckCircle2 className="w-5 h-5 text-secondary" />
                          <h3 className="text-xs font-black uppercase tracking-widest text-on-surface">PROGRAMA DE MITIGACIÓN IA</h3>
                        </div>
                        <div className="bg-surface-container p-6 rounded-sm border-l-4 border-secondary/50 font-label text-xs uppercase tracking-widest leading-relaxed text-on-surface-variant whitespace-pre-wrap">
                          {diagnostic.mitigationPlan}
                        </div>
                        <div className="mt-8 flex gap-4">
                           <button className="flex-1 py-4 bg-secondary/10 border border-secondary/30 text-secondary font-black text-[10px] uppercase tracking-[0.2em] hover:bg-secondary hover:text-background transition-all rounded-sm flex items-center justify-center gap-2">
                             <FileText className="w-4 h-4" /> EXPORTAR PROGRAMA A PDF
                           </button>
                           <button className="flex-1 py-4 bg-primary/10 border border-primary/30 text-primary font-black text-[10px] uppercase tracking-[0.2em] hover:bg-primary hover:text-background transition-all rounded-sm flex items-center justify-center gap-2">
                             <TrendingDown className="w-4 h-4" /> VINCULAR A CRONOGRAMA
                           </button>
                        </div>
                      </div>
                    </div>

                    {/* SIDEBAR ANALYSIS */}
                    <div className="col-span-12 lg:col-span-4 space-y-8">
                       <div className="bg-surface-container rounded-sm p-8 border-t-2 border-primary space-y-6">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">HALLAZGOS DE AUDITORÍA IA</h4>
                          <div className="space-y-4">
                            {diagnostic.findings.map((f, i) => (
                              <div key={i} className="flex gap-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/10 pb-3 last:border-0">
                                <span className="text-primary">[{i+1}]</span> {f}
                              </div>
                            ))}
                          </div>
                       </div>

                       <div className="bg-surface-container rounded-sm p-8 border-t-2 border-secondary space-y-6">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">RECOMENDACIONES CLAVE</h4>
                          <div className="space-y-4">
                            {diagnostic.recommendations.map((r, i) => (
                              <div key={i} className="flex gap-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/10 pb-3 last:border-0">
                                <div className="w-1.5 h-1.5 bg-secondary rounded-full mt-1.5 shrink-0" /> {r}
                              </div>
                            ))}
                          </div>
                          <button 
                            className="w-full py-4 bg-primary text-background font-black text-[10px] uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-[0_0_20px_rgba(63,255,139,0.3)]"
                            onClick={() => {
                              const company = companies.find(c => c.id === diagnosticCompanyId);
                              if (company) {
                                handleDownloadAiMonthlyReport();
                              }
                            }}
                          >
                            DESCARGAR REPORTE MENSUAL
                          </button>
                       </div>
                    </div>

                    {/* Historial de Investigaciones */}
                    {selectedCompanyForAi && selectedCompanyForAi.incidences && selectedCompanyForAi.incidences.length > 0 && (
                      <div className="col-span-12 bg-surface-container-low border border-outline-variant/10 rounded-sm p-8">
                        <div className="flex items-center justify-between gap-3 mb-8">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-primary" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-on-surface">CASOS REGISTRADOS E INVESTIGACIONES FORENSES</h3>
                          </div>
                          <button 
                            onClick={() => { setDashboardCompany(selectedCompanyForAi); setShowAccidentDashboard(true); }}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-background text-[9px] font-black uppercase tracking-widest rounded-sm hover:opacity-80 transition-all"
                          >
                            <BarChart3 className="w-3 h-3" /> DASHBOARD
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {selectedCompanyForAi.incidences.map(inc => (
                            <div key={inc.id} className="bg-surface-container p-6 rounded-sm border border-outline-variant/10 hover:border-primary/30 transition-all flex flex-col justify-between group">
                              <div>
                                <div className="flex justify-between items-start mb-4">
                                  <span className={cn(
                                    "px-3 py-1 rounded-sm text-[8px] font-black uppercase tracking-widest",
                                    inc.severity === 'Grave' || inc.severity === 'Mortal' ? "bg-error/20 text-error" : "bg-primary/20 text-primary"
                                  )}>
                                    {inc.severity}
                                  </span>
                                  <span className="text-[9px] font-mono text-on-surface-variant opacity-50">{inc.date}</span>
                                </div>
                                <h4 className="text-sm font-headline font-black uppercase tracking-tight text-on-surface mb-2">
                                  {workers.find(w => w.id === inc.workerId)?.name || 'Anónimo'}
                                </h4>
                                <p className="text-[10px] text-on-surface-variant line-clamp-3 mb-6 leading-relaxed">
                                  {inc.description}
                                </p>
                              </div>
                              
                              {inc.investigationReport ? (
                                <div className="flex flex-col gap-2">
                                  <button 
                                    onClick={() => handleDownloadInvestigationPDF(inc)}
                                    className="w-full py-3 bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-widest hover:bg-primary hover:text-background transition-all rounded-sm flex items-center justify-center gap-2"
                                  >
                                    <Download className="w-3 h-3" /> VER INVESTIGACIÓN
                                  </button>
                                  <button 
                                    onClick={() => handleDownloadEpsLetterPDF(inc)}
                                    className="w-full py-3 bg-secondary/10 border border-secondary/20 text-secondary text-[9px] font-black uppercase tracking-widest hover:bg-secondary hover:text-background transition-all rounded-sm flex items-center justify-center gap-2"
                                  >
                                    <Mail className="w-3 h-3" /> NOTIFICACIÓN EPS
                                  </button>
                                </div>
                              ) : (
                                <div className="w-full py-3 text-center text-[8px] font-black uppercase opacity-30 tracking-widest">
                                  INVESTIGACIÓN NO DISPONIBLE
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'alerts' && (
              <motion.div 
                key="alerts"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <h1 className="font-headline text-5xl font-black tracking-tighter text-on-surface uppercase">
                      CENTRO DE <span className="text-error">ALERTAS</span>
                    </h1>
                    <p className="text-on-surface-variant font-label tracking-widest text-xs mt-2 uppercase">
                      NOTIFICACIONES CRÍTICAS // INCIDENCIAS DE SEGURIDAD // PROTOCOLOS ACTIVOS
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="glass-panel px-6 py-3 rounded-sm border-l-4 border-error flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">CRÍTICAS</div>
                        <div className="text-error font-headline text-2xl font-black">{filteredAlerts.filter(a => a.severity === 'critical').length}</div>
                      </div>
                      <AlertTriangle className="w-8 h-8 text-error animate-pulse" />
                    </div>
                    <div className="glass-panel px-6 py-3 rounded-sm border-l-4 border-secondary flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">ADVERTENCIAS</div>
                        <div className="text-secondary font-headline text-2xl font-black">{filteredAlerts.filter(a => a.severity === 'warning').length}</div>
                      </div>
                      <Bell className="w-8 h-8 text-secondary" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex bg-surface-container-high p-1 rounded-sm border border-outline-variant/10">
                    {['Todos', 'Críticos', 'Avisos'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setAlertFilter(f as any)}
                        className={cn(
                          "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all",
                          alertFilter === f ? "bg-primary text-background" : "text-on-surface-variant hover:text-on-surface"
                        )}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">ORDENAR:</span>
                      <select 
                        value={alertSort}
                        onChange={(e) => setAlertSort(e.target.value as any)}
                        className="bg-surface-container-high border border-outline-variant/10 rounded-sm py-1.5 px-3 text-[10px] font-black uppercase tracking-widest text-on-surface focus:outline-none focus:border-primary"
                      >
                        <option value="Recientes">Recientes</option>
                        <option value="Antiguos">Antiguos</option>
                      </select>
                    </div>
                    <button 
                      onClick={() => {
                        if (window.confirm('¿Está seguro de que desea limpiar todas las alertas?')) {
                          setAlerts([]);
                        }
                      }}
                      className="px-4 py-2 bg-error/10 text-error border border-error/20 text-[10px] font-black uppercase tracking-widest hover:bg-error hover:text-on-error transition-all rounded-sm"
                    >
                      LIMPIAR TODO
                    </button>
                  </div>
                </div>

                <div className="bg-surface-container-low border border-outline-variant/10 rounded-sm overflow-hidden">
                  <div className="px-8 py-4 border-b border-outline-variant/15 bg-surface-container-high">
                    <span className="text-[10px] font-black tracking-[0.2em] text-on-surface uppercase">HISTORIAL DE INCIDENCIAS</span>
                  </div>
                  <div className="divide-y divide-outline-variant/10">
                    {filteredAlerts.length > 0 ? (
                      filteredAlerts
                        .filter(a => {
                          if (alertFilter === 'Críticos') return a.severity === 'critical';
                          if (alertFilter === 'Avisos') return a.severity === 'warning';
                          return true;
                        })
                        .sort((a, b) => {
                          const timeA = new Date(a.timestamp).getTime();
                          const timeB = new Date(b.timestamp).getTime();
                          return alertSort === 'Recientes' ? timeB - timeA : timeA - timeB;
                        })
                        .map((alert) => (
                        <div key={alert.id} className="p-6 hover:bg-surface-variant/30 transition-colors flex items-center gap-6 group">
                          <div className={cn(
                            "w-12 h-12 rounded-sm flex items-center justify-center border shrink-0",
                            alert.severity === 'critical' ? "bg-error/10 border-error/30 text-error" : "bg-secondary/10 border-secondary/30 text-secondary"
                          )}>
                            {alert.severity === 'critical' ? <AlertTriangle className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm",
                                alert.severity === 'critical' ? "bg-error text-on-error" : "bg-secondary text-on-secondary"
                              )}>
                                {alert.severity === 'critical' ? 'CRÍTICO' : 'AVISO'}
                              </span>
                              <span className="text-[10px] text-on-surface-variant font-mono uppercase tracking-widest">
                                {new Date(alert.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-on-surface uppercase tracking-tight mb-1">{alert.message}</h4>
                            <div className="flex items-center gap-4">
                              <span className="text-[10px] text-on-surface-variant uppercase tracking-widest">TRABAJADOR: <span className="text-primary">{alert.workerName} ({alert.workerId})</span></span>
                              <span className="text-[10px] text-on-surface-variant uppercase tracking-widest">TIPO: {alert.type}</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => setAlerts(alerts.filter(a => a.id !== alert.id))}
                            className="p-2 text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="p-20 text-center space-y-4">
                        <CheckCircle2 className="w-12 h-12 text-primary mx-auto opacity-20" />
                        <p className="text-xs text-on-surface-variant uppercase tracking-widest">NO HAY ALERTAS ACTIVAS EN EL SISTEMA</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
            {/* Footer Execution */}
            <footer className="fixed bottom-0 left-0 w-full z-50 flex justify-between items-center px-6 h-10 bg-black border-t border-outline-variant/15">
              <div className="font-label text-[0.6875rem] uppercase tracking-wider text-primary font-bold">
                AXON SST INTEL-PREVENT v2.4.0
              </div>
              <div className="flex gap-6">
                <span className="font-label text-[0.6875rem] uppercase tracking-wider text-on-surface-variant hover:text-primary cursor-default transition-colors">Zigbee: EN LÍNEA</span>
                <span className="font-label text-[0.6875rem] uppercase tracking-wider text-on-surface-variant hover:text-primary cursor-default transition-colors">Wi-Fi: 84% señal</span>
                <span className="font-label text-[0.6875rem] uppercase tracking-wider text-primary font-bold cursor-default">Nube: CONECTADO</span>
              </div>
            </footer>
          </AnimatePresence>
        </main>
      </div>

      {/* Worker Detail Modal */}
      <AnimatePresence>
        {selectedWorker && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedWorker(null)}
              className="absolute inset-0 bg-background/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="w-full max-w-3xl bg-surface-container-low border border-outline-variant/20 rounded-sm overflow-hidden relative z-10 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
            >
              <div className="h-40 bg-surface-container-high relative overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-primary)_0%,_transparent_70%)] opacity-30"></div>
                  <div className="grid grid-cols-12 h-full w-full">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="border-r border-outline-variant/10 h-full"></div>
                    ))}
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedWorker(null)}
                  className="absolute top-6 right-6 p-2 text-on-surface-variant hover:text-primary transition-colors z-20"
                >
                  <XCircle className="w-6 h-6" />
                </button>
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-surface-container-low to-transparent"></div>
              </div>

              <div className="px-10 pb-10 -mt-16 relative z-10">
                <div className="flex items-end gap-8 mb-10">
                  <div className="w-32 h-32 rounded-sm bg-background border-4 border-surface-container-low overflow-hidden shadow-2xl">
                    <img src={`https://picsum.photos/seed/${selectedWorker.id}/300/300`} alt={selectedWorker.name} className="w-full h-full object-cover grayscale" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-4 mb-2">
                      <h2 className="text-4xl font-headline font-black text-on-surface uppercase tracking-tighter">{selectedWorker.name}</h2>
                      <div className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest rounded-sm">
                        ID: {selectedWorker.id}
                      </div>
                    </div>
                    <p className="text-on-surface-variant font-label tracking-[0.2em] text-xs uppercase">
                      {selectedWorker.role} // {selectedWorker.location}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                        <Shield className="w-4 h-4" />
                        ESTADO DE EMPLEO
                      </h3>
                      <div className="flex items-center justify-between p-4 bg-surface-container-high border border-outline-variant/10 rounded-sm">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-2 h-2 rounded-full", selectedWorker.employmentStatus === 'Activo' ? "bg-primary" : "bg-on-surface-variant")} />
                          <span className="text-sm font-bold text-on-surface uppercase">{selectedWorker.employmentStatus}</span>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleWorkerStatus(selectedWorker.id);
                            setSelectedWorker({...selectedWorker, employmentStatus: selectedWorker.employmentStatus === 'Activo' ? 'Retirado' : 'Activo'});
                          }}
                          className="px-3 py-1.5 bg-surface-container-highest border border-outline-variant/20 text-[9px] font-black uppercase tracking-widest hover:bg-surface-bright transition-colors rounded-sm"
                        >
                          {selectedWorker.employmentStatus === 'Activo' ? 'RETIRAR' : 'RE-ACTIVAR'}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                        <Stethoscope className="w-4 h-4" />
                        EXÁMENES MÉDICOS
                      </h3>
                      <div className="space-y-2">
                        {selectedWorker.medicalExams.length > 0 ? (
                          selectedWorker.medicalExams.map(exam => (
                            <div key={exam.id} className="p-4 bg-surface-container-high border border-outline-variant/10 rounded-sm flex justify-between items-center">
                              <div>
                                <div className="text-xs font-bold text-on-surface uppercase">{exam.type}</div>
                                <div className="text-[10px] text-on-surface-variant uppercase tracking-widest">{exam.date} // EXP: {exam.expiryDate}</div>
                              </div>
                              <span className={cn(
                                "text-[9px] font-black px-2 py-0.5 rounded-sm uppercase tracking-widest",
                                exam.status === 'Vigente' ? "bg-primary/10 text-primary" : "bg-error/10 text-error"
                              )}>
                                {exam.status}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 border border-dashed border-outline-variant/30 rounded-sm text-center text-[10px] text-on-surface-variant uppercase tracking-widest">
                            SIN REGISTROS MÉDICOS
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                        <Syringe className="w-4 h-4" />
                        CICLO DE VACUNACIÓN
                      </h3>
                      <div className="space-y-2">
                        {selectedWorker.vaccinations.length > 0 ? (
                          selectedWorker.vaccinations.map(vac => (
                            <div key={vac.id} className="p-4 bg-surface-container-high border border-outline-variant/10 rounded-sm space-y-2">
                              <div className="flex justify-between items-center">
                                <div className="text-xs font-bold text-on-surface uppercase">{vac.type}</div>
                                <span className={cn(
                                  "text-[9px] font-black px-2 py-0.5 rounded-sm uppercase tracking-widest",
                                  vac.status === 'Completo' ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"
                                )}>
                                  {vac.status}
                                </span>
                              </div>
                              <div className="flex justify-between text-[9px] text-on-surface-variant uppercase tracking-widest">
                                <span>Dosis: {vac.dose}</span>
                                <span>Última: {vac.date}</span>
                              </div>
                              {vac.nextDoseDate && (
                                <div className="text-[9px] text-secondary font-bold uppercase tracking-widest">
                                  PRÓXIMA DOSIS: {vac.nextDoseDate}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="p-4 border border-dashed border-outline-variant/30 rounded-sm text-center text-[10px] text-on-surface-variant uppercase tracking-widest">
                            SIN REGISTROS DE VACUNACIÓN
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                        <Activity className="w-4 h-4" />
                        TELEMETRÍA ACTUAL
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-surface-container-high border border-outline-variant/10 rounded-sm">
                          <div className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">RITMO CARDÍACO</div>
                          <div className="text-2xl font-headline font-black text-on-surface">{selectedWorker.vitals.heartRate}<span className="text-xs ml-1 text-on-surface-variant">BPM</span></div>
                        </div>
                        <div className="p-4 bg-surface-container-high border border-outline-variant/10 rounded-sm">
                          <div className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">TEMPERATURA</div>
                          <div className="text-2xl font-headline font-black text-on-surface">{selectedWorker.vitals.temp}<span className="text-xs ml-1 text-on-surface-variant">°C</span></div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                        <Shield className="w-4 h-4" />
                        CUMPLIMIENTO DE EPP
                      </h3>
                      <div className="grid grid-cols-1 gap-2">
                        <PPEStatusItem label="Casco de Seguridad" active={selectedWorker.status.helmet} icon={<HardHat className="w-4 h-4" />} />
                        <PPEStatusItem label="Chaleco Reflectivo" active={selectedWorker.status.vest} icon={<Activity className="w-4 h-4" />} />
                        <PPEStatusItem label="Guantes de Protección" active={selectedWorker.status.gloves} icon={<Hand className="w-4 h-4" />} />
                        <PPEStatusItem label="Gafas de Seguridad" active={selectedWorker.status.glasses} icon={<Eye className="w-4 h-4" />} />
                        <PPEStatusItem label="Botas de Seguridad" active={selectedWorker.status.boots} icon={<Footprints className="w-4 h-4" />} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Worker Modal */}
      <AnimatePresence>
        {showNewWorkerModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewWorkerModal(false)}
              className="absolute inset-0 bg-background/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="w-full max-w-md bg-surface-container-low border border-outline-variant/20 rounded-sm overflow-hidden relative z-10 p-8 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-headline font-black text-on-surface uppercase tracking-tighter">NUEVO TRABAJADOR</h2>
                <XCircle className="w-6 h-6 text-on-surface-variant cursor-pointer" onClick={() => setShowNewWorkerModal(false)} />
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Nombre Completo</label>
                  <input 
                    type="text" 
                    value={newWorker.name}
                    onChange={e => setNewWorker({...newWorker, name: e.target.value})}
                    className="w-full bg-surface-container-high border border-outline-variant rounded-sm py-3 px-4 text-sm focus:outline-none focus:border-primary"
                    placeholder="Ej: Juan Pérez"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Cargo / Rol</label>
                  <input 
                    type="text" 
                    value={newWorker.role}
                    onChange={e => setNewWorker({...newWorker, role: e.target.value})}
                    className="w-full bg-surface-container-high border border-outline-variant rounded-sm py-3 px-4 text-sm focus:outline-none focus:border-primary"
                    placeholder="Ej: Operario de Alturas"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Empresa Asignada</label>
                  <select 
                    value={newWorker.companyId}
                    onChange={e => setNewWorker({...newWorker, companyId: e.target.value})}
                    className="w-full bg-surface-container-high border border-outline-variant rounded-sm py-3 px-4 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="">Seleccionar empresa...</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Nivel de Riesgo</label>
                    <select 
                      value={newWorker.riskLevel}
                      onChange={e => setNewWorker({...newWorker, riskLevel: e.target.value as any})}
                      className="w-full bg-surface-container-high border border-outline-variant rounded-sm py-3 px-4 text-sm focus:outline-none focus:border-primary"
                    >
                      <option value="low">Bajo</option>
                      <option value="medium">Medio</option>
                      <option value="high">Alto</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Estado Laboral</label>
                    <select 
                      value={newWorker.employmentStatus}
                      onChange={e => setNewWorker({...newWorker, employmentStatus: e.target.value as any})}
                      className="w-full bg-surface-container-high border border-outline-variant rounded-sm py-3 px-4 text-sm focus:outline-none focus:border-primary"
                    >
                      <option value="Activo">Activo</option>
                      <option value="Retirado">Retirado</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Ubicación / Sede</label>
                  <input 
                    type="text" 
                    value={newWorker.location || ''}
                    onChange={e => setNewWorker({...newWorker, location: e.target.value})}
                    className="w-full bg-surface-container-high border border-outline-variant rounded-sm py-3 px-4 text-sm focus:outline-none focus:border-primary"
                    placeholder="Ej: Planta Principal, Sector G"
                  />
                </div>
              </div>
              {companies.length === 0 && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-sm flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-error" />
                  <span className="text-[10px] text-error font-bold uppercase">Debe agregar una empresa primero</span>
                </div>
              )}
              <button 
                onClick={handleAddWorker}
                disabled={!newWorker.name || !newWorker.role || !newWorker.companyId || companies.length === 0}
                className="w-full py-4 bg-primary text-background font-headline font-black text-xs tracking-[0.2em] uppercase hover:bg-primary-container active:scale-95 transition-all rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                REGISTRAR TRABAJADOR
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Company Modal */}
      <AnimatePresence>
        {showNewCompanyModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewCompanyModal(false)}
              className="absolute inset-0 bg-background/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="w-full max-w-md bg-surface-container-low border border-outline-variant/20 rounded-sm overflow-hidden relative z-10 p-8 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-headline font-black text-on-surface uppercase tracking-tighter">NUEVA EMPRESA</h2>
                <XCircle className="w-6 h-6 text-on-surface-variant cursor-pointer" onClick={() => setShowNewCompanyModal(false)} />
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Nombre de la Empresa</label>
                  <input 
                    type="text" 
                    value={newCompany.name}
                    onChange={e => setNewCompany({...newCompany, name: e.target.value})}
                    className="w-full bg-surface-container-high border border-outline-variant rounded-sm py-3 px-4 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">NIT</label>
                  <input 
                    type="text" 
                    value={newCompany.nit}
                    onChange={e => setNewCompany({...newCompany, nit: e.target.value})}
                    className="w-full bg-surface-container-high border border-outline-variant rounded-sm py-3 px-4 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Nivel de Riesgo</label>
                    <select 
                      value={newCompany.riskLevel}
                      onChange={e => setNewCompany({...newCompany, riskLevel: parseInt(e.target.value) as any})}
                      className="w-full bg-surface-container-high border border-outline-variant rounded-sm py-3 px-4 text-sm focus:outline-none focus:border-primary"
                    >
                      {[1, 2, 3, 4, 5].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Nro. Trabajadores</label>
                    <input 
                      type="number" 
                      value={newCompany.workerCount}
                      onChange={e => setNewCompany({...newCompany, workerCount: parseInt(e.target.value)})}
                      className="w-full bg-surface-container-high border border-outline-variant rounded-sm py-3 px-4 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Sector Económico</label>
                  <select 
                    value={newCompany.sector}
                    onChange={e => setNewCompany({...newCompany, sector: e.target.value})}
                    className="w-full bg-surface-container-high border border-outline-variant rounded-sm py-3 px-4 text-sm focus:outline-none focus:border-primary"
                  >
                    {[
                      "Agricultura/Pesca",
                      "Minas y Canteras",
                      "Manufactura",
                      "Electricidad/Gas",
                      "Construcción",
                      "Comercio",
                      "Transporte",
                      "Alojamiento/Comida",
                      "Información/Comunicaciones",
                      "Financiero/Seguros",
                      "Inmobiliario",
                      "Educación",
                      "Salud",
                      "Otros"
                    ].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">URL Carpeta Drive (Origen Manual)</label>
                  <input 
                    type="url" 
                    value={newCompany.driveFolderUrl}
                    onChange={e => setNewCompany({...newCompany, driveFolderUrl: e.target.value})}
                    className="w-full bg-surface-container-high border border-outline-variant rounded-sm py-3 px-4 text-sm focus:outline-none focus:border-primary"
                    placeholder="https://drive.google.com/..."
                  />
                </div>
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Estándares a Cumplir</span>
                    <span className="text-xl font-headline font-black text-primary">
                      {calculateStandards(newCompany.riskLevel || 1, newCompany.workerCount || 0)}
                    </span>
                  </div>
                  <p className="text-[9px] text-on-surface-variant mt-1 uppercase tracking-tight">
                    Según Resolución 0312 (Riesgo {newCompany.riskLevel} // {newCompany.workerCount} emp.)
                  </p>
                </div>
              </div>
              <button 
                onClick={handleAddCompany}
                className="w-full py-4 bg-primary text-background font-headline font-black text-xs tracking-[0.2em] uppercase hover:bg-primary-container active:scale-95 transition-all rounded-sm"
              >
                REGISTRAR EMPRESA
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Standards Compliance Modal */}
      <AnimatePresence>
        {showStandardsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStandardsModal(null)}
              className="absolute inset-0 bg-background/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="w-full max-w-2xl bg-surface-container-low border border-outline-variant/20 rounded-sm overflow-hidden relative z-10 p-8 space-y-6"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-headline font-black text-on-surface uppercase tracking-tighter">ESTÁNDARES MÍNIMOS</h2>
                  <p className="text-[10px] text-primary font-black uppercase tracking-widest">{showStandardsModal.name} // RESOLUCIÓN 0312</p>
                </div>
                <XCircle className="w-6 h-6 text-on-surface-variant cursor-pointer" onClick={() => setShowStandardsModal(null)} />
              </div>

              <div className="bg-surface-container-high p-4 rounded-sm border border-outline-variant/10 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">PROGRESO DE CUMPLIMIENTO</span>
                  <span className="text-2xl font-headline font-black text-primary">{showStandardsModal.compliancePercentage}%</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">REQUISITOS COMPLETADOS</span>
                  <div className="text-sm font-bold text-on-surface">{showStandardsModal.completedStandards.length} / {showStandardsModal.standardsCount}</div>
                </div>
              </div>

              <div className="max-h-[500px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {STANDARDS.filter(s => s.level <= showStandardsModal.standardsCount).map(standard => (
                  <div key={standard.id} className="space-y-2">
                    <div 
                      onClick={() => setSelectedStandardId(selectedStandardId === standard.id ? null : standard.id)}
                      className={cn(
                        "p-4 border rounded-sm flex items-center justify-between cursor-pointer transition-all",
                        showStandardsModal.completedStandards.includes(standard.id)
                          ? "bg-primary/5 border-primary/30"
                          : "bg-surface-container-high border-outline-variant/10 hover:border-primary/20",
                        selectedStandardId === standard.id && "border-primary shadow-[0_0_15px_rgba(63,255,139,0.1)]"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStandard(showStandardsModal.id, standard.id);
                          }}
                          className={cn(
                            "w-5 h-5 rounded-sm border flex items-center justify-center transition-all",
                            showStandardsModal.completedStandards.includes(standard.id)
                              ? "bg-primary border-primary text-background line-through"
                              : "border-outline-variant"
                          )}
                        >
                          {showStandardsModal.completedStandards.includes(standard.id) && <CheckCircle2 className="w-3 h-3" />}
                        </div>
                        <span className={cn(
                          "text-xs font-medium uppercase tracking-tight",
                          showStandardsModal.completedStandards.includes(standard.id) ? "text-on-surface" : "text-on-surface-variant"
                        )}>
                          {standard.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {showStandardsModal.standardDocs?.[standard.id] && (
                          <div className="w-2 h-2 rounded-full bg-primary led-glow-green" title="Documento Vinculado" />
                        )}
                        <ChevronRight className={cn("w-4 h-4 transition-transform", selectedStandardId === standard.id && "rotate-90 text-primary")} />
                      </div>
                    </div>

                    <AnimatePresence>
                      {selectedStandardId === standard.id && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-surface-container-highest/30 border-x border-b border-outline-variant/10 p-6 rounded-b-sm space-y-6"
                        >
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-4">
                              <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                                <Cpu className="w-3 h-3" /> INTELIGENCIA GENERATIVA
                              </h4>
                              <button 
                                onClick={async () => {
                                  alert("INICIANDO GENERACIÓN CON AXON IA... ⚡");
                                  setIsGeneratingDoc(true);
                                  try {
                                    const prompt = `Actúa como un experto en SST. Crea un formato técnico profesional para el estándar: "${standard.title}" de la Resolución 0312.
                                    EMPRESA: "${showStandardsModal.name}"
                                    NIT: "${showStandardsModal.nit}"
                                    SECTOR: "${showStandardsModal.sector}"
                                    RESPONSABLE: "${showStandardsModal.responsibleName || 'Firma autorizada'}"
                                    LOGO_URL: "${showStandardsModal.logoUrl || ''}"
                                    INSTRUCCIÓN: Sigue un modelo de documento legal oficial de Colombia. Incluye encabezados, tablas de control, firmas y objetivos claros. Sé técnico y detallado. Si se proporciona LOGO_URL, inclúyelo al inicio del documento con formato Markdown: ![LOGO](LOGO_URL).`;
                                    const content = await generateFormat(prompt);
                                    setGeneratedDocCompany(showStandardsModal);
                                    setGeneratedDoc(content);
                                    alert("¡BORRADOR LISTO! Mira el documento en la pantalla central.");
                                  } catch (err: any) {
                                    alert("Error al generar: " + err.message);
                                  } finally {
                                    setIsGeneratingDoc(false);
                                  }
                                }}
                                disabled={isGeneratingDoc}
                                className="w-full py-4 bg-primary text-background font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(63,255,139,0.3)]"
                              >
                                {isGeneratingDoc ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                {isGeneratingDoc ? 'GENERANDO BORRADOR...' : 'GENERAR BORRADOR CON IA'}
                              </button>
                            </div>

                            <div className="space-y-4">
                              <h4 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] flex items-center gap-2">
                                <FileText className="w-3 h-3" /> VINCULAR DOCUMENTO DRIVE
                              </h4>
                              <div className="flex gap-2">
                                <input 
                                  type="url" 
                                  placeholder="ENLACE DEL DOCUMENTO..."
                                  defaultValue={showStandardsModal.standardDocs?.[standard.id] || ''}
                                  onBlur={async (e) => {
                                    const url = e.target.value;
                                    if (!url) return;
                                    const updatedDocs = { ...(showStandardsModal.standardDocs || {}), [standard.id]: url };
                                    try {
                                      await updateDoc(doc(db, 'companies', showStandardsModal.id), { standardDocs: updatedDocs });
                                      setShowStandardsModal({ ...showStandardsModal, standardDocs: updatedDocs });
                                    } catch (err) {
                                      console.error("Error vinculando documento:", err);
                                    }
                                  }}
                                  className="flex-1 bg-surface-container-high border-none text-[10px] px-3 py-2 rounded-sm focus:ring-1 focus:ring-primary"
                                />
                                {showStandardsModal.standardDocs?.[standard.id] && (
                                  <a 
                                    href={showStandardsModal.standardDocs[standard.id]} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="p-2 bg-primary text-background rounded-sm hover:bg-primary-container transition-colors"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* El recuadro de prevista ha sido removido de aquí para usar el Modal global */}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    setSelectedStandardId(null);
                    setGeneratedDoc(null);
                    setGeneratedDocCompany(null);
                    setShowStandardsModal(null);
                  }}
                  className="flex-1 py-4 border border-outline-variant text-on-surface font-headline font-black text-xs tracking-[0.2em] uppercase hover:bg-surface-bright transition-all rounded-sm"
                >
                  CERRAR PANEL
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Edit Company Modal */}
      <AnimatePresence>
        {editingCompany && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingCompany(null)}
              className="absolute inset-0 bg-background/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="w-full max-w-md bg-surface-container-low border border-outline-variant/20 rounded-sm overflow-hidden relative z-10 p-8 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-headline font-black text-on-surface uppercase tracking-tighter">EDITAR EMPRESA</h2>
                <XCircle className="w-6 h-6 text-on-surface-variant cursor-pointer" onClick={() => setEditingCompany(null)} />
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Nombre de la Empresa</label>
                  <input 
                    type="text" 
                    value={editingCompany.name}
                    onChange={e => setEditingCompany({...editingCompany, name: e.target.value})}
                    className="w-full bg-surface-container-high border border-outline-variant rounded-sm py-3 px-4 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">NIT</label>
                  <input 
                    type="text" 
                    value={editingCompany.nit}
                    onChange={e => setEditingCompany({...editingCompany, nit: e.target.value})}
                    className="w-full bg-surface-container-high border border-outline-variant rounded-sm py-3 px-4 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Nivel de Riesgo</label>
                    <select 
                      value={editingCompany.riskLevel}
                      onChange={e => setEditingCompany({...editingCompany, riskLevel: parseInt(e.target.value) as any})}
                      className="w-full bg-surface-container-high border border-outline-variant rounded-sm py-3 px-4 text-sm focus:outline-none focus:border-primary"
                    >
                      {[1, 2, 3, 4, 5].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Nro. Trabajadores</label>
                    <input 
                      type="number" 
                      value={editingCompany.workerCount}
                      onChange={e => setEditingCompany({...editingCompany, workerCount: parseInt(e.target.value)})}
                      className="w-full bg-surface-container-high border border-outline-variant rounded-sm py-3 px-4 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Sector Económico</label>
                  <select 
                    value={editingCompany.sector}
                    onChange={e => setEditingCompany({...editingCompany, sector: e.target.value})}
                    className="w-full bg-surface-container-high border border-outline-variant rounded-sm py-3 px-4 text-sm focus:outline-none focus:border-primary"
                  >
                    {[
                      "Agricultura/Pesca",
                      "Minas y Canteras",
                      "Manufactura",
                      "Electricidad/Gas",
                      "Construcción",
                      "Comercio",
                      "Transporte",
                      "Alojamiento/Comida",
                      "Información/Comunicaciones",
                      "Financiero/Seguros",
                      "Inmobiliario",
                      "Educación",
                      "Salud",
                      "Otros"
                    ].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Nombre Responsable SST</label>
                  <input 
                    type="text" 
                    value={editingCompany.responsibleName || ''}
                    onChange={e => setEditingCompany({...editingCompany, responsibleName: e.target.value})}
                    placeholder="Ej: Ing. Ana Maria Diaz"
                    className="w-full bg-surface-container-high border border-outline-variant rounded-sm py-3 px-4 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Licencia SST Responsable</label>
                    <input 
                      type="text" 
                      value={editingCompany.responsibleLicense || ''}
                      onChange={e => setEditingCompany({...editingCompany, responsibleLicense: e.target.value})}
                      placeholder="Ej: Lic. 12345-2024"
                      className="w-full bg-surface-container-high border border-outline-variant rounded-sm py-3 px-4 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Firma Responsable</label>
                    <label className="cursor-pointer h-[46px] w-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-sm flex items-center justify-center gap-2 transition-all">
                      {editingCompany.responsibleSignatureUrl ? <CheckCircle2 className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                      <span className="text-[10px] font-black uppercase">{editingCompany.responsibleSignatureUrl ? 'CARGADA' : 'SUBIR'}</span>
                      <input 
                        type="file" className="hidden" accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = await handleFileUpload(file);
                            if (url) setEditingCompany({...editingCompany, responsibleSignatureUrl: url});
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Representante Legal (Dueño)</label>
                  <input 
                    type="text" 
                    value={editingCompany.legalRepresentativeName || ''}
                    onChange={e => setEditingCompany({...editingCompany, legalRepresentativeName: e.target.value})}
                    placeholder="Ej: Carlos Rodriguez"
                    className="w-full bg-surface-container-high border border-outline-variant rounded-sm py-3 px-4 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Firma Representante Legal</label>
                  <label className="cursor-pointer h-[46px] w-full bg-secondary/10 text-secondary hover:bg-secondary/20 border border-secondary/20 rounded-sm flex items-center justify-center gap-2 transition-all">
                    {editingCompany.legalRepresentativeSignatureUrl ? <CheckCircle2 className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                    <span className="text-[10px] font-black uppercase">{editingCompany.legalRepresentativeSignatureUrl ? 'CARGADA' : 'SUBIR FIRMA'}</span>
                    <input 
                      type="file" className="hidden" accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = await handleFileUpload(file);
                          if (url) setEditingCompany({...editingCompany, legalRepresentativeSignatureUrl: url});
                        }
                      }}
                    />
                  </label>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">URL Logo Empresa</label>
                  <div className="flex gap-2">
                    <input 
                      type="url" 
                      value={editingCompany.logoUrl || ''}
                      onChange={e => setEditingCompany({...editingCompany, logoUrl: e.target.value})}
                      placeholder="https://imgur.com/logo.png"
                      className="flex-1 bg-surface-container-high border border-outline-variant rounded-sm py-3 px-4 text-sm focus:outline-none focus:border-primary"
                    />
                    <label className="cursor-pointer p-3 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-sm flex items-center">
                      <Upload className="w-4 h-4" />
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = await handleFileUpload(file);
                            if (url) setEditingCompany({...editingCompany, logoUrl: url});
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">URL Carpeta Drive (Origen Manual)</label>
                  <input 
                    type="url" 
                    value={editingCompany.driveFolderUrl || ''}
                    onChange={e => setEditingCompany({...editingCompany, driveFolderUrl: e.target.value})}
                    className="w-full bg-surface-container-high border border-outline-variant rounded-sm py-3 px-4 text-sm focus:outline-none focus:border-primary"
                    placeholder="https://drive.google.com/..."
                  />
                </div>
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Nuevos Estándares</span>
                    <span className="text-xl font-headline font-black text-primary">
                      {calculateStandards(editingCompany.riskLevel, editingCompany.workerCount)}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={async () => {
                  if (!isAdmin) return;
                  const standards = calculateStandards(editingCompany.riskLevel, editingCompany.workerCount);
                  try {
                    await updateDoc(doc(db, 'companies', editingCompany.id), {
                      ...editingCompany,
                      standardsCount: standards
                    });
                    setEditingCompany(null);
                  } catch (error) {
                    handleFirestoreError(error, OperationType.UPDATE, `companies/${editingCompany.id}`);
                  }
                }}
                className="w-full py-4 bg-primary text-background font-headline font-black text-xs tracking-[0.2em] uppercase hover:bg-primary-container active:scale-95 transition-all rounded-sm"
              >
                GUARDAR CAMBIOS
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Worker Modal */}
      <AnimatePresence>
        {editingWorker && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingWorker(null)}
              className="absolute inset-0 bg-background/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="w-full max-w-3xl bg-surface-container-low border border-outline-variant/20 rounded-sm overflow-hidden relative z-10 p-8 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-headline font-black text-on-surface uppercase tracking-tighter">EDITAR TRABAJADOR</h2>
                <XCircle className="w-6 h-6 text-on-surface-variant cursor-pointer" onClick={() => setEditingWorker(null)} />
              </div>
              
              <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-4 custom-scrollbar">
                {/* SECCIÓN DE CARGA IA */}
                <div className="p-5 bg-primary/10 border border-primary/30 rounded-sm space-y-4 shadow-[0_0_20px_rgba(63,255,139,0.1)]">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <Zap className="w-4 h-4" /> ASISTENTE DE CARGA INTELIGENTE
                      </h3>
                      <p className="text-[9px] text-on-surface-variant uppercase font-bold mt-1">Sube una foto del examen médico o curso para autollenar todo.</p>
                    </div>
                    <label className="cursor-pointer px-5 py-3 bg-primary text-background text-[10px] font-black uppercase tracking-widest rounded-sm hover:scale-105 transition-all flex items-center gap-2">
                      {isAiLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      {isAiLoading ? 'EXTRAYENDO...' : 'SUBIR DOCUMENTO'}
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*,application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAutoFillDocument(file);
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* DATOS BÁSICOS */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant border-b border-outline-variant pb-2">DATOS DE IDENTIDAD</h3>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Nombre Completo</label>
                      <input 
                        type="text" value={editingWorker.name}
                        onChange={e => setEditingWorker({...editingWorker, name: e.target.value})}
                        className="w-full bg-surface-container-high border border-outline-variant rounded-sm py-3 px-4 text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Cargo / Rol</label>
                      <input 
                        type="text" value={editingWorker.role}
                        onChange={e => setEditingWorker({...editingWorker, role: e.target.value})}
                        className="w-full bg-surface-container-high border border-outline-variant rounded-sm py-3 px-4 text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Vincular a Empresa</label>
                      <select 
                        value={editingWorker.companyId}
                        onChange={e => setEditingWorker({...editingWorker, companyId: e.target.value})}
                        className="w-full bg-surface-container-high border border-outline-variant rounded-sm py-3 px-4 text-sm focus:outline-none focus:border-primary"
                      >
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Estado Laboral</label>
                      <select 
                        value={editingWorker.employmentStatus}
                        onChange={e => setEditingWorker({...editingWorker, employmentStatus: e.target.value as any})}
                        className="w-full bg-surface-container-high border border-outline-variant rounded-sm py-3 px-4 text-sm focus:outline-none focus:border-primary"
                      >
                        <option value="Activo">Activo</option>
                        <option value="Retirado">Retirado</option>
                      </select>
                    </div>
                  </div>

                  {/* MATRIZ DE CUMPLIMIENTO */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant border-b border-outline-variant pb-2">MATRIZ DE CUMPLIMIENTO</h3>
                    
                    <div className="space-y-3">
                       <p className="text-[9px] font-black text-primary uppercase flex items-center gap-2"><ShieldCheck className="w-3 h-3" /> Exámenes Médicos</p>
                       {editingWorker.medicalExams.map((exam, idx) => (
                        <div key={exam.id} className="p-3 bg-surface-container rounded-sm border border-outline-variant/10 flex justify-between items-center group">
                          <div>
                            <p className="text-[10px] font-black text-on-surface uppercase">{exam.type}</p>
                            <p className={cn(
                              "text-[8px] font-bold uppercase",
                              new Date(exam.expiryDate) < new Date() ? "text-error" : "text-primary"
                            )}>Vence: {exam.expiryDate}</p>
                          </div>
                          <button onClick={() => {
                            const n = [...editingWorker.medicalExams]; n.splice(idx,1); setEditingWorker({...editingWorker, medicalExams: n});
                          }} className="text-on-surface-variant hover:text-error transition-colors"><Trash2 className="w-3 h-3" /></button>
                        </div>
                       ))}

                       <p className="text-[9px] font-black text-secondary uppercase flex items-center gap-2 pt-2"><Zap className="w-3 h-3" /> Certificados y Cursos</p>
                       {editingWorker.certificates?.map((cert, idx) => (
                        <div key={cert.id} className="p-3 bg-surface-container rounded-sm border border-secondary/20 flex justify-between items-center group">
                          <div>
                            <p className="text-[10px] font-black text-on-surface uppercase">{cert.name}</p>
                            <p className={cn(
                              "text-[8px] font-bold uppercase",
                              new Date(cert.expiryDate) < new Date() ? "text-error" : "text-secondary"
                            )}>Vence: {cert.expiryDate}</p>
                          </div>
                          <button onClick={() => {
                            const n = [...(editingWorker.certificates || [])]; n.splice(idx,1); setEditingWorker({...editingWorker, certificates: n});
                          }} className="text-on-surface-variant hover:text-error transition-colors"><Trash2 className="w-3 h-3" /></button>
                        </div>
                       ))}
                    </div>
                    
                    <button 
                      onClick={() => {
                        const name = window.prompt("Nombre del Certificado/Curso?");
                        const date = window.prompt("Fecha de Vencimiento (YYYY-MM-DD)?");
                        if(name && date) {
                          const newCert = { id: Math.random().toString(36).substr(2,9), name, type: 'Otro' as any, date: new Date().toISOString().split('T')[0], expiryDate: date };
                          setEditingWorker({...editingWorker, certificates: [...(editingWorker.certificates || []), newCert]});
                        }
                      }}
                      className="w-full py-3 border border-dashed border-outline-variant text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant hover:bg-surface-variant transition-all rounded-sm"
                    >
                      + AGREGAR REQUISITO MANUAL
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-outline-variant/10">
                <button 
                  onClick={async () => {
                    if (!isAdmin) return;
                    try {
                      const { id, ...updateData } = editingWorker;
                      await updateDoc(doc(db, 'workers', id), updateData as any);
                      setEditingWorker(null);
                    } catch (error) {
                  handleFirestoreError(error, OperationType.UPDATE, `workers/${editingWorker.id}`);
                    }
                  }}
                  className="w-full py-4 bg-primary text-background font-headline font-black text-xs tracking-[0.2em] uppercase hover:bg-primary-container active:scale-95 transition-all rounded-sm"
                >
                  GUARDAR CAMBIOS DEL TRABAJADOR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Nuevo Trabajador con Integración IA */}
      <AnimatePresence>
        {showNewWorkerModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface-container-low border border-outline-variant w-full max-w-2xl rounded-sm shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-sm">
                    <UserPlus className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-headline font-black uppercase tracking-tight">Nuevo Ingreso de Personal</h3>
                    <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Vinculación al Sistema de Comando Cinético</p>
                  </div>
                </div>
                <button onClick={() => setShowNewWorkerModal(false)} className="p-2 hover:bg-surface-variant transition-colors rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-8">
                {/* Opción de Carga IA */}
                <div className="bg-primary/5 border border-primary/20 p-4 rounded-sm flex items-center justify-between gap-6">
                  <div className="flex-1">
                    <h4 className="text-xs font-black text-primary uppercase tracking-widest mb-1 flex items-center gap-2">
                      <Zap className="w-3 h-3" /> CARGA INTELIGENTE (RECOMENDADO)
                    </h4>
                    <p className="text-[10px] text-on-surface-variant leading-relaxed uppercase">
                      Sube el examen médico o certificado de alturas para autocompletar el perfil automáticamente con IA.
                    </p>
                  </div>
                  <label className="cursor-pointer shrink-0">
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".pdf,image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setIsAiLoading(true);
                          try {
                            const reader = new FileReader();
                            reader.onload = async () => {
                              const base64 = (reader.result as string).split(',')[1];
                              const data = await extractDocumentData(base64, file.type);
                              if (data) {
                                setNewWorker(prev => ({
                                  ...prev,
                                  name: data.patientName || prev.name,
                                  role: data.docType === 'CERTIFICADO_ALTURAS' ? 'Operario de Alturas' : prev.role,
                                  // Si es examen médico, podemos guardarlo para añadirlo al crear
                                  _tempExam: data.docType === 'EXAMEN_MEDICO' ? data : undefined,
                                  _tempCert: data.docType === 'CERTIFICADO_ALTURAS' ? data : undefined
                                }));
                                alert("IA: Datos extraídos. Completa la empresa y guarda.");
                              }
                            };
                            reader.readAsDataURL(file);
                          } catch (err) {
                            alert("Error procesando documento.");
                          } finally {
                            setIsAiLoading(false);
                          }
                        }
                      }}
                    />
                    <div className="px-4 py-2 bg-primary text-background text-[10px] font-black uppercase tracking-widest rounded-sm hover:bg-primary-container transition-all flex items-center gap-2">
                      {isAiLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      {isAiLoading ? 'PROCESANDO...' : 'SUBIR EXAMEN / CURSO'}
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Nombre Completo</label>
                      <input 
                        type="text" 
                        value={newWorker.name}
                        onChange={(e) => setNewWorker({...newWorker, name: e.target.value})}
                        className="w-full bg-surface-container-highest border border-outline-variant px-4 py-3 rounded-sm text-sm focus:border-primary transition-colors font-body"
                        placeholder="EJ: JUAN PÉREZ"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Cargo / Función</label>
                      <input 
                        type="text" 
                        value={newWorker.role}
                        onChange={(e) => setNewWorker({...newWorker, role: e.target.value})}
                        className="w-full bg-surface-container-highest border border-outline-variant px-4 py-3 rounded-sm text-sm focus:border-primary transition-colors font-body"
                        placeholder="EJ: ELECTRICISTA SENIOR"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Empresa Vinculada</label>
                      <select 
                        value={newWorker.companyId}
                        onChange={(e) => setNewWorker({...newWorker, companyId: e.target.value})}
                        className="w-full bg-surface-container-highest border border-outline-variant px-4 py-3 rounded-sm text-sm focus:border-primary transition-colors font-black uppercase"
                      >
                        <option value="">SELECCIONAR EMPRESA</option>
                        {companies.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Ubicación / Sector</label>
                      <input 
                        type="text" 
                        value={newWorker.location}
                        onChange={(e) => setNewWorker({...newWorker, location: e.target.value})}
                        className="w-full bg-surface-container-highest border border-outline-variant px-4 py-3 rounded-sm text-sm focus:border-primary transition-colors font-body"
                        placeholder="EJ: ZONA NORTE / BLOQUE A"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setShowNewWorkerModal(false)}
                    className="flex-1 py-4 border border-outline-variant text-[10px] font-black uppercase tracking-widest hover:bg-surface-variant transition-colors rounded-sm"
                  >
                    CANCELAR
                  </button>
                  <button 
                    onClick={async () => {
                      if (!newWorker.name || !newWorker.role || !newWorker.companyId) {
                        alert("Por favor completa los campos obligatorios.");
                        return;
                      }
                      
                      const id = `W-${Math.floor(1000 + Math.random() * 9000)}`;
                      const worker: Worker = {
                        id,
                        name: newWorker.name as string,
                        role: newWorker.role as string,
                        companyId: newWorker.companyId as string,
                        employmentStatus: 'Activo',
                        riskLevel: (newWorker.riskLevel as any) || 'low',
                        location: newWorker.location || 'Por asignar',
                        lastCheck: new Date().toISOString(),
                        status: { helmet: false, vest: false, gloves: false, glasses: false, boots: false },
                        vitals: { heartRate: 75, temp: 36.6 },
                        medicalExams: (newWorker as any)._tempExam ? [{
                          id: Math.random().toString(36).substr(2, 9),
                          type: 'Ingreso',
                          date: (newWorker as any)._tempExam.issueDate || new Date().toISOString().split('T')[0],
                          expiryDate: (newWorker as any)._tempExam.expiryDate || new Date().toISOString().split('T')[0],
                          status: (newWorker as any)._tempExam.status?.includes('APTO') ? 'Vigente' : 'Pendiente'
                        }] : [],
                        certificates: (newWorker as any)._tempCert ? [{
                          id: Math.random().toString(36).substr(2, 9),
                          name: (newWorker as any)._tempCert.docType.replace('_', ' '),
                          type: 'Curso Alturas',
                          date: (newWorker as any)._tempCert.issueDate || new Date().toISOString().split('T')[0],
                          expiryDate: (newWorker as any)._tempCert.expiryDate || new Date().toISOString().split('T')[0]
                        }] : [],
                        vaccinations: []
                      };

                      try {
                        await setDoc(doc(db, 'workers', id), worker);
                        setShowNewWorkerModal(false);
                        setNewWorker({ name: '', role: '', companyId: '', employmentStatus: 'Activo', riskLevel: 'low', location: '' });
                        alert("TRABAJADOR REGISTRADO EXITOSAMENTE ✅");
                      } catch (error) {
                        handleFirestoreError(error, OperationType.WRITE, `workers/${id}`);
                      }
                    }}
                    className="flex-1 py-4 bg-primary text-background font-black text-[10px] tracking-widest uppercase hover:bg-primary-container transition-all rounded-sm flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(63,255,139,0.3)]"
                  >
                    <CheckCircle2 className="w-4 h-4" /> REGISTRAR EN SISTEMA
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL GLOBAL PARA BORRADOR DE IA */}
      <AnimatePresence>
        {generatedDoc && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 overflow-hidden backdrop-blur-md bg-background/80">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-5xl h-full bg-surface-container-high border border-primary/30 rounded-sm shadow-[0_0_50px_rgba(63,255,139,0.15)] flex flex-col"
            >
              <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-highest">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 text-primary rounded-sm shadow-[0_0_15px_rgba(63,255,139,0.2)]">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-headline font-black text-primary tracking-tighter uppercase">BORRADOR TÉCNICO GENERADO</h2>
                    <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-[0.3em]">CUMPLIMIENTO NORMATIVO // RESOLUCIÓN 0312</p>
                  </div>
                </div>
                <button 
                  onClick={() => setGeneratedDoc(null)}
                  className="p-3 hover:bg-error/10 hover:text-error transition-all rounded-sm group"
                >
                  <X className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-12 bg-background/40">
                <div id="printable-document" className="max-w-4xl mx-auto p-12 bg-white text-black rounded-sm shadow-2xl space-y-8">
                  <style>{`
                    #printable-document { color: black !important; background: white !important; font-family: 'Inter', sans-serif !important; }
                    #printable-document h1, #printable-document h2, #printable-document h3 { color: black !important; border-bottom-color: #eee !important; }
                    #printable-document .markdown-body { color: black !important; }
                    #printable-document table { border-color: #ddd !important; }
                    #printable-document th { background: #f4f4f4 !important; color: black !important; border-color: #ddd !important; }
                    #printable-document td { border-color: #ddd !important; color: #333 !important; }
                    #printable-document p, #printable-document li { color: #333 !important; }
                  `}</style>

                  {generatedDocCompany?.logoUrl && (
                    <div className="flex justify-between items-start border-b-2 border-black pb-8">
                      <img src={generatedDocCompany.logoUrl} alt={generatedDocCompany.name} className="h-20 w-auto object-contain" />
                      <div className="text-right">
                        <h2 className="text-xl font-black uppercase tracking-tighter m-0">{generatedDocCompany.name}</h2>
                        <p className="text-[10px] font-bold text-gray-600 m-0">NIT: {generatedDocCompany.nit}</p>
                      </div>
                    </div>
                  )}

                  <div className="markdown-body py-4">
                    <Markdown>{generatedDoc}</Markdown>
                  </div>

                  <div className="mt-16 pt-12 border-t border-gray-200 flex justify-between items-end">
                    <div className="space-y-2 flex flex-col items-center">
                      {generatedDocCompany?.responsibleSignatureUrl && (
                        <img src={generatedDocCompany.responsibleSignatureUrl} alt="Firma" className="h-16 w-auto object-contain mb-[-10px]" />
                      )}
                      <div className="w-64 h-px bg-black mb-2" />
                      <p className="text-[10px] font-black uppercase m-0 leading-tight">FIRMA RESPONSABLE SST</p>
                      <p className="text-[9px] text-gray-600 m-0 uppercase font-bold">{generatedDocCompany?.responsibleName || 'Responsable SST'}</p>
                    </div>

                    <div className="space-y-2 flex flex-col items-center">
                      {generatedDocCompany?.legalRepresentativeSignatureUrl && (
                        <img src={generatedDocCompany.legalRepresentativeSignatureUrl} alt="Firma" className="h-16 w-auto object-contain mb-[-10px]" />
                      )}
                      <div className="w-64 h-px bg-black mb-2" />
                      <p className="text-[10px] font-black uppercase m-0 leading-tight">REPRESENTANTE LEGAL</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-outline-variant/10 flex gap-6 bg-surface-container-highest">
                <button onClick={handleDownloadPDF} className="flex-1 py-5 bg-secondary text-on-secondary font-black text-sm uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-3">
                  <Download className="w-5 h-5" /> DESCARGAR PDF OFICIAL
                </button>
                <button 
                  onClick={() => { setGeneratedDoc(null); setGeneratedDocCompany(null); }}
                  className="px-10 py-5 bg-surface-container-highest border border-outline-variant/30 text-on-surface font-black text-xs uppercase tracking-widest hover:bg-surface-variant transition-all"
                >
                  CERRAR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarLink({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full py-4 px-6 flex items-center gap-4 transition-all border-l-4",
        active 
          ? "bg-surface-container text-primary border-primary" 
          : "text-on-surface-variant border-transparent hover:bg-surface-bright hover:text-on-surface"
      )}
    >
      <span className={cn("transition-colors", active ? "text-primary" : "text-on-surface-variant")}>
        {icon}
      </span>
      <span className="font-medium text-[0.875rem]">{label}</span>
    </button>
  );
}

function PPEIcon({ icon, active }: { icon: React.ReactNode, active: boolean }) {
  return (
    <div className={cn(
      "w-7 h-7 rounded flex items-center justify-center border transition-all",
      active ? "bg-primary/10 border-primary/30 text-primary led-glow-green" : "bg-error/10 border-error/30 text-error led-glow-red"
    )}>
      {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: 'w-4 h-4' }) : icon}
    </div>
  );
}

function PPEStatusItem({ label, active, icon }: { label: string, active: boolean, icon: React.ReactNode }) {
  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-sm border transition-all",
      active ? "bg-primary/5 border-primary/20" : "bg-error/5 border-error/20"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn("p-1.5 rounded", active ? "text-primary" : "text-error")}>
          {icon}
        </div>
        <span className="text-[10px] font-black uppercase tracking-tight text-on-surface">{label}</span>
      </div>
      <span className={cn("text-[9px] font-black uppercase tracking-widest", active ? "text-primary" : "text-error")}>
        {active ? 'DETECTADO' : 'FALTANTE'}
      </span>
    </div>
  );
}

function BiometricRow({ label, value, status }: { label: string, value: string, status: 'normal' | 'warning' | 'critical' }) {
  return (
    <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3 last:border-0 last:pb-0">
      <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">{label}</span>
      <div className="flex items-center gap-3">
        <span className={cn(
          "text-sm font-headline font-black",
          status === 'critical' ? "text-error" : "text-on-surface"
        )}>{value}</span>
        <div className={cn(
          "w-2 h-2 rounded-full",
          status === 'normal' ? 'bg-primary led-glow-green' : 'bg-error led-glow-red animate-pulse'
        )} />
      </div>
    </div>
  );
}
