import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-report',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './error-report.component.html',
  styles: [`
    .table-container { max-height: 300px; overflow-y: auto; }
    .bg-error { background-color: #1e1e1e; color: #abb2bf; }
    .text-lexico { color: #d19a66; } /* Naranja */
    .text-sintactico { color: #e06c75; } /* Rojo */
    .text-semantico { color: #c678dd; } /* Morado */
  `]
})
export class ErrorReportComponent {
  // Recibimos la lista de errores desde el componente padre (Editor)
  @Input() errores: any[] = [];
}