import React, { useState, useEffect } from 'react';
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
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { cn } from './lib/utils';
import { Worker, Alert, PPEStatus, DiagnosticResult, Company, MedicalExam, Vaccination } from './types';
import { analyzeSafetyData, generateFormat } from './services/gemini';
import { auth, db } from './firebase';
import { supabase, loginWithGoogle, logout } from './supabase';
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
  orderBy
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
  throw new Error(JSON.stringify(errInfo));
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
    compliancePercentage: 85
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
    compliancePercentage: 92
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
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'workers' | 'alerts' | 'diagnostics' | 'surveillance' | 'settings' | 'companies' | 'ai-assistant'>('overview');
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
  const [newCompany, setNewCompany] = useState<Partial<Company>>({
    name: '',
    nit: '',
    riskLevel: 1,
    workerCount: 0,
    sector: 'Otros',
    driveFolderUrl: ''
  });
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = user?.email === "alianza2026@sociedadsst26.com";

  // Real-time updates from Firestore
  useEffect(() => {
    if (!isAuthReady || !user) return;

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
  }, [isAuthReady, user]);

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
    if (!isAuthReady || !isAdmin) return;

    const generateAlerts = async () => {
      const newAlerts: Alert[] = [];
      workers.forEach(worker => {
        worker.medicalExams.forEach(exam => {
          if (exam.status === 'Vencido') {
            newAlerts.push({
              id: `A-MED-${worker.id}-${exam.id}`,
              timestamp: new Date().toISOString(),
              workerId: worker.id,
              workerName: worker.name,
              type: 'MEDICAL_EXAM_EXPIRED',
              severity: 'critical',
              message: `Examen médico (${exam.type}) vencido para ${worker.name}.`
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

  const calculateStandards = (risk: number, count: number): number => {
    if (risk >= 4) return 62;
    if (count <= 10) return 7;
    if (count <= 50) return 21;
    return 62;
  };

  const handleAddCompany = async () => {
    if (!newCompany.name || !newCompany.nit || !isAdmin) return;
    
    const standards = calculateStandards(newCompany.riskLevel || 1, newCompany.workerCount || 0);
    const id = `C-${Math.random().toString(36).substr(2, 9)}`;
    const company: Company = {
      id,
      name: newCompany.name,
      nit: newCompany.nit,
      riskLevel: (newCompany.riskLevel as 1|2|3|4|5) || 1,
      workerCount: newCompany.workerCount || 0,
      sector: newCompany.sector || 'Otros',
      driveFolderUrl: newCompany.driveFolderUrl || '',
      standardsCount: standards,
      completedStandards: [],
      compliancePercentage: 0
    };

    try {
      await setDoc(doc(db, 'companies', id), company);
      setShowNewCompanyModal(false);
      setNewCompany({ name: '', nit: '', riskLevel: 1, workerCount: 0, sector: 'Otros', driveFolderUrl: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `companies/${id}`);
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
      const result = await analyzeSafetyData({ workers, alerts });
      setDiagnostic(result);
      setActiveTab('diagnostics');
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
      const result = await generateFormat(aiPrompt);
      setAiResponse(result);
    } catch (error) {
      console.error("Error al generar formato:", error);
      setAiResponse("Lo siento, hubo un error al generar el documento. Intenta de nuevo.");
    } finally {
      setIsAiLoading(false);
    }
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
              {alerts.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-error text-[8px] font-black text-on-error flex items-center justify-center rounded-full border-2 border-background">
                  {alerts.length}
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
                  <div className="text-[10px] font-black text-on-surface uppercase tracking-widest leading-none mb-1">{user.user_metadata?.full_name || user.user_metadata?.name || 'USUARIO'}</div>
                  <div className="text-[8px] font-bold text-primary uppercase tracking-tighter leading-none">{isAdmin ? 'ADMINISTRADOR' : 'OBSERVADOR'}</div>
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
              <button 
                disabled={isLoggingIn}
                onClick={async () => {
                  setIsLoggingIn(true);
                  try {
                    await loginWithGoogle();
                  } catch (error: any) {
                    if (error.code === 'auth/cancelled-popup-request') {
                      console.log('Solicitud de popup cancelada por el usuario o el sistema.');
                    } else if (error.code === 'auth/popup-closed-by-user') {
                      console.log('El usuario cerró la ventana de inicio de sesión.');
                    } else {
                      console.error('Error al iniciar sesión:', error);
                    }
                  } finally {
                    setIsLoggingIn(false);
                  }
                }}
                className="ml-4 px-4 py-2 bg-primary text-background font-headline font-black text-[10px] tracking-widest uppercase hover:bg-primary-container active:scale-95 transition-all rounded-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoggingIn ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    INGRESANDO...
                  </>
                ) : (
                  'INGRESAR'
                )}
              </button>
            )}
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
                  {isAdmin && (
                    <button 
                      onClick={() => setShowNewCompanyModal(true)}
                      className="px-6 py-3 bg-primary text-background font-headline font-black text-xs tracking-[0.2em] uppercase hover:bg-primary-container active:scale-95 transition-all flex items-center gap-2 rounded-sm"
                    >
                      <Plus className="w-4 h-4" /> AGREGAR EMPRESA
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {companies
                    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.nit.includes(searchQuery))
                    .map(company => (
                    <div key={company.id} className="bg-surface-container-low border border-outline-variant/10 p-6 rounded-sm space-y-6 group hover:border-primary/30 transition-all">
                      <div className="flex justify-between items-start">
                        <div className="w-12 h-12 bg-surface-container-high rounded-sm flex items-center justify-center border border-outline-variant/20">
                          <Building className="w-6 h-6 text-primary" />
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-black text-primary uppercase tracking-widest">RIESGO {company.riskLevel}</div>
                          <div className="text-xs text-on-surface-variant font-mono">{company.nit}</div>
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
                          VER ESTÁNDARES
                        </button>
                        {company.driveFolderUrl && (
                          <a 
                            href={company.driveFolderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-surface-container-high text-secondary hover:bg-secondary/10 transition-colors border border-outline-variant/10 rounded-sm flex items-center justify-center"
                            title="Carpeta Drive (Origen)"
                          >
                            <FileText className="w-4 h-4" />
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
                        )}
                      </div>
                      <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                        {aiResponse ? (
                          <div className="markdown-body">
                            <Markdown>{aiResponse}</Markdown>
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
                className="space-y-8"
              >
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <h1 className="font-headline text-5xl font-black tracking-tighter text-on-surface uppercase">
                      VIGILANCIA <span className="text-primary">EN VIVO</span>
                    </h1>
                    <p className="text-on-surface-variant font-label tracking-widest text-xs mt-2 uppercase">
                      RED DE CÁMARAS IP // DETECCIÓN DE MOVIMIENTO // VISIÓN TÉRMICA ACTIVA
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="glass-panel px-4 py-2 rounded-sm border-l-2 border-primary flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-on-surface">CÁMARAS: 24/24</span>
                    </div>
                    <div className="glass-panel px-4 py-2 rounded-sm border-l-2 border-secondary flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-secondary"></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-on-surface">DRONES: 4 ACTIVOS</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-6">
                  {/* Main Feed */}
                  <div className="col-span-8 space-y-6">
                    <div className="aspect-video bg-surface-container-low border border-outline-variant/20 rounded-sm relative overflow-hidden group">
                      <img 
                        src="https://picsum.photos/seed/surveillance-main/1280/720" 
                        alt="Main Feed" 
                        className="w-full h-full object-cover opacity-60 grayscale contrast-125"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)]"></div>
                      
                      {/* HUD Overlays */}
                      <div className="absolute top-6 left-6 flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-error animate-pulse rounded-full"></div>
                          <span className="text-[10px] font-black text-error uppercase tracking-[0.2em]">REC ● 1080P</span>
                        </div>
                        <span className="text-[10px] text-on-surface-variant font-mono uppercase tracking-widest">CAM-07 // SECTOR-G // ALTA TENSIÓN</span>
                      </div>

                      <div className="absolute top-6 right-6 text-right">
                        <div className="text-[10px] text-primary font-mono uppercase tracking-widest">{currentTime.toLocaleTimeString()}</div>
                        <div className="text-[10px] text-on-surface-variant font-mono uppercase tracking-widest">31-MAR-2026</div>
                      </div>

                      <div className="absolute bottom-6 left-6 flex gap-4">
                        <div className="glass-panel px-3 py-1.5 rounded-sm flex items-center gap-2">
                          <Activity className="w-3 h-3 text-primary" />
                          <span className="text-[9px] font-black text-on-surface uppercase tracking-widest">MOVIMIENTO: BAJO</span>
                        </div>
                        <div className="glass-panel px-3 py-1.5 rounded-sm flex items-center gap-2">
                          <Zap className="w-3 h-3 text-secondary" />
                          <span className="text-[9px] font-black text-on-surface uppercase tracking-widest">TÉRMICO: NOMINAL</span>
                        </div>
                      </div>

                      <div className="absolute inset-0 border-[20px] border-transparent group-hover:border-primary/5 transition-all pointer-events-none"></div>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-primary/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-1 h-8 bg-primary/40"></div>
                        <div className="w-8 h-1 bg-primary/40 absolute"></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="aspect-video bg-surface-container-low border border-outline-variant/10 rounded-sm relative overflow-hidden group cursor-pointer">
                          <img 
                            src={`https://picsum.photos/seed/cam-${i}/400/225`} 
                            alt={`Feed ${i}`} 
                            className="w-full h-full object-cover opacity-40 grayscale"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-2 left-2 text-[8px] font-black text-on-surface-variant uppercase tracking-widest bg-black/40 px-1.5 py-0.5">
                            CAM-0{i+1}
                          </div>
                          <div className="absolute inset-0 hover:bg-primary/5 transition-colors"></div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sidebar Info */}
                  <div className="col-span-4 space-y-6">
                    <div className="bg-surface-container-low p-6 border border-outline-variant/10 rounded-sm space-y-6">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                        <Terminal className="w-4 h-4" /> ANÁLISIS DE VIDEO IA
                      </h3>
                      <div className="space-y-4">
                        <div className="p-3 bg-surface-container rounded-sm border-l-2 border-primary">
                          <div className="text-[9px] text-on-surface-variant uppercase font-bold mb-1">OBJETOS DETECTADOS</div>
                          <div className="text-sm font-headline font-bold text-on-surface">12 PERSONAS // 2 VEHÍCULOS</div>
                        </div>
                        <div className="p-3 bg-surface-container rounded-sm border-l-2 border-secondary">
                          <div className="text-[9px] text-on-surface-variant uppercase font-bold mb-1">ANOMALÍAS RECIENTES</div>
                          <div className="text-sm font-headline font-bold text-on-surface">NINGUNA DETECTADA</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-surface-container-low p-6 border border-outline-variant/10 rounded-sm space-y-4">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant">ESTADO DE DRONES</h3>
                      <div className="space-y-3">
                        {[
                          { id: 'DRN-01', status: 'PATRULLANDO', battery: 82 },
                          { id: 'DRN-02', status: 'CARGANDO', battery: 14 },
                          { id: 'DRN-03', status: 'PATRULLANDO', battery: 65 },
                          { id: 'DRN-04', status: 'STANDBY', battery: 100 },
                        ].map((drone) => (
                          <div key={drone.id} className="flex items-center justify-between p-2 hover:bg-surface-variant/30 transition-colors rounded-sm">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                drone.status === 'PATRULLANDO' ? 'bg-primary' : drone.status === 'CARGANDO' ? 'bg-secondary' : 'bg-on-surface-variant'
                              )}></div>
                              <span className="text-[10px] font-bold text-on-surface">{drone.id}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[9px] text-on-surface-variant uppercase">{drone.status}</span>
                              <span className={cn(
                                "text-[10px] font-mono",
                                drone.battery < 20 ? 'text-error' : 'text-primary'
                              )}>{drone.battery}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button className="w-full py-4 bg-surface-container-high border border-outline-variant/20 text-primary font-headline font-black text-[10px] tracking-widest uppercase hover:bg-primary hover:text-on-primary transition-all rounded-sm">
                      DESPLEGAR DRONE DE RESPUESTA
                    </button>
                  </div>
                </div>
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
                        {alerts.length > 0 
                          ? `SE DETECTARON ${alerts.length} ANOMALÍAS EN EL SECTOR. REVISAR PROTOCOLO.`
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
                    {alerts.map((alert, idx) => (
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-headline font-bold tracking-tight">Directorio de Personal</h2>
                    <p className="text-on-surface-variant text-sm">Monitoreando {workers.filter(w => w.employmentStatus === 'Activo').length} unidades activas.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {isAdmin && (
                      <button 
                        onClick={() => setShowNewWorkerModal(true)}
                        className="px-4 py-2 bg-primary text-background font-headline font-black text-[10px] tracking-widest uppercase hover:bg-primary-container active:scale-95 transition-all rounded-sm flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> AGREGAR TRABAJADOR
                      </button>
                    )}
                    <div className="flex bg-surface-container-high p-1 rounded-md border border-outline-variant">
                      {['Todos', 'Activos', 'Retirados'].map((f) => (
                        <button
                          key={f}
                          onClick={() => setWorkerFilter(f as any)}
                          className={cn(
                            "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded transition-all",
                            workerFilter === f ? "bg-primary text-background" : "text-on-surface-variant hover:text-on-surface"
                          )}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                      <input 
                        type="text" 
                        placeholder="Buscar ID o Nombre..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-surface-container-high border border-outline-variant rounded-md py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-colors w-64"
                      />
                    </div>
                    <button className="p-2 bg-surface-container-high border border-outline-variant rounded-md hover:bg-surface-bright transition-colors">
                      <RefreshCw className="w-4 h-4" />
                    </button>
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
                      {workers
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
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="max-w-5xl mx-auto space-y-10"
              >
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-sm bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-4">
                    <Cpu className="w-4 h-4" />
                    NÚCLEO DE INTELIGENCIA AXON
                  </div>
                  <h2 className="text-6xl font-headline font-black tracking-tighter uppercase text-on-surface">INFORME DE SEGURIDAD IA</h2>
                  <p className="text-on-surface-variant font-label tracking-widest text-xs uppercase">ANÁLISIS PREDICTIVO Y EVALUACIÓN DE RIESGOS EN TIEMPO REAL</p>
                </div>

                {!diagnostic ? (
                  <div className="bg-surface-container-low rounded-sm p-20 flex flex-col items-center justify-center text-center space-y-10 border border-outline-variant/10 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-5 pointer-events-none">
                      <div className="grid grid-cols-20 h-full w-full">
                        {Array.from({ length: 20 }).map((_, i) => (
                          <div key={i} className="border-r border-primary h-full"></div>
                        ))}
                      </div>
                    </div>
                    <div className="w-24 h-24 bg-surface-container-high rounded-sm flex items-center justify-center border border-outline-variant/20 relative z-10">
                      <Terminal className="w-12 h-12 text-on-surface-variant" />
                      <div className="absolute inset-0 border-2 border-primary rounded-sm animate-ping opacity-20" />
                    </div>
                    <div className="space-y-4 relative z-10">
                      <h3 className="text-2xl font-headline font-black uppercase tracking-tight">SISTEMA EN ESPERA</h3>
                      <p className="text-on-surface-variant max-w-md font-label text-xs uppercase tracking-wider leading-relaxed">
                        EJECUTE UN ESCANEO COMPLETO DEL SECTOR PARA GENERAR RECOMENDACIONES DE SEGURIDAD E INFORMES DE RIESGO IMPULSADOS POR REDES NEURONALES.
                      </p>
                    </div>
                    <button 
                      onClick={handleRunDiagnostics}
                      disabled={isAnalyzing}
                      className="px-12 py-5 bg-primary text-background font-headline font-black text-xs tracking-[0.2em] uppercase hover:bg-primary-container active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50 rounded-sm relative z-10"
                    >
                      {isAnalyzing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                      {isAnalyzing ? 'PROCESANDO DATOS...' : 'INICIALIZAR ESCANEO NEURONAL'}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    <div className="md:col-span-2 space-y-10">
                      <div className="bg-surface-container-low rounded-sm p-8 space-y-6 border border-outline-variant/10">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                          <Activity className="w-4 h-4" />
                          RESUMEN EJECUTIVO
                        </h3>
                        <p className="text-lg leading-relaxed text-on-surface font-headline font-medium">
                          {diagnostic.summary}
                        </p>
                      </div>

                      <div className="bg-surface-container-low rounded-sm p-8 space-y-6 border border-outline-variant/10">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary flex items-center gap-3">
                          <CheckCircle2 className="w-4 h-4" />
                          HALLAZGOS Y RECOMENDACIONES
                        </h3>
                        <div className="space-y-8">
                          <div>
                            <h4 className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-4">HALLAZGOS CLAVE:</h4>
                            <ul className="space-y-4">
                              {diagnostic.findings.map((finding, i) => (
                                <motion.li 
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.1 }}
                                  key={i} 
                                  className="flex items-start gap-4 text-xs font-label uppercase tracking-wider text-on-surface"
                                >
                                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-secondary flex-shrink-0" />
                                  {finding}
                                </motion.li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-4">ACCIONES RECOMENDADAS:</h4>
                            <ul className="space-y-4">
                              {diagnostic.recommendations.map((rec, i) => (
                                <motion.li 
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.1 + 0.3 }}
                                  key={i} 
                                  className="flex items-start gap-4 text-xs font-label uppercase tracking-wider text-on-surface"
                                >
                                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                  {rec}
                                </motion.li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-10">
                      <div className="bg-surface-container-low rounded-sm p-8 flex flex-col items-center text-center border border-outline-variant/10">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant mb-8">PUNTUACIÓN DE SEGURIDAD</h3>
                        <div className="relative w-48 h-48 flex items-center justify-center mb-8">
                          <svg className="w-full h-full -rotate-90">
                            <circle 
                              cx="96" cy="96" r="88" 
                              fill="transparent" 
                              stroke="currentColor" 
                              strokeWidth="4" 
                              className="text-surface-container-highest opacity-20"
                            />
                            <motion.circle 
                              initial={{ strokeDasharray: "0 553" }}
                              animate={{ strokeDasharray: `${(diagnostic.safetyScore / 100) * 553} 553` }}
                              transition={{ duration: 2, ease: "circOut" }}
                              cx="96" cy="96" r="88" 
                              fill="transparent" 
                              stroke="currentColor" 
                              strokeWidth="12" 
                              strokeLinecap="square"
                              className="text-primary"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-6xl font-headline font-black text-on-surface">{diagnostic.safetyScore}</span>
                            <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.3em]">ÍNDICE SST</span>
                          </div>
                        </div>
                        <div className={cn(
                          "px-6 py-2 rounded-sm text-[10px] font-black uppercase tracking-[0.4em] mb-6",
                          diagnostic.riskLevel === 'alto' ? "bg-error/20 text-error border border-error/30" :
                          diagnostic.riskLevel === 'medio' ? "bg-secondary/20 text-secondary border border-secondary/30" :
                          "bg-primary/20 text-primary border border-primary/30"
                        )}>
                          RIESGO {diagnostic.riskLevel}
                        </div>
                        <p className="text-[10px] text-on-surface-variant font-label uppercase tracking-widest leading-relaxed">
                          BASADO EN EL CUMPLIMIENTO ACTUAL DE EPP Y LA TELEMETRÍA BIOMÉTRICA DE LOS ACTIVOS.
                        </p>
                      </div>

                      <button 
                        onClick={() => setDiagnostic(null)}
                        className="w-full py-5 border border-outline-variant text-on-surface font-headline font-black text-[10px] tracking-widest uppercase hover:bg-surface-bright transition-colors rounded-sm"
                      >
                        REINICIAR DIAGNÓSTICOS
                      </button>
                    </div>
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
                        <div className="text-error font-headline text-2xl font-black">{alerts.filter(a => a.severity === 'critical').length}</div>
                      </div>
                      <AlertTriangle className="w-8 h-8 text-error animate-pulse" />
                    </div>
                    <div className="glass-panel px-6 py-3 rounded-sm border-l-4 border-secondary flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">ADVERTENCIAS</div>
                        <div className="text-secondary font-headline text-2xl font-black">{alerts.filter(a => a.severity === 'warning').length}</div>
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
                    {alerts.length > 0 ? (
                      alerts
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

              <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {STANDARDS.filter(s => s.level <= showStandardsModal.standardsCount).map(standard => (
                  <div 
                    key={standard.id}
                    onClick={() => handleToggleStandard(showStandardsModal.id, standard.id)}
                    className={cn(
                      "p-4 border rounded-sm flex items-center gap-4 cursor-pointer transition-all",
                      showStandardsModal.completedStandards.includes(standard.id)
                        ? "bg-primary/5 border-primary/30"
                        : "bg-surface-container-high border-outline-variant/10 hover:border-primary/20"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-sm border flex items-center justify-center transition-all",
                      showStandardsModal.completedStandards.includes(standard.id)
                        ? "bg-primary border-primary text-background"
                        : "border-outline-variant"
                    )}>
                      {showStandardsModal.completedStandards.includes(standard.id) && <CheckCircle2 className="w-3 h-3" />}
                    </div>
                    <span className={cn(
                      "text-xs font-medium uppercase tracking-tight",
                      showStandardsModal.completedStandards.includes(standard.id) ? "text-on-surface" : "text-on-surface-variant"
                    )}>
                      {standard.title}
                    </span>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setShowStandardsModal(null)}
                className="w-full py-4 border border-outline-variant text-on-surface font-headline font-black text-xs tracking-[0.2em] uppercase hover:bg-surface-bright transition-all rounded-sm"
              >
                CERRAR Y GUARDAR
              </button>
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
              className="w-full max-w-md bg-surface-container-low border border-outline-variant/20 rounded-sm overflow-hidden relative z-10 p-8 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-headline font-black text-on-surface uppercase tracking-tighter">EDITAR TRABAJADOR</h2>
                <XCircle className="w-6 h-6 text-on-surface-variant cursor-pointer" onClick={() => setEditingWorker(null)} />
              </div>
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">DATOS BÁSICOS</h3>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Nombre Completo</label>
                    <input 
                      type="text" 
                      value={editingWorker.name}
                      onChange={e => setEditingWorker({...editingWorker, name: e.target.value})}
                      className="w-full bg-surface-container-high border border-outline-variant rounded-sm py-3 px-4 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Cargo / Rol</label>
                    <input 
                      type="text" 
                      value={editingWorker.role}
                      onChange={e => setEditingWorker({...editingWorker, role: e.target.value})}
                      className="w-full bg-surface-container-high border border-outline-variant rounded-sm py-3 px-4 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Estado Laboral</label>
                      <select 
                        value={editingWorker.employmentStatus}
                        onChange={e => setEditingWorker({...editingWorker, employmentStatus: e.target.value as any})}
                        className="w-full bg-surface-container-high border border-outline-variant rounded-sm py-3 px-4 text-sm focus:outline-none focus:border-primary"
                      >
                        <option value="Activo">Activo</option>
                        <option value="Retirado">Retirado</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Empresa</label>
                      <select 
                        value={editingWorker.companyId}
                        onChange={e => setEditingWorker({...editingWorker, companyId: e.target.value})}
                        className="w-full bg-surface-container-high border border-outline-variant rounded-sm py-3 px-4 text-sm focus:outline-none focus:border-primary"
                      >
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-outline-variant/10">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">EXÁMENES MÉDICOS</h3>
                  <div className="space-y-2">
                    {editingWorker.medicalExams.map((exam, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-surface-container rounded-sm border border-outline-variant/5">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-on-surface">{exam.type}</span>
                          <span className="text-[9px] text-on-surface-variant uppercase tracking-widest">Vence: {exam.expiryDate}</span>
                        </div>
                        <button 
                          onClick={() => {
                            const newExams = [...editingWorker.medicalExams];
                            newExams.splice(idx, 1);
                            setEditingWorker({...editingWorker, medicalExams: newExams});
                          }}
                          className="text-error hover:text-error/80"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => {
                        const type = window.prompt('Tipo de examen (Ingreso, Periódico, Retiro, Post-Incapacidad):');
                        const date = window.prompt('Fecha de vencimiento (YYYY-MM-DD):');
                        if (type && date && ['Ingreso', 'Periódico', 'Retiro', 'Post-Incapacidad'].includes(type)) {
                          const newExam: MedicalExam = {
                            id: `E-${Math.random().toString(36).substr(2, 5)}`,
                            type: type as any,
                            date: new Date().toISOString().split('T')[0],
                            expiryDate: date,
                            status: new Date(date) < new Date() ? 'Vencido' : 'Vigente'
                          };
                          setEditingWorker({
                            ...editingWorker, 
                            medicalExams: [...editingWorker.medicalExams, newExam]
                          });
                        }
                      }}
                      className="w-full py-2 border border-dashed border-outline-variant/30 text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:bg-surface-variant transition-all rounded-sm"
                    >
                      + AGREGAR EXAMEN
                    </button>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-outline-variant/10">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">VACUNACIÓN</h3>
                  <div className="space-y-2">
                    {editingWorker.vaccinations.map((vac, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-surface-container rounded-sm border border-outline-variant/5">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-on-surface">{vac.type}</span>
                          <span className="text-[9px] text-on-surface-variant uppercase tracking-widest">Dosis: {vac.dose} // Refuerzo: {vac.nextDoseDate || 'N/A'}</span>
                        </div>
                        <button 
                          onClick={() => {
                            const newVac = [...editingWorker.vaccinations];
                            newVac.splice(idx, 1);
                            setEditingWorker({...editingWorker, vaccinations: newVac});
                          }}
                          className="text-error hover:text-error/80"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => {
                        const type = window.prompt('Tipo de vacuna (Tétanos, Hepatitis B, Influenza, Fiebre Amarilla):');
                        const dose = window.prompt('Dosis (Número):');
                        const next = window.prompt('Fecha próximo refuerzo (YYYY-MM-DD) o deje vacío:');
                        if (type && dose && ['Tétanos', 'Hepatitis B', 'Influenza', 'Fiebre Amarilla'].includes(type)) {
                          const newVac: Vaccination = {
                            id: `V-${Math.random().toString(36).substr(2, 5)}`,
                            type: type as any,
                            dose: parseInt(dose) || 1,
                            date: new Date().toISOString().split('T')[0],
                            nextDoseDate: next || undefined,
                            status: 'En Proceso'
                          };
                          setEditingWorker({
                            ...editingWorker, 
                            vaccinations: [...editingWorker.vaccinations, newVac]
                          });
                        }
                      }}
                      className="w-full py-2 border border-dashed border-outline-variant/30 text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:bg-surface-variant transition-all rounded-sm"
                    >
                      + AGREGAR VACUNA
                    </button>
                  </div>
                </div>
              </div>
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
                GUARDAR CAMBIOS
              </button>
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
