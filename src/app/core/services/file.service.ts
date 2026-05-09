import { Injectable, signal, computed } from '@angular/core';

export interface VirtualFile {
  name: string;
  path: string; // Ej: "Proyecto/src/main.y"
  content: string;
  type: 'file' | 'folder';
}

@Injectable({
  providedIn: 'root',
})
export class FileService {
  public selectedFolderPath = signal<string>('');
  public openFiles = signal<VirtualFile[]>([]);
  public files = signal<VirtualFile[]>([]);

  // Señal para el archivo que está abierto en el editor
  public activeFile = signal<VirtualFile | null>(null);

  constructor() {}

  createItem(name: string, parentPath: string, type: 'file' | 'folder', content: string = '') {
    const fullPath = parentPath ? `${parentPath}/${name}` : name;

    if (this.files().find((f) => f.path === fullPath)) {
      console.error('El archivo ya existe');
      return;
    }

    const newItem: VirtualFile = { name, path: fullPath, content, type };
    // Actualizamos el arreglo simple
    this.files.update((current) => [...current, newItem]);
  }

  // Actualiza el contenido del archivo mientras el usuario escribe
  updateActiveFileContent(newContent: string) {
    const currentActive = this.activeFile();
    if (currentActive) {
      // Actualizamos el archivo en el arreglo global
      this.files.update((files) =>
        files.map((f) => (f.path === currentActive.path ? { ...f, content: newContent } : f)),
      );
      // Actualizamos la señal activa
      this.activeFile.set({ ...currentActive, content: newContent });
    }
  }

  resolveImportPath(currentFilePath: string, importPath: string): string | null {
    importPath = importPath.replace(/['"]/g, '');
    const parts = currentFilePath.split('/');
    parts.pop();

    const importParts = importPath.split('/');
    for (const part of importParts) {
      if (part === '.') continue;
      if (part === '..') parts.pop();
      else parts.push(part);
    }

    const finalPath = parts.join('/');
    // Búsqueda directa en el arreglo
    const found = this.files().find((f) => f.path === finalPath && f.type === 'file');
    return found ? found.content : null;
  }

  importFile(file: File, parentPath: string) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      this.createItem(file.name, parentPath, 'file', content);
    };
    reader.readAsText(file); // Leemos como texto para el editor
  }

  createFolder(name: string, parentPath: string) {
    this.createItem(name, parentPath, 'folder', '');
  }

  // Borrar un archivo o carpeta (y todo su contenido)
  deleteItem(path: string) {
    this.files.update(currentFiles => 
      currentFiles.filter(f => f.path !== path && !f.path.startsWith(`${path}/`))
    );
    this.closeFile(path); // <-- Agrega esta línea
  }

  // Renombrar un archivo o carpeta
  renameItem(oldPath: string, newName: string) {
    const currentFiles = this.files();
    const item = currentFiles.find((f) => f.path === oldPath);
    if (!item) return;

    const pathParts = oldPath.split('/');
    pathParts[pathParts.length - 1] = newName;
    const newPath = pathParts.join('/');

    this.files.update((files) =>
      files.map((f) => {
        if (f.path === oldPath) {
          return { ...f, name: newName, path: newPath };
        }
        if (f.path.startsWith(`${oldPath}/`)) {
          const updatedPath = f.path.replace(oldPath, newPath);
          return { ...f, path: updatedPath };
        }
        return f;
      }),
    );

    // Actualizar el archivo activo si fue afectado
    const active = this.activeFile();
    if (active?.path === oldPath) {
      this.activeFile.set({ ...active, name: newName, path: newPath });
    }
  }

  // Metodo para abrir un archivo en una pestaña
  openFile(file: VirtualFile) {
    const currentOpen = this.openFiles();
    // Si no está abierto, lo agregamos a la lista
    if (!currentOpen.find(f => f.path === file.path)) {
      this.openFiles.update(files => [...files, file]);
    }
    // Lo marcamos como el archivo activo para mostrarlo
    this.activeFile.set(file);
  }

  // Metodo para cerrar una pestaña
  closeFile(path: string) {
    const currentOpen = this.openFiles();
    const newOpenFiles = currentOpen.filter(f => f.path !== path);
    this.openFiles.set(newOpenFiles);

    // Si cerramos el archivo que estábamos viendo, cambiamos al último disponible
    if (this.activeFile()?.path === path) {
      this.activeFile.set(newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null);
    }
  }

  // Exporta el arbol de trabajo actual
  exportProject() {
    const data = JSON.stringify(this.files(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'proyecto_yfera.json';
    link.click();
  }

  //Descarga el código final HTML para visualización
  downloadFinalHTML(htmlContent: string) {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    a.click();
  }
}
