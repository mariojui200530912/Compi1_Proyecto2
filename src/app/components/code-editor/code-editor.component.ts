import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, inject, } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HighlightYferaPipe } from '../../core/pipes/highlight-yfera.pipe';

@Component({
  selector: 'app-code-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, HighlightYferaPipe],
  templateUrl: './code-editor.component.html',
  styleUrls: ['./code-editor.component.css'],
})
export class CodeEditorComponent {
  @Input() content: string = '';
  @Output() contentChange = new EventEmitter<string>();

  @ViewChild('editorTextarea') textarea!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('lineNumbersDiv') lineNumbers!: ElementRef<HTMLElement>;

  // Genera los números de línea basados en el contenido
  get lines() {
    const linesCount = this.content.split('\n').length;
    return Array.from({ length: linesCount || 1 }, (_, i) => i + 1);
  }

  onTextChange(value: string) {
    this.content = value;
    this.contentChange.emit(value);
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

  handleKeydown(event: KeyboardEvent) {
    const el = this.textarea.nativeElement;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const value = this.content;

    if (event.key === 'Tab') {
      event.preventDefault();
      this.insertSnippet("    ");
    }

    if (event.key === 'Enter') {
      event.preventDefault();

      const lastNewline = value.lastIndexOf('\n', start - 1);
      const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
      const currentLine = value.substring(lineStart, start);

      const whitespaceMatch = currentLine.match(/^\s*/);
      const whitespace = whitespaceMatch ? whitespaceMatch[0] : '';

      let extraIndent = '';
      if (currentLine.trim().endsWith('{')) {
        extraIndent = '    ';
      }

      const indentToAdd = whitespace + extraIndent;
      
      this.content = value.substring(0, start) + '\n' + indentToAdd + value.substring(end);
      this.contentChange.emit(this.content);

      setTimeout(() => {
        el.selectionStart = el.selectionEnd = start + 1 + indentToAdd.length;
        this.syncScroll();
      }, 0);
    }
  }

  handleTab(event: any) {
    event.preventDefault();
    const el = this.textarea.nativeElement;
    const start = el.selectionStart;
    const end = el.selectionEnd;

    this.content = this.content.substring(0, start) + '    ' + this.content.substring(end);
    this.contentChange.emit(this.content);

    setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + 4;
    }, 0);
  }

  public insertText(text: string) {
    const el = this.textarea.nativeElement;
    const start = el.selectionStart;
    this.content =
      this.content.substring(0, start) + text + this.content.substring(el.selectionEnd);
    this.contentChange.emit(this.content);
  }

  public insertSnippet(text: string) {
    const el = this.textarea.nativeElement;
    const start = el.selectionStart;
    const end = el.selectionEnd;

    this.content = this.content.substring(0, start) + text + this.content.substring(end);
    this.contentChange.emit(this.content);

    setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + text.length;
      this.syncScroll();
    }, 0);
  }
}
