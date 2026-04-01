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
}

export interface Alert {
  id: string;
  timestamp: string;
  workerId?: string;
  workerName?: string;
  type: 'PPE_MISSING' | 'ZONE_VIOLATION' | 'FALL_DETECTED' | 'BIOMETRIC_ANOMALY' | 'MEDICAL_EXAM_EXPIRED' | 'VACCINATION_DUE' | 'SYSTEM_UPDATE';
  severity: 'critical' | 'warning' | 'info';
  message: string;
}

export interface DiagnosticResult {
  summary: string;
  findings: string[];
  recommendations: string[];
  safetyScore: number;
  riskLevel: 'bajo' | 'medio' | 'alto';
}
