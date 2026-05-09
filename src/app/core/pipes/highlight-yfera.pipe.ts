import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

declare var require: any;
const highlighter = require('../grammar/highlighter_lexer');

@Pipe({
  name: 'highlightYfera',
  standalone: true
})
export class HighlightYferaPipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) {}

  transform(code: string): SafeHtml {
    if (!code) return '';

    // Reiniciamos el lexer con el nuevo código
    highlighter.lexer.setInput(code);
    
    let html = "";
    let token: string;

    try {
      while (token = highlighter.lexer.lex()) {
        const text = highlighter.lexer.yytext;
        
        // Asignamos clases de CSS según el token identificado por Jison
        switch (token) {
          case 'RESERVADA':
            html += `<span class="y-purple">${text}</span>`;
            break;
          case 'OPERADOR':
            html += `<span class="y-green">${text}</span>`;
            break;
          case 'STRING':
            html += `<span class="y-orange">${text}</span>`;
            break;
          case 'LITERAL_NUM':
            html += `<span class="y-blue-light">${text}</span>`;
            break;
          case 'SIMBOLO':
            html += `<span class="y-blue-dark">${text}</span>`;
            break;
          case 'COMENTARIO':
            html += `<span class="y-gray">${text}</span>`;
            break;
          case 'VARIABLE':
            html += `<span class="y-white">${text}</span>`;
            break;
          case 'ESPACIO':
            html += text;
            break;
          case 'EOF':
            break;
          default:
            html += text;
        }
      }
    } catch (e) {
      // En caso de error léxico en el resaltador, escapamos el HTML básico para evitar fallos
      return code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // Usamos bypassSecurityTrustHtml para que Angular permita renderizar los spans
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}