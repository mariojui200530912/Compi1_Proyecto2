import { Injectable } from '@angular/core';
import { SymbolTable, Symbol, DataType } from '../models/symbol-table';

declare var require: any;
const MainParser = require('../grammar/main_parser.js');

@Injectable({ providedIn: 'root' })
export class ComponentsService {
  public async renderizarComponente(
    compAST: any,
    args: any[],
    tablaPadre: SymbolTable,
  ): Promise<string> {
    const localST = new SymbolTable(tablaPadre);

    if (compAST.params && compAST.params.length > 0) {
      compAST.params.forEach((param: any, index: number) => {
        localST.declare(param.id, new Symbol(param.id, param.tipo, args[index], 0, 0));
      });
    }

    return await this.procesarElementos(compAST.cuerpo, localST);
  }

  private async procesarElementos(elementos: any[], tabla: SymbolTable): Promise<string> {
    let html = '';
    if (!elementos) return html;

    for (const el of elementos) {
      const clasesCSS = el.estilos ? el.estilos.join(' ') : '';

      switch (el.tipo) {
        case 'SECCION':
          const contenidoSeccion = await this.procesarElementos(el.contenido, tabla);
          html += `<div class="${clasesCSS}">${contenidoSeccion}</div>\n`;
          break;

        case 'TABLA':
          html += `<table class="table table-bordered ${clasesCSS}">\n`;
          for (const fila of el.filas) {
            html += `  <tr>\n`;
            for (const celda of fila.celdas) {
              const contenidoCelda = await this.procesarElementos(celda.contenido, tabla);
              html += `    <td>${contenidoCelda}</td>\n`;
            }
            html += `  </tr>\n`;
          }
          html += `</table>\n`;
          break;

        case 'TEXTO':
          const textoResuelto = await this.resolverTexto(el.contenido, tabla);
          // Reemplazamos saltos de línea por <br> para soportar múltiples líneas
          const textoMultilinea = textoResuelto.replace(/\n/g, '<br>');
          html += `<span class="${clasesCSS}">${textoMultilinea}</span>\n`;
          break;

        case 'IMAGEN':
          const urls = [];
          for (const fuente of el.fuentes) {
            urls.push(await this.evaluarExpresion(fuente, tabla));
          }

          if (urls.length > 1) {
            html += this.generarCarrusel(urls, clasesCSS);
          } else if (urls.length === 1) {
            html += `<img src="${urls[0]}" class="${clasesCSS} img-fluid" alt="Imagen">\n`;
          }
          break;

        case 'FORMULARIO':
          html += `<form class="p-3 border rounded ${clasesCSS}" onsubmit="event.preventDefault();">\n`;
          html += await this.procesarElementos(el.cuerpo, tabla);

          if (el.submit) {
            const submitClases = el.submit.estilos
              ? el.submit.estilos.join(' ')
              : 'btn btn-primary mt-3';
            const funcionName = el.submit.funcion ? el.submit.funcion.id : '';
            const argsList = el.submit.funcion ? el.submit.funcion.args.join(', ') : '';
            let jsArgs = el.submit.funcion.args
              .map((arg: string) => {
                const inputId = arg.substring(1);
                return `(document.getElementById('${inputId}').type === 'checkbox' ? document.getElementById('${inputId}').checked : document.getElementById('${inputId}').value)`;
              })
              .join(', ');

            const onClickCode = `window.YFERA_API.ejecutar('${funcionName}', [${jsArgs}])`;

            html += `<button type="submit" class="${submitClases}" onclick="${onClickCode}">${el.submit.label}</button>\n`;
          }
          html += `</form>\n`;
          break;

        case 'INPUT_TEXT':
          const valText = await this.evaluarExpresion(el.valor, tabla);
          html += `
            <div class="mb-3">
              <label for="${el.id}" class="form-label">${el.label}</label>
              <input type="text" class="form-control ${clasesCSS}" id="${el.id}" value="${valText}">
            </div>\n`;
          break;

        case 'INPUT_NUMBER':
          const valNum = await this.evaluarExpresion(el.valor, tabla);
          html += `
            <div class="mb-3">
              <label for="${el.id}" class="form-label">${el.label}</label>
              <input type="number" class="form-control ${clasesCSS}" id="${el.id}" value="${valNum}">
            </div>\n`;
          break;

        case 'INPUT_BOOL':
          const isChecked = (await this.evaluarExpresion(el.valor, tabla)) ? 'checked' : '';
          html += `
            <div class="form-check mb-3">
              <input class="form-check-input ${clasesCSS}" type="checkbox" id="${el.id}" ${isChecked}>
              <label class="form-check-label" for="${el.id}">${el.label}</label>
            </div>\n`;
          break;

        /* --- LOGICA DE CONTROL --- */
        case 'IF':
          const condicion = await this.evaluarExpresion(el.condicion, tabla);
          if (condicion) {
            html += await this.procesarElementos(el.entonces, new SymbolTable(tabla));
          } else if (el.sino) {
            if (el.sino.tipo === 'IF') {
              html += await this.procesarElementos([el.sino], tabla); // else if
            } else {
              html += await this.procesarElementos(el.sino.cuerpo, new SymbolTable(tabla)); // else
            }
          }
          break;

        case 'SWITCH':
          const valorSwitch = await this.evaluarExpresion(el.variable, tabla);
          let matchEncontrado = false;
          let casoDefault = null;

          for (const caso of el.casos) {
            if (caso.tipo === 'CASE') {
              const valorCaso = await this.evaluarExpresion(caso.valor, tabla);
              if (valorSwitch === valorCaso) {
                html += await this.procesarElementos(caso.cuerpo, new SymbolTable(tabla));
                matchEncontrado = true;
                break;
              }
            } else if (caso.tipo === 'DEFAULT') {
              casoDefault = caso;
            }
          }
          if (!matchEncontrado && casoDefault) {
            html += await this.procesarElementos(casoDefault.cuerpo, new SymbolTable(tabla));
          }
          break;

        case 'FOR_EACH':
          const arregloEach =
            (await this.evaluarExpresion({ tipo: 'ACCESO_VAR', id: el.array }, tabla)) || [];
          if (Array.isArray(arregloEach)) {
            for (const item of arregloEach) {
              const scope = new SymbolTable(tabla);
              scope.declare(
                el.alias.substring(1),
                new Symbol(el.alias.substring(1), DataType.ANY, item, 0, 0),
              );
              html += await this.procesarElementos(el.cuerpo, scope);
            }
          }
          break;

        case 'FOR_COMPLEJO':
          const arr1 =
            (await this.evaluarExpresion({ tipo: 'ACCESO_VAR', id: el.array1 }, tabla)) || [];
          const arr2 =
            (await this.evaluarExpresion({ tipo: 'ACCESO_VAR', id: el.array2 }, tabla)) || [];

          if (!Array.isArray(arr1) || !Array.isArray(arr2)) break;

          const maxLen = Math.max(arr1.length, arr2.length);

          if (maxLen === 0 && el.vacio) {
            html += await this.procesarElementos(el.vacio, new SymbolTable(tabla));
          } else {
            for (let i = 0; i < maxLen; i++) {
              const scope = new SymbolTable(tabla);
              scope.declare(
                el.alias1.substring(1),
                new Symbol(el.alias1.substring(1), DataType.ANY, arr1[i], 0, 0),
              );
              scope.declare(
                el.alias2.substring(1),
                new Symbol(el.alias2.substring(1), DataType.ANY, arr2[i], 0, 0),
              );
              scope.declare(
                el.indice.substring(1),
                new Symbol(el.indice.substring(1), DataType.INT, i, 0, 0),
              );
              html += await this.procesarElementos(el.cuerpo, scope);
            }
          }
          break;
      }
    }
    return html;
  }

