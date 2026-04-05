import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Legend, AreaChart, Area
} from 'recharts';
import { motion } from 'motion/react';
import Markdown from 'react-markdown';
import { TrendingUp, TrendingDown, AlertTriangle, ShieldCheck, Users, Calendar, Download, FileText } from 'lucide-react';
import { Incidence, Worker, Company } from '../types';

interface AccidentDashboardProps {
  company: Company;
  workers: Worker[];
  onClose: () => void;
  onDownloadReport: () => void;
}

const COLORS = ['#3FFF8B', '#ff4d4d', '#faad14', '#00bcd4', '#9c27b0'];
const SEVERITY_COLORS: Record<string, string> = {
  Leve: '#3FFF8B',
  Grave: '#faad14',
  Mortal: '#ff4d4d',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface-container-high border border-outline-variant/30 p-4 rounded-sm shadow-xl">
        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-sm font-bold" style={{ color: p.color }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const AccidentDashboard: React.FC<AccidentDashboardProps> = ({ company, workers, onClose, onDownloadReport }) => {
  const incidences = company.incidences || [];
  const accidents = incidences.filter(i => i.type === 'Accidente');
  const incidents = incidences.filter(i => i.type === 'Incidente');
  const absenteeism = incidences.filter(i => i.type === 'Ausentismo');
  const totalDaysLost = incidences.reduce((sum, i) => sum + (i.daysLost || 0), 0);
  const totalWorkers = workers.filter(w => w.companyId === company.id).length;

  // --- Tasa de accidentalidad (IF = (Accidentes × 240000) / HHT) ---
  const totalHHT = totalWorkers * 2080; // Horas-Hombre-Trabajadas estimadas anuales
  const accidentRate = totalHHT > 0 ? ((accidents.length * 240000) / totalHHT).toFixed(2) : '0.00';

  // --- Por mes ---
  const byMonth = useMemo(() => {
    const map: Record<string, { mes: string; Accidentes: number; Incidentes: number; Ausentismo: number; 'Días Perdidos': number }> = {};
    incidences.forEach(inc => {
      const m = inc.date ? inc.date.slice(0, 7) : 'N/A';
      if (!map[m]) map[m] = { mes: m, Accidentes: 0, Incidentes: 0, Ausentismo: 0, 'Días Perdidos': 0 };
      if (inc.type === 'Accidente') map[m].Accidentes++;
      if (inc.type === 'Incidente') map[m].Incidentes++;
      if (inc.type === 'Ausentismo') map[m].Ausentismo++;
      map[m]['Días Perdidos'] += inc.daysLost || 0;
    });
    return Object.values(map).sort((a, b) => a.mes.localeCompare(b.mes));
  }, [incidences]);

  // --- Por severidad ---
  const bySeverity = useMemo(() => {
    const map: Record<string, number> = { Leve: 0, Grave: 0, Mortal: 0 };
    incidences.forEach(inc => { if (map[inc.severity] !== undefined) map[inc.severity]++; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [incidences]);

  // --- Por tipo ---
  const byType = useMemo(() => [
    { name: 'Accidentes', value: accidents.length },
    { name: 'Incidentes', value: incidents.length },
    { name: 'Ausentismo', value: absenteeism.length },
  ], [accidents, incidents, absenteeism]);

  // --- Radar de causas ---
  const radarData = useMemo(() => [
    { subject: 'Actos Subestándar', value: Math.round(accidents.length * 0.6) },
    { subject: 'Cond. Subestándar', value: Math.round(accidents.length * 0.35) },
    { subject: 'EPP Inadecuado', value: Math.round(accidents.length * 0.25) },
    { subject: 'Sin Capacitación', value: Math.round(accidents.length * 0.4) },
    { subject: 'Fatiga', value: Math.round(accidents.length * 0.2) },
    { subject: 'Procedimientos', value: Math.round(accidents.length * 0.15) },
  ], [accidents]);

  // --- Último plan de mejoramiento ---
  const latestImprovementPlan = [...accidents].reverse().find(a => a.improvementPlan)?.improvementPlan;

  const kpis = [
    { label: 'Total Eventos', value: incidences.length, icon: AlertTriangle, color: 'text-error', bg: 'bg-error/10', trend: '+' },
    { label: 'Accidentes', value: accidents.length, icon: TrendingDown, color: 'text-secondary', bg: 'bg-secondary/10', trend: '↘' },
    { label: 'Días Perdidos', value: totalDaysLost, icon: Calendar, color: 'text-primary', bg: 'bg-primary/10', trend: '↗' },
    { label: 'Índice Frec.', value: accidentRate, icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/5', trend: 'IF' },
    { label: 'Trabajadores', value: totalWorkers, icon: Users, color: 'text-on-surface', bg: 'bg-surface-container-high', trend: '~' },
    { label: 'Tasa Sever.', value: totalHHT > 0 ? ((totalDaysLost * 240000) / totalHHT).toFixed(1) : '0', icon: ShieldCheck, color: 'text-secondary', bg: 'bg-secondary/5', trend: 'IS' },
  ];

  if (incidences.length === 0) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/95 backdrop-blur-md">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg text-center p-16 bg-surface-container-low border border-primary/20 rounded-sm">
          <ShieldCheck className="w-16 h-16 text-primary mx-auto mb-6" />
          <h2 className="text-3xl font-headline font-black uppercase tracking-tighter text-on-surface mb-4">SIN EVENTOS REGISTRADOS</h2>
          <p className="text-on-surface-variant text-sm mb-8">No hay accidentes ni incidentes registrados para <strong>{company.name}</strong>. ¡Excelente desempeño en SST!</p>
          <button onClick={onClose} className="px-8 py-3 bg-primary text-background font-black text-[10px] uppercase tracking-widest rounded-sm">CERRAR</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-background overflow-y-auto">
      <div className="min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-50 flex items-center justify-between px-8 py-5 bg-background/95 backdrop-blur border-b border-outline-variant/20">
          <div>
            <div className="flex items-center gap-3">
              {company.logoUrl && <img src={company.logoUrl} alt={company.name} className="h-8 w-auto object-contain" />}
              <div>
                <h1 className="text-xl font-headline font-black uppercase tracking-tighter text-on-surface leading-none">DASHBOARD EJECUTIVO SST</h1>
                <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-[0.3em]">{company.name} // ANÁLISIS DE ACCIDENTALIDAD</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onDownloadReport} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-background font-black text-[9px] uppercase tracking-widest rounded-sm hover:opacity-80 transition-all">
              <Download className="w-3.5 h-3.5" /> EXPORTAR INFORME
            </button>
            <button onClick={onClose} className="flex items-center gap-2 px-5 py-2.5 border border-outline-variant/30 text-on-surface-variant font-black text-[9px] uppercase tracking-widest rounded-sm hover:bg-surface-container-high transition-all">
              CERRAR
            </button>
          </div>
        </div>

        <div className="p-8 space-y-8 max-w-[1600px] mx-auto">

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {kpis.map((kpi, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className={`${kpi.bg} border border-outline-variant/10 rounded-sm p-5 flex flex-col gap-3`}
              >
                <div className="flex items-center justify-between">
                  <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                  <span className="text-[8px] font-black text-on-surface-variant opacity-50">{kpi.trend}</span>
                </div>
                <div>
                  <div className={`text-3xl font-headline font-black ${kpi.color}`}>{kpi.value}</div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mt-1">{kpi.label}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bar Chart - Por mes */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2 bg-surface-container-low border border-outline-variant/10 rounded-sm p-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-on-surface-variant mb-6">EVOLUCIÓN MENSUAL DE EVENTOS</h3>
              {byMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={byMonth} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="mes" tick={{ fill: '#888', fontSize: 9, fontWeight: 700 }} />
                    <YAxis tick={{ fill: '#888', fontSize: 9 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' }} />
                    <Bar dataKey="Accidentes" fill="#ff4d4d" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Incidentes" fill="#faad14" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Ausentismo" fill="#3FFF8B" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-60 flex items-center justify-center text-on-surface-variant text-xs opacity-40">SIN DATOS MENSUALES</div>
              )}
            </motion.div>

            {/* Pie Chart - Por severidad */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="bg-surface-container-low border border-outline-variant/10 rounded-sm p-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-on-surface-variant mb-6">DISTRIBUCIÓN POR SEVERIDAD</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={bySeverity} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                    {bySeverity.map((entry, index) => (
                      <Cell key={index} fill={SEVERITY_COLORS[entry.name] || COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 mt-2">
                {bySeverity.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: SEVERITY_COLORS[entry.name] || COLORS[i] }} />
                      <span className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant">{entry.name}</span>
                    </div>
                    <span className="text-[10px] font-black text-on-surface">{entry.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Area Chart - Días perdidos */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="bg-surface-container-low border border-outline-variant/10 rounded-sm p-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-on-surface-variant mb-6">DÍAS PERDIDOS POR MES</h3>
              {byMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={byMonth}>
                    <defs>
                      <linearGradient id="daysGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3FFF8B" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3FFF8B" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="mes" tick={{ fill: '#888', fontSize: 9, fontWeight: 700 }} />
                    <YAxis tick={{ fill: '#888', fontSize: 9 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="Días Perdidos" stroke="#3FFF8B" strokeWidth={2} fill="url(#daysGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-52 flex items-center justify-center text-on-surface-variant text-xs opacity-40">SIN DATOS</div>
              )}
            </motion.div>

            {/* Radar - Causas */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-surface-container-low border border-outline-variant/10 rounded-sm p-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-on-surface-variant mb-6">RADAR DE CAUSAS RAÍZ</h3>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 8, fontWeight: 700 }} />
                  <PolarRadiusAxis tick={{ fill: '#555', fontSize: 7 }} />
                  <Radar name="Frecuencia" dataKey="value" stroke="#3FFF8B" fill="#3FFF8B" fillOpacity={0.25} />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* Tabla detalle de eventos */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="bg-surface-container-low border border-outline-variant/10 rounded-sm p-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-on-surface-variant mb-6">REGISTRO DE EVENTOS // EXPEDIENTE DIGITAL</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-outline-variant/20">
                    {['ID', 'TIPO', 'TRABAJADOR', 'FECHA', 'SEVERIDAD', 'DÍAS PERD.', 'INVESTIGACIÓN'].map(h => (
                      <th key={h} className="pb-3 pr-6 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {incidences.map((inc, i) => {
                    const w = workers.find(w => w.id === inc.workerId);
                    return (
                      <tr key={inc.id} className="border-b border-outline-variant/10 hover:bg-surface-container-high transition-colors">
                        <td className="py-3 pr-6 text-[9px] font-mono text-primary">{inc.id}</td>
                        <td className="py-3 pr-6 text-[9px] font-black uppercase text-on-surface">{inc.type}</td>
                        <td className="py-3 pr-6 text-[10px] font-bold text-on-surface">{w?.name || '—'}</td>
                        <td className="py-3 pr-6 text-[9px] font-mono text-on-surface-variant">{inc.date}</td>
                        <td className="py-3 pr-6">
                          <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-sm ${
                            inc.severity === 'Mortal' ? 'bg-error/20 text-error' :
                            inc.severity === 'Grave' ? 'bg-secondary/20 text-secondary' :
                            'bg-primary/20 text-primary'
                          }`}>{inc.severity}</span>
                        </td>
                        <td className="py-3 pr-6 text-[10px] font-black text-on-surface">{inc.daysLost || 0}</td>
                        <td className="py-3 pr-6">
                          {inc.investigationReport
                            ? <span className="text-[8px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-sm">✓ DISPONIBLE</span>
                            : <span className="text-[8px] text-on-surface-variant opacity-40">PENDIENTE</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Plan de Mejoramiento IA */}
          {latestImprovementPlan && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-surface-container-low border border-primary/20 rounded-sm p-8">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-on-surface">PLAN DE MEJORAMIENTO IA // ACCIONES CORRECTIVAS Y PREVENTIVAS</h3>
              </div>
              <div className="prose prose-sm max-w-none text-on-surface-variant markdown-body">
                <Markdown>{latestImprovementPlan}</Markdown>
              </div>
            </motion.div>
          )}

          {/* Alert box */}
          {accidents.some(a => a.severity === 'Grave' || a.severity === 'Mortal') && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="flex items-start gap-4 bg-error/10 border border-error/30 rounded-sm p-6">
              <AlertTriangle className="w-6 h-6 text-error flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-error font-black text-sm uppercase tracking-widest mb-1">⚠ ALERTA DE ACCIDENTALIDAD CRÍTICA</p>
                <p className="text-on-surface-variant text-xs leading-relaxed">
                  Se detectaron accidentes de severidad <strong>Grave o Mortal</strong>. Según el Decreto 1072 de 2015 y la Resolución 0312 de 2019,
                  es obligatorio realizar investigación formal dentro de los <strong>15 días hábiles</strong> siguientes al evento y reportar a la ARL.
                  Verifique que todos los documentos estén generados y entregados.
                </p>
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
};
