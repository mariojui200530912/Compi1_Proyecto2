import { Component, inject, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompilerService } from '../../core/services/compiler.service';
import { DatabaseService } from '../../core/services/database.service';

@Component({
  selector: 'app-sql-console',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sql-console.component.html',
  styleUrls: ['./sql-console.component.css']
})
export class SqlConsoleComponent {
  private compilerService = inject(CompilerService);
  public dbService = inject(DatabaseService);

  public sqlQuery = '';
  public sqlHistory = this.dbService.sqlHistory;

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  async ejecutarSQLConsole() {
    if (!this.sqlQuery.trim()) return;

    // Protección: Verificar si la DB está cargada
    if (!this.dbService.isReady) {
      this.dbService.agregarAlHistorial(this.sqlQuery, {
        type: 'error',
        message: '⌛ La base de datos se está inicializando. Reintenta en un segundo.'
      });
      return;
    }

    const comando = this.sqlQuery;
    this.sqlQuery = '';

    const result = await this.compilerService.ejecutarComandoConsola(comando);

    if (result.success) {
      let hasData = false;
      let cols: any[] = [];
      let vals: any[] = [];

      // Procesar datos devueltos por SQL.js
      if (result.data && result.data.length > 0) {
        const firstSet = result.data[0];
        const dataSet = Array.isArray(firstSet) ? firstSet[0] : firstSet;

        if (dataSet && dataSet.columns) {
          hasData = true;
          cols = dataSet.columns;
          vals = dataSet.values;
        }
      }

      this.dbService.agregarAlHistorial(comando, hasData 
        ? { type: 'data', columns: cols, values: vals }
        : { type: 'success', message: '✔ Comando ejecutado correctamente.' }
      );
    } else {
      this.dbService.agregarAlHistorial(comando, {
        type: 'error',
        message: '❌ Error de sintaxis YFERA o SQL. Revisa la pestaña de Errores.'
      });
    }

    this.scrollToBottom();
  }

  private agregarAlHistorial(query: string, result: any) {
    this.sqlHistory.update(h => [...h, { query, result }]);
  }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    }, 50);
  }

  focusSqlInput() {
    const input = document.querySelector('#sqlConsoleInput') as HTMLInputElement;
    if (input) input.focus();
  }

  limpiarConsola() {
    this.dbService.limpiarHistorial();
  }
}