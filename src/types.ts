export interface PPEStatus {
  helmet: boolean;
  vest: boolean;
  gloves: boolean;
  glasses: boolean;
  boots: boolean;
}

export interface MedicalExam {
  id: string;
  type: 'Ingreso' | 'Periódico' | 'Retiro' | 'Post-Incapacidad';
  date: string;
  expiryDate: string;
  status: 'Vigente' | 'Vencido' | 'Pendiente';
  findings?: string;
}

export interface Vaccination {
  id: string;
  type: 'Tétanos' | 'Hepatitis B' | 'Influenza' | 'Fiebre Amarilla';
  dose: number;
  date: string;
  nextDoseDate?: string;
  status: 'Completo' | 'Pendiente' | 'En Proceso';
}

export interface Incidence {
  id: string;
  type: 'Accidente' | 'Incidente' | 'Ausentismo';
  workerId: string;
  date: string;
  severity: 'Leve' | 'Grave' | 'Mortal';
  daysLost: number;
  description: string;
  furatDescription?: string;
  investigationReport?: string;
  improvementPlan?: string;
  epsNotificationLetter?: string;
  mitigationPlanned?: string;
}

export interface Absenteeism {
  id: string;
  workerId: string;
  startDate: string;
  endDate: string;
  cause: 'Enfermedad Común' | 'Enfermedad Laboral' | 'Accidente' | 'Calamidad' | 'Otro';
  days: number;
}

export interface MonthlyActivity {
  id: string;
  companyId: string;
  month: string; // YYYY-MM
  activityName: string;
  status: 'Programada' | 'Realizada' | 'Cancelada';
  evidenceUrl?: string;
  participants: number;
}

export interface Worker {
  id: string;
  name: string;
  role: string;
  status: PPEStatus;
  lastCheck: string;
  location: string;
  riskLevel: 'low' | 'medium' | 'high';
  vitals: {
    heartRate: number;
    temp: number;
  };
  employmentStatus: 'Activo' | 'Retirado';
  companyId: string;
  medicalExams: MedicalExam[];
  vaccinations: Vaccination[];
  eps?: string;
  afp?: string;
  arl?: string;
  certificates?: {
    id: string;
    name: string;
    type: 'Curso Alturas' | 'Coordinador Alturas' | 'SST' | 'Primeros Auxilios' | 'Otro';
    date: string;
    expiryDate: string;
    url?: string;
  }[];
}

export interface Company {
  id: string;
  name: string;
  nit: string;
  riskLevel: 1 | 2 | 3 | 4 | 5;
  workerCount: number;
  sector: string;
  standardsCount: number; // 7, 21, or 62 according to Res 0312
  completedStandards: string[]; // IDs of completed standards
  compliancePercentage: number;
  driveFolderUrl?: string; // Link to legacy Google Drive folder
  standardDocs?: Record<string, string>; // Maps Standard ID to its Document URL
  logoUrl?: string; // URL of the company logo
  responsibleName?: string; // Name of the person in charge of SST
  responsibleSignatureUrl?: string; // Signature of SST person
  responsibleLicense?: string; // Licencia SST
  legalRepresentativeName?: string; // Name of the legal representative
  legalRepresentativeSignatureUrl?: string; // Signature of legal representative
  // New Analytics Fields
  incidences: Incidence[];
  absenteeismList: Absenteeism[];
  monthlyActivities: MonthlyActivity[];
  // Vigilancia Epidemiológica — cumplimiento por programa
  surveillanceCompliance?: Record<string, {
    percentage: number;          // 0-100
    lastUpdated: string;         // ISO date
    evidence?: string;           // URL documento o descripción
    responsibleName?: string;    // Nombre del responsable
    notes?: string;              // Observaciones o hallazgos
  }>;
}

export interface Alert {
  id: string;
  timestamp: string;
  workerId?: string;
  workerName?: string;
  type: 'PPE_MISSING' | 'ZONE_VIOLATION' | 'FALL_DETECTED' | 'BIOMETRIC_ANOMALY' | 'MEDICAL_EXAM_EXPIRED' | 'VACCINATION_DUE' | 'CERTIFICATE_EXPIRED' | 'SYSTEM_UPDATE';
  severity: 'critical' | 'warning' | 'info';
  message: string;
}

export interface DiagnosticResult {
  summary: string;
  findings: string[];
  recommendations: string[];
  safetyScore: number;
  riskLevel: 'bajo' | 'medio' | 'alto';
  // New Analytics Stats
  accidentRate?: number;
  absenteeismRate?: number;
  mitigationPlan?: string;
}
