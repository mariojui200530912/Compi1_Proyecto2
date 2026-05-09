import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

// Usamos una importación más segura para entornos Angular
declare var require: any;
let highlighter: any;

try {
  highlighter = require('../grammar/highlighter_lexer');
} catch (e) {
  console.error("No se pudo cargar el lexer de resaltado:", e);
}

@Pipe({
  name: 'highlightYfera',
  standalone: true
})
export class HighlightYferaPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);

  transform(code: string): SafeHtml {
    if (!code) return '';

    // VALIDACIÓN CRÍTICA: Si el lexer no cargó, devolvemos el texto plano escapado
    if (!highlighter || !highlighter.lexer) {
      return this.escapeHtml(code);
    }

    let html = "";
    let token: any;

    try {
      // Reiniciamos el lexer de forma segura
      highlighter.lexer.setInput(code);
      
      // Jison lexers a veces mantienen estados previos, reseteamos si es necesario
      if (highlighter.lexer.yy) highlighter.lexer.yy = {}; 

      while (true) {
        token = highlighter.lexer.lex();
        
        // Si el token es undefined, nulo o el lexer llegó al final
        if (!token || token === 'EOF' || token === 1) break;

        const text = highlighter.lexer.yytext;
        
        switch (token) {
          case 'RESERVADA':
            html += `<span class="y-purple">${this.escapeHtml(text)}</span>`;
            break;
          case 'OPERADOR':
            html += `<span class="y-green">${this.escapeHtml(text)}</span>`;
            break;
          case 'STRING':
            html += `<span class="y-orange">${this.escapeHtml(text)}</span>`;
            break;
          case 'LITERAL_NUM':
            html += `<span class="y-blue-light">${this.escapeHtml(text)}</span>`;
            break;
          case 'SIMBOLO':
            html += `<span class="y-blue-dark">${this.escapeHtml(text)}</span>`;
            break;
          case 'COMENTARIO':
            html += `<span class="y-gray">${this.escapeHtml(text)}</span>`;
            break;
          case 'VARIABLE':
            html += `<span class="y-white">${this.escapeHtml(text)}</span>`;
            break;
          case 'ESPACIO':
            html += text;
            break;
          default:
            html += this.escapeHtml(text);
        }
      }
    } catch (e) {
      console.error("Error léxico en Highlighting:", e);
      return this.escapeHtml(code);
    }

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  // Función auxiliar para evitar ataques XSS y que el código no se renderice como HTML real
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}