import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompilerService } from '../../core/services/compiler.service';
import { Symbol } from '../../core/models/symbol-table';

@Component({
  selector: 'app-symbol-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './symbol-table.component.html',
  styleUrls: ['./symbol-table.component.css']
})
export class SymbolTableComponent implements OnInit {
  private compilerService = inject(CompilerService);
  
  // Arreglo donde guardaremos los símbolos para el HTML
  public simbolos: Symbol[] = [];

  ngOnInit() {
    this.actualizarTabla();
  }

  // Este método es llamado automáticamente por el EditorComponent al compilar
  public actualizarTabla() {
    this.simbolos = this.compilerService.getSimbolosActuales();
  }
}