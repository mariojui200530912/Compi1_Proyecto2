import { Component, ViewChild, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileService } from '../../core/services/file.service';
import { FileExplorerComponent } from '../file-explorer/file-explorer.component';
import { DatabaseService } from '../../core/services/database.service';
import { EditorStateService } from '../../core/services/editor-state.service';
import { HighlightYferaPipe } from '../../core/pipes/highlight-yfera.pipe';
import { ErrorReportComponent } from '../error-report/error-report.component';
import { CompilerService } from '../../core/services/compiler.service';
import { SymbolTableComponent } from '../symbol-table/symbol-table.component';

@Component({
  selector: 'yfera-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HighlightYferaPipe,
    ErrorReportComponent,
    SymbolTableComponent,
    FileExplorerComponent,
  ],
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css'],
})
export class EditorComponent {
  public fileService = inject(FileService);
  public dbService = inject(DatabaseService);

  // Pestaña inferior activa
  public activeBottomTab: 'errores' | 'simbolos' | 'sql' = 'errores';

  public sqlQuery: string = '';
  public sqlHistory: { query: string; result: any }[] = [];

  // Resultados de compilación
  public listaErrores: any[] = [];
  public previewHtml: string = '';

  @ViewChild(SymbolTableComponent) symbolTable!: SymbolTableComponent;

  constructor(
    private editorState: EditorStateService,
    private compilerService: CompilerService,
  ) {}

  // Getters computados para que lean siempre del Signal
  get editorCode(): string {
    return this.fileService.activeFile()?.content || '';
  }

  get currentFilePath(): string {
    return this.fileService.activeFile()?.path || '';
  }

  // Cuentas de líneas dinámicas usando Signals
  public lineCount = computed(() => {
    const content = this.fileService.activeFile()?.content || '';
    const lines = content.split('\n').length;
    return Array.from({ length: lines || 1 }, (_, i) => i + 1);
  });

  // UNIFICADO: Actualiza el contenido en el servicio cuando escribes
  onContentChange(newContent: string) {
    this.fileService.updateActiveFileContent(newContent);
  }

  // UNIFICADO: Sincroniza el scroll para los números de línea Y el resaltador
  syncScroll(textarea: HTMLTextAreaElement, lineNumbers: HTMLElement) {
    // 1. Sincroniza los números de línea (solo vertical)
    lineNumbers.scrollTop = textarea.scrollTop;

    // 2. Sincroniza la capa del resaltador de sintaxis (vertical y horizontal)
    const highlight = document.querySelector('.editor-highlight') as HTMLElement;
    if (highlight) {
      highlight.scrollTop = textarea.scrollTop;
      highlight.scrollLeft = textarea.scrollLeft;
    }
  }

  // Maneja la tabulación sin perder el foco
  handleTab(event: Event) {
    event.preventDefault();
    const textarea = event.target as HTMLTextAreaElement;
    const start = textarea.selectionStart;
    const currentFile = this.fileService.activeFile();

    if (currentFile) {
      const newContent =
        currentFile.content.substring(0, start) +
        '    ' + // 4 espacios
        currentFile.content.substring(textarea.selectionEnd);

      this.fileService.updateActiveFileContent(newContent);

      // Espera a que Angular actualice la vista para devolver el cursor a su lugar
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      }, 0);
    }
  }

  // Inserta color en la posición del cursor
  insertColor(color: string) {
    const currentFile = this.fileService.activeFile();
    const textarea = document.querySelector('.editor-input') as HTMLTextAreaElement;

    if (currentFile && textarea) {
      const start = textarea.selectionStart;
      const newContent =
        currentFile.content.substring(0, start) +
        color +
        currentFile.content.substring(textarea.selectionEnd);

      this.fileService.updateActiveFileContent(newContent);
    }
  }

  // Compilación
  async onCompile() {
    if (!this.fileService.activeFile()) return;

    const result = await this.compilerService.compile(this.editorCode, this.currentFilePath);
    this.listaErrores = this.compilerService.reporteErrores;

    if (result.success) {
      this.previewHtml = result.html ?? '';
      // Actualiza la tabla de símbolos si existe el componente
      setTimeout(() => {
        if (this.symbolTable) this.symbolTable.actualizarTabla();
      }, 100);
    }
  }

  // Cerrar pestañas
  closeTab(event: Event, path: string) {
    event.stopPropagation();
    this.fileService.closeFile(path);
  }

  // Ejecutar comandos SQL desde la consola integrada
  async ejecutarSQLConsole() {
    if (!this.sqlQuery.trim()) return;

    const comandoYfera = this.sqlQuery;
    this.sqlQuery = '';

    const result = await this.compilerService.ejecutarComandoConsola(comandoYfera);

    if (result.success) {

      let hasData = false;
      let cols: any[] = [];
      let vals: any[] = [];

      if (result.data && result.data.length > 0) {
        const dataSet = Array.isArray(result.data[0]) ? result.data[0][0] : result.data[0];
        
        if (dataSet && dataSet.columns) {
          hasData = true;
          cols = dataSet.columns;
          vals = dataSet.values;
        }
      }

      if (hasData) {
        this.sqlHistory.push({
          query: comandoYfera,
          result: { 
            type: 'data', 
            columns: cols,
            values: vals
          }
        });
      } else {
        this.sqlHistory.push({
          query: comandoYfera,
          result: { 
            type: 'success', 
            message: '✔ Comando ejecutado correctamente.' 
          }
        });
      }

    } else {
      this.listaErrores = this.compilerService.reporteErrores;
      this.sqlHistory.push({
        query: comandoYfera,
        result: { 
          type: 'error', 
          message: `❌ Error de sintaxis YFERA. Tienes ${this.listaErrores.length} error(es). Revisa la pestaña de Errores.` 
        }
      });
      this.activeBottomTab = 'errores';
    }

    setTimeout(() => {
      const container = document.querySelector('.sql-scroll-container') as HTMLElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 50);
  }

  focusSqlInput() {
    setTimeout(() => {
      const input = document.querySelector('#sqlConsoleInput') as HTMLInputElement;
      if (input) {
        input.focus();
      }
    }, 0);
  }
}
