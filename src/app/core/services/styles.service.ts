import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StylesService {
  private estilosProcesados: Map<string, any[]> = new Map();

  // Transforma el AST de estilos en CSS real
  public generarCSS(ast: any[]): string {
    let css = '';
    this.estilosProcesados.clear();
    
    if (!ast || ast.length === 0) return css;

    ast.forEach((nodo) => {
      if (nodo.tipo === 'ESTILO') {
        // Resolvemos la herencia
        const propiedadesFinales = this.resolverHerencia(nodo);
        
        // Guardamos en el mapa con el nombre limpio (sin punto)
        this.estilosProcesados.set(nodo.nombre, propiedadesFinales);
        
        // Generamos el CSS (usamos el punto '.' porque es una clase CSS)
        css += `.${nodo.nombre} {\n`;
        
        propiedadesFinales.forEach((p: any) => {
          css += `  ${this.formatearPropiedad(p.propiedad)}: ${this.formatearValor(p.valor)};\n`;
        });
        css += `}\n\n`;

      } else if (nodo.tipo === 'FOR') {
        css += this.procesarBucleFor(nodo);
      }
    });
    return css;
  }

  private resolverHerencia(nodo: any): any[] {
    let propsResultantes: any[] = [];

    if (nodo.padre) {
      const propsPadre = this.estilosProcesados.get(nodo.padre);
      if (propsPadre) {
        propsResultantes = JSON.parse(JSON.stringify(propsPadre)); 
      } else {
        console.warn(`Estilo padre '${nodo.padre}' no encontrado. (Debe declararse antes)`);
      }
    }

    nodo.props.forEach((propActual: any) => {
      const index = propsResultantes.findIndex((p) => p.propiedad === propActual.propiedad);
      if (index !== -1) {
        propsResultantes[index] = propActual; // Sobreescribe
      } else {
        propsResultantes.push(propActual); // Agrega
      }
    });

    return propsResultantes;
  }

  private formatearPropiedad(id: string): string {
    const mapeo: any = {
      BG_COLOR: 'background-color',
      TEXT_ALIGN: 'text-align',
      TEXT_SIZE: 'font-size',
      TEXT_FONT: 'font-family',
      BORDER_RADIUS: 'border-radius',
      BORDER_COLOR: 'border-color',
      BORDER_STYLE: 'border-style',
      BORDER_WIDTH: 'border-width',
    };
    return mapeo[id] || id.toLowerCase().replace(/_/g, '-');
  }

  private formatearValor(v: any, variables: Record<string, number> = {}): string {
    if (v.tipo === 'numero') return `${this.evaluarExpresion(v.valor, variables)}px`;
    if (v.tipo === 'porcentaje') return `${this.evaluarExpresion(v.valor, variables)}%`;
    if (v.tipo === 'rgb') return `rgb(${v.r}, ${v.g}, ${v.b})`;
    if (v.tipo === 'hex') return v.valor;
    if (v.tipo === 'border_abrev') return `${v.width}px ${v.style} ${v.color}`;
    
    return v.valor ? v.valor.toLowerCase() : ''; 
  }

  private evaluarExpresion(exp: any, vars: Record<string, number> = {}): number {
    if (!exp) return 0;
    
    switch (exp.tipo) {
      case 'LITERAL': 
        return Number(exp.val);
      case 'ACCESO_VAR': 
        return vars[exp.id] ?? 0; 
      case 'ARITMETICA':
        const left = this.evaluarExpresion(exp.left, vars);
        const right = this.evaluarExpresion(exp.right, vars);
        switch (exp.op) {
          case '+': return left + right;
          case '-': return left - right;
          case '*': return left * right;
          case '/': return right !== 0 ? left / right : 0;
          case '%': return left % right;
          case 'UNARIO': return -this.evaluarExpresion(exp.val, vars);
        }
    }
    return 0;
  }

  private procesarBucleFor(nodo: any): string {
    let resultado = "";
    
    // Evaluamos desde donde hasta donde va el for
    const inicio = this.evaluarExpresion(nodo.inicio);
    let fin = this.evaluarExpresion(nodo.fin);

    if (nodo.rango === 'EXCLUSIVO') {
      fin -= 1;
    }

    for (let i = inicio; i <= fin; i++) {
      // Guardamos la variable actual (ej. { '$i': 1 }) para pasársela a formatearValor
      const contextoVars = { [nodo.variable]: i };

      nodo.cuerpo.forEach((estilo: any) => {
        const nombreClase = estilo.nombre.replace(nodo.variable, i.toString());
        
        resultado += `.${nombreClase} {\n`;
        
        estilo.props.forEach((p: any) => {
          resultado += `  ${this.formatearPropiedad(p.propiedad)}: ${this.formatearValor(p.valor, contextoVars)};\n`;
        });
        resultado += `}\n\n`;
      });
    }
    return resultado;
  }
}