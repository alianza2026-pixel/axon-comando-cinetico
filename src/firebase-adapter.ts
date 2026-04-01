import { supabase } from './supabase';

/**
 * ADAPTADOR DE FIREBASE A SUPABASE
 * Mantiene la interfaz de comandos igual
 */

export const collection = (db: any, path: string) => path;
export const query = (col: any, ...args: any[]) => ({ path: col, args });
export const orderBy = (field: string, dir: string) => ({ type: 'orderBy', field, dir });
export const doc = (db: any, colName: string, id: string) => ({ colName, id });

export const onSnapshot = (
  queryObj: any, 
  callback: (snapshot: any) => void, 
  errorCallback?: (error: any) => void
) => {
   let path = '';
   let orderArgs: any = null;
   if (typeof queryObj === 'string') {
      path = queryObj;
   } else {
      path = queryObj.path;
      orderArgs = queryObj.args?.find((a: any) => a.type === 'orderBy');
   }

   // 1. Lectura Inicial
   let req = supabase.from(path).select('*');
   if (orderArgs) req = req.order(orderArgs.field, { ascending: orderArgs.dir !== 'desc' });
   
   req.then(({ data, error }) => {
       if (error && errorCallback) return errorCallback(error);
       if (data) {
           callback({
               docs: data.map((d: any) => ({ data: () => d, id: d.id }))
           });
       }
   });

   // 2. Suscripción a Cambios en Tiempo Real (Realtime)
   const channel = supabase.channel(`public:${path}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: path }, (payload) => {
          let req2 = supabase.from(path).select('*');
          if (orderArgs) req2 = req2.order(orderArgs.field, { ascending: orderArgs.dir !== 'desc' });
          req2.then(({ data }) => {
              if (data) {
                  callback({ docs: data.map((d: any) => ({ data: () => d, id: d.id })) });
              }
          });
      })
      .subscribe();

   return () => {
       supabase.removeChannel(channel);
   };
};

export const addDoc = async (colName: string, data: any) => {
   const { data: res, error } = await supabase.from(colName).insert(data).select().single();
   if (error) throw error;
   return { id: res.id };
};

export const setDoc = async (docRef: { colName: string, id: string }, data: any) => {
   const { error } = await supabase.from(docRef.colName).upsert({ id: docRef.id, ...data });
   if (error) throw error;
};

export const updateDoc = async (docRef: { colName: string, id: string }, data: any) => {
   const { error } = await supabase.from(docRef.colName).update(data).match({ id: docRef.id });
   if (error) throw error;
};

export const deleteDoc = async (docRef: { colName: string, id: string }) => {
   const { error } = await supabase.from(docRef.colName).delete().match({ id: docRef.id });
   if (error) throw error;
};

export const getDocFromServer = async (docRef: { colName: string, id: string }) => {
   const { data, error } = await supabase.from(docRef.colName).select('*').match({ id: docRef.id }).single();
   if (error) throw error;
   return { id: data.id, data: () => data };
};
