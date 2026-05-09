import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { FileService } from './file.service';
import { StylesService } from './styles.service';
import { ComponentsService } from './components.service';
import { SymbolTable, DataType, Symbol } from '../models/symbol-table';

// Importación de parsers generados por Jison
declare var require: any;
const MainParser = require('../grammar/main_parser.js');
const StylesParser = require('../grammar/styles_parser.js');
const ComponentsParser = require('../grammar/components_parser.js');
const SQLParser = require('../grammar/sql_parser.js');
const HighlighterLexer = require('../grammar/highlighter_lexer.js');

@Injectable({
  providedIn: 'root',
})
export class CompilerService {
  private globalST: SymbolTable;
  public reporteErrores: any[] = [];
  public htmlGenerado: string = '';
  private astEstilos: any[] = [];
  private astComponentes: any[] = [];

  constructor(
    private dbService: DatabaseService,
    private fileService: FileService,
    private stylesService: StylesService,
    private componentsService: ComponentsService,
  ) {
    this.globalST = new SymbolTable();

    // API inyectada para la comunicación entre la vista (HTML) y la lógica (YFERA)
    (window as any).YFERA_API = {
      ejecutar: async (nombreFuncion: string, valoresArgumentos: any[]) => {
        const simboloFuncion = this.globalST.get(nombreFuncion);
        if (simboloFuncion && simboloFuncion.type === DataType.FUNCION) {
          const funcionAST = simboloFuncion.value;
          const tablaLocal = new SymbolTable(this.globalST);

          funcionAST.params.forEach((param: any, index: number) => {
            tablaLocal.declare(
              param.id,
              new Symbol(
                param.id,
                param.tipoParam as DataType,
                valoresArgumentos[index],
                0,
                0,
                'API',
              ),
            );
          });

          await this.ejecutarBloque(funcionAST.cuerpo, tablaLocal, 'API');
          console.log(`Función ${nombreFuncion} ejecutada con éxito desde la vista.`);
        } else {
          alert(`Error: La función ${nombreFuncion} no existe en el archivo principal.`);
        }
      },
    };
  }

  // --- PUNTO DE ENTRADA PRINCIPAL ---
  public async compile(sourceCode: string, filePath: string) {
    this.reporteErrores = [];
    this.globalST = new SymbolTable();
    this.astEstilos = [];
    this.astComponentes = [];
    this.htmlGenerado = '';

    try {
      const ast = MainParser.parse(sourceCode);

      for (const imp of ast.imports) {
        const content = this.fileService.resolveImportPath(filePath, imp);
        if (content) {
          if (imp.endsWith('.styles')) this.processStyles(content, imp);
          if (imp.endsWith('.comp')) this.processComponents(content, imp);
        } else {
          this.registrarError(
            imp,
            0,
            0,
            'Semántico',
            'No se encontró el archivo importado',
            'main.y',
          );
        }
      }

      if (ast.globales && ast.globales.length > 0) {
        await this.ejecutarBloque(ast.globales, this.globalST, filePath);
      }

      let dataResultado = null;
      if (ast.main && ast.main.cuerpo) {
        dataResultado = await this.ejecutarBloque(ast.main.cuerpo, this.globalST, filePath);
      }

      return { success: true, html: this.htmlGenerado, data: dataResultado };
    } catch (e: any) {
      const textoError = e.message || String(e) || 'Error desconocido';
      const desc = textoError.replace(/\r?\n|\r/g, ' ');

      this.registrarError(
        e.hash?.token || 'EOF',
        (e.hash?.line || 0) + 1,
        e.hash?.loc?.first_column || 0,
        'Sintáctico',
        desc,
        filePath,
      );

      return { success: false, errores: this.reporteErrores };
    }
  }

  // --- EJECUCIÓN DE CONSOLA SQL ---
  public async ejecutarComandoConsola(comando: string) {
    this.reporteErrores = [];
    try {
      const astSql = SQLParser.parse(comando);
      let ultimoResultado = null;
      for (const inst of astSql) {
        const res = await this.dbService.executeQuery(inst);
        if (inst.tipo === 'SELECT') {
          ultimoResultado = res;
        }
      }
      return { success: true, data: ultimoResultado ? [ultimoResultado] : null };
    } catch (e: any) {
      const desc = e.hash
        ? `Error cerca de '${e.hash.text}'. Se esperaba: ${e.hash.expected?.join(', ') || 'otra instrucción'}`
        : e.message || 'Error de sintaxis SQL';

      this.registrarError(
        e.hash?.token || 'Error',
        (e.hash?.line || 0) + 1,
        e.hash?.loc?.first_column || 0,
        'Sintáctico',
        desc,
        'Consola SQL',
      );
      return { success: false, errores: this.reporteErrores };
    }
  }

