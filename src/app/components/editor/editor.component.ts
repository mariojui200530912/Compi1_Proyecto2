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
  
  // Señales y estado
  public showColorPicker = signal(false);
  public showPreview = signal(false);
  
  // Control de descarga
  public compilacionExitosa = signal(false); // Usamos signal para mejor rendimiento en la UI

  @ViewChild(CodeEditorComponent) codeEditor!: CodeEditorComponent;
  @ViewChild(SymbolTableComponent) symbolTable?: SymbolTableComponent;

  // Estado de la interfaz
  public listaErrores: any[] = [];
  public previewHtml = '';
  public activeBottomTab: 'errores' | 'simbolos' | 'sql' = 'errores';

  // Ejecuta el proceso de compilación del archivo activo
  async onCompile() {
    const activeFile = this.fileService.activeFile();
    if (!activeFile) return;

    // Resetear estado de descarga antes de intentar compilar
    this.compilacionExitosa.set(false);

    // Llamar al motor del compilador
    const result = await this.compilerService.compile(activeFile.content, activeFile.path);

    // Sincronizar reporte de errores
    this.listaErrores = this.compilerService.reporteErrores;

    if (result.success) {
      this.previewHtml = result.html ?? '';
      
      // ACTIVAR BOTÓN DE DESCARGA
      this.compilacionExitosa.set(true);

      // Mostrar el panel de vista previa
      this.showPreview.set(true);

      // Notificar a la tabla de símbolos
      setTimeout(() => {
        this.symbolTable?.actualizarTabla();
      }, 100);

      console.log("Compilación exitosa. Botón de descarga habilitado.");
    } else {
      this.compilacionExitosa.set(false);
      this.activeBottomTab = 'errores';
      console.warn("Compilación fallida. Botón de descarga deshabilitado.");
    }
  }

  // Método para disparar la descarga desde el servicio
  downloadProject() {
    if (this.compilacionExitosa()) {
      this.compilerService.descargarHTML();
    }
  }

  // Alterna la visibilidad del panel derecho (Preview)
  togglePreview() {
    this.showPreview.update((v) => !v);
  }

  // Cierra un archivo abierto desde las pestañas
  closeTab(event: Event, path: string) {
    event.stopPropagation();
    this.fileService.closeFile(path);
  }

  insertColorToEditor(color: string) {
    if (this.codeEditor) {
      this.codeEditor.insertSnippet(color);
      this.showColorPicker.set(false);
    }
  }
}