  // --- METODOS DE EVALUACION ---

  private async resolverTexto(textoOriginal: string, tabla: SymbolTable): Promise<string> {
    let resultadoFinal = textoOriginal;

    const regexOperaciones = /`([^`]+)`/g;
    let matches;
    while ((matches = regexOperaciones.exec(resultadoFinal)) !== null) {
      const operacion = matches[1];
      try {
        const astExpresion = MainParser.parse(operacion);
        const valorCalculado = await this.evaluarExpresion(astExpresion, tabla);
        resultadoFinal = resultadoFinal.replace(
          `\`${operacion}\``,
          valorCalculado !== null ? valorCalculado.toString() : '',
        );
      } catch (e) {
        console.error('Error al evaluar expresión en texto:', operacion, e);
      }
    }

    const regexVariables = /\$[a-zA-Z0-9_]+/g;
    const varMatches = resultadoFinal.match(regexVariables);
    if (varMatches) {
      for (const nombreConDolar of varMatches) {
        const idVariable = nombreConDolar.substring(1);
        const simbolo = tabla.get(idVariable);
        if (simbolo) {
          resultadoFinal = resultadoFinal.replace(nombreConDolar, simbolo.value.toString());
        }
      }
    }

    return resultadoFinal;
  }

  private async evaluarExpresion(exp: any, tabla: SymbolTable): Promise<any> {
    if (!exp) return null;

    if (exp.tipo === 'LITERAL') return exp.val;

    if (exp.tipo === 'ACCESO_VAR') {
      // El AST puede traer el id con o sin $ dependiendo del lexer, limpiamos el $ por seguridad
      const idLimpio = exp.id.startsWith('$') ? exp.id.substring(1) : exp.id;
      const sym = tabla.get(idLimpio);
      return sym ? sym.value : null;
    }

    if (exp.tipo === 'ACCESO_ARREGLO') {
      const idLimpio = exp.id.startsWith('$') ? exp.id.substring(1) : exp.id;
      const sym = tabla.get(idLimpio);
      if (!sym || !Array.isArray(sym.value)) return null;
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

  // --- CARRUSEL DE BOOTSTRAP ---
  private generarCarrusel(urls: string[], clasesCSS: string): string {
    const idCarrusel = `carousel_${Math.random().toString(36).substr(2, 9)}`;

    let html = `<div id="${idCarrusel}" class="carousel slide ${clasesCSS}" data-bs-ride="carousel">\n`;
    html += `  <div class="carousel-indicators">\n`;
    urls.forEach((_, index) => {
      html += `    <button type="button" data-bs-target="#${idCarrusel}" data-bs-slide-to="${index}" class="${index === 0 ? 'active' : ''}"></button>\n`;
    });
    html += `  </div>\n`;

    html += `  <div class="carousel-inner">\n`;
    urls.forEach((url, index) => {
      html += `
        <div class="carousel-item ${index === 0 ? 'active' : ''}">
          <img src="${url}" class="d-block w-100" alt="Slide">
        </div>\n`;
    });
    html += `  </div>\n`;

    html += `
      <button class="carousel-control-prev" type="button" data-bs-target="#${idCarrusel}" data-bs-slide="prev">
        <span class="carousel-control-prev-icon"></span>
      </button>
      <button class="carousel-control-next" type="button" data-bs-target="#${idCarrusel}" data-bs-slide="next">
        <span class="carousel-control-next-icon"></span>
      </button>
    </div>\n`;

    return html;
  }
}
