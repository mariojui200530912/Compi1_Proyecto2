import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EditorStateService {
  // Usamos BehaviorSubject para que cualquier componente sepa que archivo esta abierto
  private selectedFilePathEntry = new BehaviorSubject<string | null>(null);
  
  // Observable para que el Editor y el TreeView se suscriban
  public selectedFilePath$ = this.selectedFilePathEntry.asObservable();

  constructor() {}

  // Metodo para cambiar el archivo activo
  public setSelectedFile(path: string | null) {
    this.selectedFilePathEntry.next(path);
  }

  // Getter para obtener el valor actual de forma síncrona si es necesario
  public get currentPath(): string | null {
    return this.selectedFilePathEntry.value;
  }
}