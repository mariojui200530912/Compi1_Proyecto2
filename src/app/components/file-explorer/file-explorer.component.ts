import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileService, VirtualFile } from '../../core/services/file.service';
import { DatabaseService } from '../../core/services/database.service';

@Component({
  selector: 'yfera-file-explorer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-explorer.component.html',
  styleUrl: './file-explorer.component.css',
})
export class FileExplorerComponent {
  public fileService = inject(FileService);
  public dbService = inject(DatabaseService);

  // Estado local de carpetas abiertas
  public openFolders = signal<Set<string>>(new Set());

  // Signal computado: Filtra el arreglo simple para ocultar hijos de carpetas cerradas
  public visibleFiles = computed(() => {
    const openDirs = this.openFolders();

    return this.fileService
      .files()
      .filter((f) => {
        // Si está en la raíz, siempre se ve
        if (!f.path.includes('/')) return true;

        // Extraemos la ruta del padre
        const parentPath = f.path.substring(0, f.path.lastIndexOf('/'));

        // Verificamos si todos sus ancestros están abiertos
        const parts = parentPath.split('/');
        let currentPath = '';
        for (const part of parts) {
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          if (!openDirs.has(currentPath)) return false; // Un padre está cerrado
        }
        return true;
      })
      .sort((a, b) => a.path.localeCompare(b.path)); // Orden alfabético por ruta
  });

  // Calcula la indentación visual basándose en las diagonales del path
  getDepth(path: string): number {
    return path.split('/').length - 1;
  }

  onFileSelected(event: any) {
    const files: FileList = event.target.files;
    const target = this.fileService.selectedFolderPath();

    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        this.fileService.importFile(files[i], target);
      }
    }
    event.target.value = ''; // Limpiamos el input
  }

  // Al seleccionar, actualizamos la carpeta de destino
  selectItem(item: VirtualFile) {
    if (item.type === 'folder') {
      this.fileService.selectedFolderPath.set(item.path);
      // ... lógica de abrir/cerrar carpeta que ya tenías ...
      const current = new Set(this.openFolders());
      current.has(item.path) ? current.delete(item.path) : current.add(item.path);
      this.openFolders.set(current);
    } else {
      this.fileService.openFile(item);
    }
  }

  promptNewFile() {
    const name = prompt('Nombre del nuevo archivo (ej: script.y):');
    if (name) {
      this.fileService.createItem(name, this.fileService.selectedFolderPath(), 'file', '');
    }
  }

  promptNewFolder() {
    const name = prompt('Nombre de la carpeta:');
    if (name) {
      this.fileService.createFolder(name, this.fileService.selectedFolderPath());
    }
  }

  deleteItem(event: Event, path: string) {
    event.stopPropagation(); // Evita que se seleccione el archivo al intentar borrarlo
    if (confirm(`¿Estás seguro de eliminar ${path}?`)) {
      this.fileService.deleteItem(path);
    }
  }

  renameItem(event: Event, item: VirtualFile) {
    event.stopPropagation();
    const newName = prompt(`Renombrar ${item.name} a:`, item.name);
    if (newName && newName !== item.name) {
      this.fileService.renameItem(item.path, newName);
    }
  }

  // LOGICA PARA GUARDAR PROYECTO COMPLETO
  guardarProyecto() {
    let nombreArchivo = prompt('Ingresa el nombre para guardar tu proyecto:', 'nuevo_proyecto');

    if (!nombreArchivo) return;

    if (!nombreArchivo.endsWith('.yfera')) {
      nombreArchivo += '.yfera';
    }

    // Obtenemos los archivos
    const archivos = this.fileService.files();
    
    // Obtenemos la BD y la convertimos de Uint8Array a un Array normal para JSON
    const dbBytes = this.dbService.exportDatabase();
    const baseDeDatos = dbBytes ? Array.from(dbBytes) : null;

    // Armamos el paquete
    const paquete = {
      archivos: archivos,
      baseDeDatos: baseDeDatos
    };

    // Descargamos el archivo con el nombre personalizado
    const blob = new Blob([JSON.stringify(paquete)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo; 
    a.click();
    window.URL.revokeObjectURL(url);
  }

  cargarProyecto(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const paquete = JSON.parse(e.target.result);
        
        // Restaurar Archivos
        if (paquete.archivos) {
          this.fileService.files.set(paquete.archivos); 
          this.fileService.activeFile.set(null); // Cerramos el archivo activo
          this.fileService.openFiles.set([]);    // Limpiamos las pestañas abiertas
          this.openFolders.set(new Set());       // Colapsamos carpetas
        }

        // Restaurar Base de Datos
        if (paquete.baseDeDatos) {
          // Convertimos el Array normal de vuelta a Uint8Array
          const dbBytes = new Uint8Array(paquete.baseDeDatos);
          this.dbService.importDatabase(dbBytes);
        }
        
        alert('✔ Proyecto cargado exitosamente.');
      } catch (error) {
        alert('❌ Error al cargar el proyecto: Archivo inválido o corrupto.');
        console.error(error);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reseteamos el input
  }

  // Metodo para Crear un nuevo proyecto (limpia archivos y reinicia BD)
  nuevoProyecto() {
    if (confirm('¿Estás seguro de crear un nuevo proyecto? Se perderán todos los archivos y datos no guardados.')) {
      this.fileService.files.set([]);
      this.fileService.activeFile.set(null);
      this.fileService.openFiles.set([]);
      this.openFolders.set(new Set());
      this.fileService.selectedFolderPath.set(''); 
      
      this.dbService.resetDatabase();
      
      alert('Nuevo proyecto inicializado con éxito.');
    }
  }
}
