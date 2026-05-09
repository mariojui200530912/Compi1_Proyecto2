import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CompilerService } from '../../core/services/compiler.service';

@Component({
  selector: 'app-code-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './code-editor.component.html',
  styleUrls: ['./code-editor.component.css'],
})
export class CodeEditorComponent implements OnChanges {
  @Input() content: string = '';
  @Output() contentChange = new EventEmitter<string>();

  @ViewChild('editorTextarea') textarea!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('lineNumbersDiv') lineNumbers!: ElementRef<HTMLElement>;

  public highlightedContent: SafeHtml = '';
  private sanitizer = inject(DomSanitizer);
  private compilerService = inject(CompilerService);

  get lines() {
    const linesCount = this.content.split('\n').length;
    return Array.from({ length: linesCount || 1 }, (_, i) => i + 1);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['content']) {
      this.aplicarColorJison(this.content);
    }
  }

  onTextChange(value: string) {
    this.content = value;
    this.contentChange.emit(value);
    this.aplicarColorJison(value);
  }

  syncScroll() {
    const text = this.textarea.nativeElement;
    const lines = this.lineNumbers.nativeElement;
    const highlight = document.querySelector('.editor-highlight') as HTMLElement;

    lines.scrollTop = text.scrollTop;
    if (highlight) {
      highlight.scrollTop = text.scrollTop;
      highlight.scrollLeft = text.scrollLeft;
    }
  }

  private aplicarColorJison(codigo: string) {
    if (!codigo) {
      this.highlightedContent = '';
      return;
    }

    const highlighter = this.compilerService.getHighlighterLexer();

    // Mantenemos solo una validación de seguridad silenciosa
    if (!highlighter || typeof highlighter.setInput !== 'function') {
      this.highlightedContent = this.sanitizer.bypassSecurityTrustHtml(this.escapeHtml(codigo));
      return;
    }

    let htmlSalida = '';

    try {
      highlighter.setInput(codigo);
      if (highlighter.yy) highlighter.yy = {};

      let token: string | number;

      while (true) {
        token = highlighter.lex();

        if (!token || token === 'EOF' || token === 1) break;

        const textEscapado = this.escapeHtml(highlighter.yytext);

        switch (token) {
          case 'RESERVADA':
            htmlSalida += `<span style="color: #c678dd; font-weight: bold;">${textEscapado}</span>`;
            break;
          case 'OPERADOR':
            htmlSalida += `<span style="color: #98c379;">${textEscapado}</span>`;
            break;
          case 'STRING':
            htmlSalida += `<span style="color: #d19a66;">${textEscapado}</span>`;
            break;
          case 'LITERAL_NUM':
            htmlSalida += `<span style="color: #56b6c2;">${textEscapado}</span>`;
            break;
          case 'SIMBOLO':
          case 'OTRO':
            htmlSalida += `<span style="color: #61afef;">${textEscapado}</span>`;
            break;
          case 'VARIABLE':
            htmlSalida += `<span style="color: #e5c07b;">${textEscapado}</span>`;
            break;
          case 'IDENTIFICADOR':
            htmlSalida += `<span style="color: #abb2bf;">${textEscapado}</span>`;
            break;
          case 'COMENTARIO':
            htmlSalida += `<span style="color: #5c6370; font-style: italic;">${textEscapado}</span>`;
            break;
          case 'ERROR':
            htmlSalida += `<span style="color: #e06c75; text-decoration: underline;">${textEscapado}</span>`;
            break;
          default:
            htmlSalida += textEscapado;
        }
      }

      this.highlightedContent = this.sanitizer.bypassSecurityTrustHtml(htmlSalida);
    } catch (e) {
      // En producción es mejor no saturar la consola, solo mostramos el texto plano
      this.highlightedContent = this.sanitizer.bypassSecurityTrustHtml(this.escapeHtml(codigo));
    }
  }

  private escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  handleKeydown(event: KeyboardEvent) {
    const el = this.textarea.nativeElement;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const value = this.content;

    if (event.key === 'Tab') {
      event.preventDefault();
      this.insertSnippet('    ');
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const lastNewline = value.lastIndexOf('\n', start - 1);
      const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
      const currentLine = value.substring(lineStart, start);
      const whitespaceMatch = currentLine.match(/^\s*/);
      const whitespace = whitespaceMatch ? whitespaceMatch[0] : '';

      let extraIndent = currentLine.trim().endsWith('{') ? '    ' : '';
      const indentToAdd = whitespace + extraIndent;

      this.content = value.substring(0, start) + '\n' + indentToAdd + value.substring(end);
      this.contentChange.emit(this.content);
      this.aplicarColorJison(this.content); // Actualizar color al dar enter

      setTimeout(() => {
        el.selectionStart = el.selectionEnd = start + 1 + indentToAdd.length;
        this.syncScroll();
      }, 0);
    }
  }

  public insertSnippet(text: string) {
    const el = this.textarea.nativeElement;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    this.content = this.content.substring(0, start) + text + this.content.substring(end);
    this.contentChange.emit(this.content);
    this.aplicarColorJison(this.content); // Actualizar color al insertar

    setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + text.length;
      el.focus();
      this.syncScroll();
    }, 0);
  }
}
