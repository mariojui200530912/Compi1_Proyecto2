import { Component, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-color-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './color-picker.component.html',
  styleUrl: './color-picker.component.css',
})
export class ColorPickerComponent {
  @Output() colorSelected = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  public selectedHex = '#007acc';
  public rgbFormat = 'rgb(0, 122, 204)';

  updateFormats() {
    // Convertir HEX a RGB para el segundo botón
    const r = parseInt(this.selectedHex.slice(1, 3), 16);
    const g = parseInt(this.selectedHex.slice(3, 5), 16);
    const b = parseInt(this.selectedHex.slice(5, 7), 16);
    this.rgbFormat = `rgb(${r}, ${g}, ${b})`;
  }

  selectColor(color: string) {
    this.colorSelected.emit(color);
  }

  onClose() {
    this.close.emit();
  }
}