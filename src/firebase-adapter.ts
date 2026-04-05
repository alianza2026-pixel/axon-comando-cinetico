import { supabase } from './supabase';

/**
 * ADAPTADOR DE FIREBASE A SUPABASE
 * Mantiene la interfaz de comandos igual y traduce entre camelCase (React) y snake_case (Postgres)
 */

const mapping: Record<string, string> = {
  riskLevel: 'risk_level',
  workerCount: 'worker_count',
  standardsCount: 'standards_count',
  completedStandards: 'completed_standards',
  compliancePercentage: 'compliance_percentage',
  companyId: 'company_id',
  employmentStatus: 'employment_status',
  lastCheck: 'last_check',
  medicalExams: 'medical_exams',
  userId: 'user_id',
  driveFolderUrl: 'drive_folder_url',
  standardDocs: 'standard_docs',
  logoUrl: 'logo_url',
  responsibleName: 'responsible_name'
};

const reverseMapping = Object.fromEntries(Object.entries(mapping).map(([k, v]) => [v, k]));

const toSnake = (obj: any) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const newObj: any = {};
  for (const key in obj) {
    const snakeKey = mapping[key] || key;
    newObj[snakeKey] = obj[key];
  }
  return newObj;
};

const toCamel = (obj: any) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const newObj: any = {};
  for (const key in obj) {
    const camelKey = reverseMapping[key] || key;
    newObj[camelKey] = obj[key];
  }
  return newObj;
};

export const collection = (_db: any, path: string) => path;
export const query = (col: any, ...args: any[]) => ({ path: col, args });
export const orderBy = (field: string, dir: string) => ({ type: 'orderBy', field: mapping[field] || field, dir });
export const doc = (_db: any, colName: string, id: string) => ({ colName, id });
export const db = {}; 

export const onSnapshot = (
  queryObj: any, 
  callback: (snapshot: any) => void, 
  errorCallback?: (error: any) => void
) => {
   // **GUARDIA DE SEGURIDAD CRÍTICA**
   // Si el cliente de Supabase no se pudo inicializar (por falta de credenciales),
   // detenemos la ejecución aquí para evitar que la aplicación se bloquee.
   if (!supabase) {
     return () => {}; // Devuelve una función de desuscripción vacía.
   }
   let path = '';
   let orderArgs: any = null;
   if (typeof queryObj === 'string') {
      path = queryObj;
   } else {
      path = queryObj.path;
      orderArgs = queryObj.args?.find((a: any) => a.type === 'orderBy');
   }

   const fetchData = async () => {
      let req = supabase.from(path).select('*');
      if (orderArgs) req = req.order(orderArgs.field, { ascending: orderArgs.dir !== 'desc' });
      
      const { data, error } = await req;
      if (error) {
         if (errorCallback) errorCallback(error);
         return;
      }
      if (data) {
         callback({
            docs: data.map((d: any) => ({ data: () => toCamel(d), id: d.id }))
         });
      }
   };

   fetchData();

   const channel = supabase.channel(`public:${path}`);
   if (!channel) {
     console.error(`No se pudo crear el canal de comunicación para: ${path}`);
     return () => {}; // Devuelve una función de desuscripción vacía
   }
   
   channel
      .on('postgres_changes', { event: '*', schema: 'public', table: path }, () => {
          fetchData();
      })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          // console.log(`Canal suscrito para: ${path}`);
        } else if (err) {
          console.error(`Error de suscripción al canal para ${path}:`, err);
        }
      });

   return () => {
       supabase.removeChannel(channel);
   };
};

export const addDoc = async (colName: string, data: any) => {
   const { data: res, error } = await supabase.from(colName).insert(toSnake(data)).select().single();
   if (error) throw error;
   return { id: res.id };
};

export const setDoc = async (docRef: { colName: string, id: string }, data: any) => {
   const { error } = await supabase.from(docRef.colName).upsert({ id: docRef.id, ...toSnake(data) });
   if (error) throw error;
};

export const updateDoc = async (docRef: { colName: string, id: string }, data: any) => {
   const { error } = await supabase.from(docRef.colName).update(toSnake(data)).match({ id: docRef.id });
   if (error) throw error;
};

export const deleteDoc = async (docRef: { colName: string, id: string }) => {
   const { error } = await supabase.from(docRef.colName).delete().match({ id: docRef.id });
   if (error) throw error;
};

export const getDocFromServer = async (docRef: { colName: string, id: string }) => {
   const { data, error } = await supabase.from(docRef.colName).select('*').match({ id: docRef.id }).single();
   if (error) throw error;
   return { id: data.id, data: () => toCamel(data) };
};
