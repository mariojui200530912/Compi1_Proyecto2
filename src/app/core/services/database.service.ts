import { Injectable, signal } from '@angular/core';
import initSqlJs from 'sql.js';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private db: any;
  public isReady: boolean = false;
  private SQL: any;
  public sqlHistory = signal<{ query: string; result: any }[]>([]);

  constructor() {
    this.initDB(); 
  }

  // Inicializa la base de datos en memoria cargando el archivo WASM de sql.js
  private async initDB() {
    try {
      this.SQL = await initSqlJs({ 
        locateFile: file => `/assets/${file}`
      });
      this.db = new this.SQL.Database(); 
      this.isReady = true;
      console.log("YFERA Database: SQLite está listo.");
    } catch (err) {
      console.error("Error inicializando SQLite:", err);
    }
  }
   // Traduce el AST de tu gramática SQL a sentencias SQL estándar e inserta el ID automático
  public executeQuery(astNode: any): any {
    if (!this.isReady) throw new Error("La base de datos no ha terminado de cargar.");

    let sql = "";

    switch (astNode.tipo) {
      case 'CREATE':
        const columns = astNode.columnas.map((c: any) => {
          let tipoSqlite = this.mapType(c.tipo);
          let pk = c.primaryKey ? ' PRIMARY KEY AUTOINCREMENT' : '';
          return `${c.id} ${tipoSqlite}${pk}`;
        }).join(', ');
        
        sql = `CREATE TABLE ${astNode.tabla} (${columns});`;
        break;

      case 'INSERT':
        const keys = astNode.valores.map((v: any) => v.columna).join(', ');
        const values = astNode.valores.map((v: any) => this.formatValue(v.valor)).join(', ');
        sql = `INSERT INTO ${astNode.tabla} (${keys}) VALUES (${values});`;
        break;

      case 'SELECT':
        sql = `SELECT ${astNode.columna} FROM ${astNode.tabla};`;
        return this.db.exec(sql);

      case 'UPDATE':
        const sets = astNode.valores.map((v: any) => `${v.columna} = ${this.formatValue(v.valor)}`).join(', ');
        sql = `UPDATE ${astNode.tabla} SET ${sets} WHERE id = ${astNode.condicion_id};`;
        break;

      case 'DELETE':
        sql = `DELETE FROM ${astNode.tabla} WHERE id = ${astNode.condicion_id};`;
        break;
    }

    // Para operaciones que no devuelven datos (CREATE, INSERT, UPDATE, DELETE)
    try {
      this.db.exec(sql);
      return []; // Retornamos un arreglo vacío para indicar éxito sin datos
    } catch (e: any) {
      // Lanzamos el error para que el CompilerService lo atrape y lo mande a la consola
      throw new Error(e.message); 
    }
  }

  private mapType(type: string): string {
    switch (type.toLowerCase()) {
      case 'int': return 'INTEGER';
      case 'float': return 'REAL';
      case 'string': return 'TEXT';
      case 'boolean': return 'INTEGER'; // 0 o 1
      default: return 'TEXT';
    }
  }

  private formatValue(val: any): string {
    return typeof val === 'string' ? `'${val}'` : val;
  }

  public runRawSql(sqlQuery: string): any {
    if (!this.isReady) return { type: 'error', message: "La base de datos no está lista." };
    
    try {
      // metodo de sql.js para ejecutar consultas y devolver datos
      const result = this.db.exec(sqlQuery);
      
      // Si la consulta devolvio datos (ej. un SELECT)
      if (result.length > 0) {
        return { 
          type: 'data', 
          columns: result[0].columns, 
          values: result[0].values 
        };
      } else {
        // Si fue un INSERT, UPDATE, DELETE o CREATE exitoso
        return { type: 'success', message: 'Ejecutado con éxito.' };
      }
    } catch (error: any) {
      // Si el SQL tiene errores de sintaxis o la tabla no existe
      return { type: 'error', message: error.message };
    }
  }

  public exportDatabase(): Uint8Array | null {
    if (!this.isReady || !this.db) return null;
    return this.db.export();
  }

  // Sobrescribe la base de datos actual con bytes cargados
  public importDatabase(data: Uint8Array) {
    if (!this.isReady) throw new Error("SQLite no está listo aún.");
    try {
      // Re-instanciamos la BD pasándole los bytes guardados
      this.db = new this.SQL.Database(data);
      console.log("Base de datos restaurada con éxito.");
    } catch (e) {
      console.error("Error al restaurar la base de datos", e);
      throw e;
    }
  }

  public resetDatabase() {
    if (this.isReady && this.SQL) {
      this.db = new this.SQL.Database();
      console.log("Base de datos reiniciada para el nuevo proyecto.");
    }
  }

  agregarAlHistorial(query: string, result: any) {
    this.sqlHistory.update(h => [...h, { query, result }]);
  }

  limpiarHistorial() {
    this.sqlHistory.set([]);
  }
}