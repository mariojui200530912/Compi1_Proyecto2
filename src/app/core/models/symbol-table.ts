export enum DataType {
  INT = 'int',
  FLOAT = 'float',
  STRING = 'string',
  BOOL = 'boolean',
  CHAR = 'char',
  ARRAY = 'array',
  VOID = 'void',
  FUNCION = 'funcion',
  ANY = 'any',
}

export class Symbol {
  constructor(
    public id: string,
    public type: DataType,
    public value: any,
    public line: number,
    public column: number,
    public archivo: string = 'main.y'
  ) {}
}

export class SymbolTable {
  private symbols: Map<string, Symbol>;
  public parent: SymbolTable | null;

  constructor(parent: SymbolTable | null = null) {
    this.symbols = new Map<string, Symbol>();
    this.parent = parent;
  }

  // Guardar una variable nueva
  public declare(id: string, symbol: Symbol): boolean {
    if (this.symbols.has(id)) return false; // Error: Ya declarada en este scope
    this.symbols.set(id, symbol);
    return true;
  }

  // Buscar una variable (recursivo hacia los padres)
  public get(id: string): Symbol | null {
    let current: SymbolTable | null = this;
    while (current != null) {
      if (current.symbols.has(id)) {
        return current.symbols.get(id)!;
      }
      current = current.parent;
    }
    return null;
  }

  // Actualizar valor de variable existente
  public update(id: string, value: any): boolean {
    let symbol = this.get(id);
    if (symbol) {
      symbol.value = value;
      return true;
    }
    return false;
  }

  public getAllSymbols(): Symbol[] {
    return Array.from(this.symbols.values());
  }
}