  // --- EJECUCIÓN DE SQL INYECTADO ---
  private async ejecutarSQLInyectado(queryEnmascarada: string, tabla: SymbolTable) {
    let queryFinal = queryEnmascarada.replace(/`/g, '');

    // Buscar variables inyectadas (ej. $pp, $atack)
    const variablesInyectadas = queryFinal.match(/\$[a-zA-Z_][a-zA-Z0-9_]*/g);

    if (variablesInyectadas) {
      for (const varConDolar of variablesInyectadas) {
        const nombreVariable = varConDolar.substring(1);
        const simbolo = tabla.get(nombreVariable);

        if (simbolo) {
          const valorAInyectar =
            typeof simbolo.value === 'string' ? `"${simbolo.value}"` : simbolo.value;
          queryFinal = queryFinal.replace(varConDolar, valorAInyectar);
        } else {
          this.registrarError(
            varConDolar,
            0,
            0,
            'Semántico',
            `Variable ${varConDolar} no definida`,
          );
        }
      }
    }

    try {
      const astSql = SQLParser.parse(queryFinal);
      for (const inst of astSql) {
        const res = await this.dbService.executeQuery(inst);
        if (inst.tipo === 'SELECT') return res;
      }
    } catch (e: any) {
      this.registrarError(queryFinal, 0, 0, 'Sintáctico', 'Error en SQL inyectado: ' + e.message);
    }
    return null;
  }

  // --- EJECUTOR PRINCIPAL DE BLOQUES (AST) ---
  private async ejecutarBloque(
    instrucciones: any[],
    tabla: SymbolTable,
    filePath: string,
  ): Promise<any> {
    let ultimoResultado = null;

    for (const inst of instrucciones) {
      switch (inst.tipo) {
        case 'DECLARACION':
          const valor = await this.evaluarExpresion(inst.valor, tabla);
          const simDecl = new Symbol(
            inst.id,
            inst.dataType as DataType,
            valor,
            inst.linea || 0,
            inst.columna || 0,
          );
          // Inyectamos la ubicación para la tabla de símbolos (cubrimos ambas posibles nomenclaturas)
          (simDecl as any).archivo = filePath;
          (simDecl as any).ubicacion = filePath;
          tabla.declare(inst.id, simDecl);
          break;

        case 'ASIGNACION':
          const nvoValor = await this.evaluarExpresion(inst.valor, tabla);
          const sim = tabla.get(inst.id);
          if (sim) sim.value = nvoValor;
          else
            this.registrarError(
              inst.id,
              inst.linea || 0,
              inst.columna || 0,
              'Semántico',
              'Variable no declarada',
              filePath,
            );
          break;

        case 'ASIGNACION_ARR':
          const arrSim = tabla.get(inst.id);
          const indice = await this.evaluarExpresion(inst.indice, tabla);
          const valorArr = await this.evaluarExpresion(inst.valor, tabla);
          if (arrSim && Array.isArray(arrSim.value)) arrSim.value[indice] = valorArr;
          break;

        case 'DEC_ARREGLO_TAM':
          const tam = await this.evaluarExpresion(inst.tamano, tabla);
          const simArrTam = new Symbol(
            inst.id,
            inst.dataType as DataType,
            new Array(tam).fill(null),
            inst.linea || 0,
            inst.columna || 0,
          );
          (simArrTam as any).archivo = filePath;
          (simArrTam as any).ubicacion = filePath;
          tabla.declare(inst.id, simArrTam);
          break;

        case 'DEC_ARREGLO_LISTA':
          const valores = [];
          for (const exp of inst.valores) valores.push(await this.evaluarExpresion(exp, tabla));
          const simArrList = new Symbol(
            inst.id,
            inst.dataType as DataType,
            valores,
            inst.linea || 0,
            inst.columna || 0,
          );
          (simArrList as any).archivo = filePath;
          (simArrList as any).ubicacion = filePath;
          tabla.declare(inst.id, simArrList);
          break;

        case 'DEC_ARREGLO_SQL':
          const resSql = await this.ejecutarSQLInyectado(inst.query, tabla);
          const simArrSql = new Symbol(
            inst.id,
            inst.dataType as DataType,
            resSql || [],
            inst.linea || 0,
            inst.columna || 0,
          );
          (simArrSql as any).archivo = filePath;
          (simArrSql as any).ubicacion = filePath;
          tabla.declare(inst.id, simArrSql);
          break;

        case 'FUNCION':
          const simFunc = new Symbol(
            inst.id,
            DataType.FUNCION,
            inst,
            inst.linea || 0,
            inst.columna || 0,
          );
          (simFunc as any).archivo = filePath;
          (simFunc as any).ubicacion = filePath;
          tabla.declare(inst.id, simFunc);
          break;

        case 'IF':
          const condicionIf = await this.evaluarExpresion(inst.condicion, tabla);
          if (condicionIf) {
            await this.ejecutarBloque(inst.cuerpo_verdadero, new SymbolTable(tabla), filePath);
          } else if (inst.cuerpo_falso) {
            if (inst.cuerpo_falso.tipo === 'IF') {
              await this.ejecutarBloque([inst.cuerpo_falso], tabla, filePath);
            } else {
              await this.ejecutarBloque(inst.cuerpo_falso.cuerpo, new SymbolTable(tabla), filePath);
            }
          }
          break;

        case 'WHILE':
          while (await this.evaluarExpresion(inst.condicion, tabla)) {
            await this.ejecutarBloque(inst.cuerpo, new SymbolTable(tabla), filePath);
          }
          break;

        case 'FOR':
          const localFor = new SymbolTable(tabla);
          await this.ejecutarBloque([inst.inicializacion], localFor, filePath);
          while (await this.evaluarExpresion(inst.condicion, localFor)) {
            await this.ejecutarBloque(inst.cuerpo, new SymbolTable(localFor), filePath);
            await this.ejecutarBloque([inst.actualizacion], localFor, filePath);
          }
          break;

        case 'CALL_COMP':
          const componenteAST = this.buscarComponenteAST(inst.id);
          if (componenteAST) {
            try {
              const argsEvaluados = [];
              for (const arg of inst.argumentos) {
                argsEvaluados.push(await this.evaluarExpresion(arg, tabla));
              }

              const compHTML = await this.componentsService.renderizarComponente(
                componenteAST,
                argsEvaluados,
                tabla,
              );
              this.htmlGenerado += compHTML;
            } catch (error: any) {
              this.registrarError(
                inst.id,
                inst.linea || 0,
                inst.columna || 0,
                'Semántico',
                `Error al renderizar componente: ${error.message}`,
                filePath,
              );
            }
          } else {
            this.registrarError(
              inst.id,
              inst.linea || 0,
              inst.columna || 0,
              'Semántico',
              `Componente ${inst.id} no encontrado`,
              filePath,
            );
          }
          break;

        case 'SQL_EXEC':
          ultimoResultado = await this.ejecutarSQLInyectado(inst.query, tabla);
          break;

        case 'LOAD':
          const rutaArchivo = await this.evaluarExpresion(inst.ruta, tabla);
          const contenidoArchivoY = this.fileService.resolveImportPath('', rutaArchivo);

          if (contenidoArchivoY) {
            try {
              const astNuevoY = MainParser.parse(contenidoArchivoY);

              if (astNuevoY.globales && astNuevoY.globales.length > 0) {
                // Al cargar un archivo nuevo, le pasamos la ruta nueva como filePath
                await this.ejecutarBloque(astNuevoY.globales, this.globalST, rutaArchivo);
              }
              if (astNuevoY.main && astNuevoY.main.cuerpo) {
                ultimoResultado = await this.ejecutarBloque(
                  astNuevoY.main.cuerpo,
                  this.globalST,
                  rutaArchivo,
                );
              }

              console.log(`Archivo ${rutaArchivo} cargado y ejecutado con éxito.`);
            } catch (error: any) {
              this.registrarError(
                rutaArchivo,
                0,
                0,
                'Sintáctico',
                `Error al parsear el archivo cargado: ${error.message}`,
                filePath,
              );
            }
          } else {
            this.registrarError(
              rutaArchivo,
              inst.linea || 0,
              inst.columna || 0,
              'Semántico',
              `No se encontró el archivo .y para cargar`,
              filePath,
            );
          }
          break;
      }
    }
    return ultimoResultado;
  }

  private buscarComponenteAST(nombreComponente: string): any | null {
    return this.astComponentes.find((comp) => comp.nombre === nombreComponente) || null;
  }

  // --- EVALUADOR DE EXPRESIONES ---
  private async evaluarExpresion(exp: any, tabla: SymbolTable): Promise<any> {
    if (exp.tipo === 'LITERAL') return exp.val;

    if (exp.tipo === 'ACCESO_VAR') {
      const sym = tabla.get(exp.id);
      if (!sym) throw new Error(`Variable ${exp.id} no definida`);
      return sym.value;
    }

    if (exp.tipo === 'ACCESO_ARREGLO') {
      const sym = tabla.get(exp.id);
      if (!sym) throw new Error(`Arreglo ${exp.id} no definido`);
      const index = await this.evaluarExpresion(exp.indice, tabla);
      return sym.value[index];
    }

    if (exp.tipo === 'ARITMETICA') {
      const left = await this.evaluarExpresion(exp.left, tabla);
      const right = await this.evaluarExpresion(exp.right, tabla);
      switch (exp.op) {
        case '+':
          return left + right;
        case '-':
          return left - right;
        case '*':
          return left * right;
        case '/':
          return right !== 0 ? left / right : 0;
        case '%':
          return left % right;
        case 'UNARIO':
          return -(await this.evaluarExpresion(exp.val, tabla));
      }
    }

    if (exp.tipo === 'RELACIONAL') {
      const left = await this.evaluarExpresion(exp.left, tabla);
      const right = await this.evaluarExpresion(exp.right, tabla);
      switch (exp.op) {
        case '==':
          return left == right;
        case '!=':
          return left != right;
        case '>':
          return left > right;
        case '<':
          return left < right;
        case '>=':
          return left >= right;
        case '<=':
          return left <= right;
      }
    }

    if (exp.tipo === 'LOGICA') {
      const left = exp.left ? await this.evaluarExpresion(exp.left, tabla) : null;
      const right = exp.right ? await this.evaluarExpresion(exp.right, tabla) : null;
      switch (exp.op) {
        case '&&':
          return left && right;
        case '||':
          return left || right;
        case '!':
          return !(await this.evaluarExpresion(exp.val, tabla));
      }
    }
    return null;
  }

  // --- PROCESAMIENTO DE IMPORTACIONES ---
  private processStyles(content: string, nombreArchivo: string) {
    try {
      const ast = StylesParser.parse(content);
      this.astEstilos = this.astEstilos.concat(ast);
    } catch (e: any) {
      this.registrarError('Importación', 0, 0, 'Sintáctico', e.message, nombreArchivo);
    }
  }

  private processComponents(content: string, nombreArchivo: string) {
    try {
      const componentesNuevos = ComponentsParser.parse(content);

      for (const nuevoComp of componentesNuevos) {
        const existe = this.astComponentes.find((c) => c.nombre === nuevoComp.nombre);

        if (existe) {
          this.registrarError(
            nuevoComp.nombre,
            0,
            0,
            'Semántico',
            `El componente '${nuevoComp.nombre}' ya fue declarado. Los nombres de componentes no se pueden repetir.`,
            nombreArchivo,
          );
        } else {
          this.astComponentes.push(nuevoComp);
        }
      }
    } catch (e: any) {
      this.registrarError(
        'Importación',
        0,
        0,
        'Sintáctico',
        'Error en archivo .comp: ' + e.message,
        nombreArchivo,
      );
    }
  }

  // --- GENERACIÓN HTML ---
  public descargarHTML() {
    const cssFinal = this.stylesService?.generarCSS(this.astEstilos ?? []) ?? '';
    const plantilla = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Proyecto YFERA</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      <style>
        ${cssFinal}
      </style>
    </head>
    <body>
      <div class="container mt-5">
        ${this.htmlGenerado}
      </div>
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    </body>
    </html>`;

    const blob = new Blob([plantilla], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'proyecto_yfera.html';
    a.click();
  }

  // --- UTILIDADES ---
  public getSimbolosActuales(): Symbol[] {
    return this.globalST.getAllSymbols();
  }

  private registrarError(
    lex: string,
    lin: number,
    col: number,
    tipo: string,
    desc: string,
    archivo: string = 'main.y',
  ) {
    const nuevoError = {
      lexema: lex,
      linea: lin,
      columna: col,
      tipo: tipo,
      descripcion: desc,
      archivo: archivo,
    };

    // El spread operator crea una nueva referencia en memoria para el arreglo
    this.reporteErrores = [...this.reporteErrores, nuevoError];
  }

  public getHighlighterLexer() {
    if (HighlighterLexer && typeof HighlighterLexer.setInput === 'function') {
      return HighlighterLexer;
    } else if (HighlighterLexer.lexer && typeof HighlighterLexer.lexer.setInput === 'function') {
      return HighlighterLexer.lexer;
    } else if (
      HighlighterLexer.parser?.lexer &&
      typeof HighlighterLexer.parser.lexer.setInput === 'function'
    ) {
      return HighlighterLexer.parser.lexer;
    }

    return HighlighterLexer.default?.lexer || HighlighterLexer.default || HighlighterLexer;
  }
}
