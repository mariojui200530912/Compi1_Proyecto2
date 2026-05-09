import { Component, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Servicios
import { FileService } from '../../core/services/file.service';
import { CompilerService } from '../../core/services/compiler.service';

// Componentes Hijos
import { SymbolTableComponent } from '../symbol-table/symbol-table.component';
import { ErrorReportComponent } from '../error-report/error-report.component';
import { SqlConsoleComponent } from '../sql-console/sql-console.component';
import { CodeEditorComponent } from '../code-editor/code-editor.component';
import { PreviewPanelComponent } from '../preview-panel/preview-panel.component';
import { FileExplorerComponent } from '../file-explorer/file-explorer.component';
import { ColorPickerComponent } from '../color-picker/color-picker.component';

@Component({
  selector: 'yfera-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SymbolTableComponent,
    ErrorReportComponent,
    SqlConsoleComponent,
    CodeEditorComponent,
    PreviewPanelComponent,
    FileExplorerComponent,
    ColorPickerComponent
  ],
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css']
})
export class EditorComponent {
  // Inyección de servicios
  public fileService = inject(FileService);
  public compilerService = inject(CompilerService);
  public showColorPicker = signal(false);
  @ViewChild(CodeEditorComponent) codeEditor!: CodeEditorComponent;

  // Estado de la interfaz
  public listaErrores: any[] = [];
  public showPreview = signal(false);
  public previewHtml = '';
  public activeBottomTab: 'errores' | 'simbolos' | 'sql' = 'errores';

  // Referencia a la tabla de símbolos para actualización manual
  @ViewChild(SymbolTableComponent) symbolTable?: SymbolTableComponent;

   // Ejecuta el proceso de compilación del archivo activo
  async onCompile() {
    const activeFile = this.fileService.activeFile();
    if (!activeFile) return;

    // Llamar al motor del compilador
    const result = await this.compilerService.compile(activeFile.content, activeFile.path);

    // Sincronizar reporte de errores (para la tabla inferior)
    this.listaErrores = this.compilerService.reporteErrores;

    if (result.success) {
      // Actualizar la vista previa (Opción Nullish Coalescing para seguridad de TS)
      this.previewHtml = result.html ?? '';
      
      // Mostrar el panel si estaba oculto para ver el resultado
      this.showPreview.set(true);

      // Notificar a la tabla de símbolos que hay nuevos datos
      setTimeout(() => {
        this.symbolTable?.actualizarTabla();
      }, 100);

      console.log("Compilación exitosa.");
    } else {
      // Si hay errores, forzamos el foco en la pestaña de errores
      this.activeBottomTab = 'errores';
      console.warn("Compilación fallida. Revisa el reporte de errores.");
    }
  }

  // Alterna la visibilidad del panel derecho (Preview)
  togglePreview() {
    this.showPreview.update((v) => !v);
  }


  // Cierra un archivo abierto desde las pestañas
  closeTab(event: Event, path: string) {
    event.stopPropagation(); // Evita que se seleccione el archivo al intentar cerrarlo
    this.fileService.closeFile(path);
  }

  insertColorToEditor(color: string) {
    if (this.codeEditor) {
      this.codeEditor.insertSnippet(color);
      this.showColorPicker.set(false);
    }
  }
}