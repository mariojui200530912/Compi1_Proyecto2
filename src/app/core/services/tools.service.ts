import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToolsService {
  public showColorPicker = signal(false);
  
  toggleColorPicker() {
    this.showColorPicker.update(v => !v);
  }
}