/* Definición Léxica */
%lex

%%

\s+                         /* ignorar espacios */
"/*"[\s\S]*?"*/"            /* ignorar comentarios */

"TABLE"                     return 'RTABLE';
"COLUMNS"                   return 'RCOLUMNS';
"DELETE"                    return 'RDELETE';
"IN"                        return 'RIN';

/* Tipos de datos (deben coincidir con el lenguaje principal) */
"int"|"float"|"string"|"boolean"|"char" return 'TIPO_DATO';

/* Símbolos */
"."                         return '.';
","                         return ',';
";"                         return ';';
"="                         return '=';
"["                         return '[';
"]"                         return ']';

/* Literales y Nombres */
\"[^\"]*\"                  return 'STRING_LITERAL';
[0-9]+"."[0-9]+             return 'FLOAT_LITERAL';
[0-9]+                      return 'INT_LITERAL';
[a-zA-Z_][a-zA-Z0-9_]*      return 'IDENTIFICADOR';

<<EOF>>                     return 'EOF';

/lex

%start inicio

%%

inicio
    : instrucciones_sql EOF { return $1; }
    ;

instrucciones_sql
    : instrucciones_sql instruccion_sql { $1.push($2); $$ = $1; }
    | instruccion_sql { $$ = [$1]; }
    ;

instruccion_sql
    : crear_tabla ';'       { $$ = $1; }
    | select_columna ';'    { $$ = $1; }
    | insertar_registro ';' { $$ = $1; }
    | actualizar_registro ';' { $$ = $1; }
    | eliminar_registro ';'  { $$ = $1; }
    ;

crear_tabla
    : RTABLE IDENTIFICADOR RCOLUMNS lista_columnas
      { 
          let columnasFinales = $4;
          
          // Verificamos si el usuario ya escribió una columna llamada 'id'
          let existeId = columnasFinales.find(c => c.id.toLowerCase() === 'id');

          if (!existeId) {
              // Si no la escribieron, la inyectamos al inicio por defecto
              columnasFinales.unshift({ id: 'id', tipo: 'int', primaryKey: true });
          } else {
              // Si la escribieron manualmente, solo la marcamos como llave primaria
              existeId.primaryKey = true;
          }

          $$ = { tipo: 'CREATE', tabla: $2, columnas: columnasFinales }; 
      }
    ;

lista_columnas
    : lista_columnas ',' columna { $1.push($3); $$ = $1; }
    | columna { $$ = [$1]; }
    ;

columna
    : IDENTIFICADOR '=' TIPO_DATO { $$ = { id: $1, tipo: $3 }; }
    ;

select_columna
    : IDENTIFICADOR '.' IDENTIFICADOR 
      { $$ = { tipo: 'SELECT', tabla: $1, columna: $3 }; }
    ;

insertar_registro
    : IDENTIFICADOR '[' lista_asignaciones ']'
      { $$ = { tipo: 'INSERT', tabla: $1, valores: $3 }; }
    ;

actualizar_registro
    : IDENTIFICADOR '[' lista_asignaciones ']' RIN expresion_id
      { $$ = { tipo: 'UPDATE', tabla: $1, valores: $3, condicion_id: $6 }; }
    ;

eliminar_registro
    : IDENTIFICADOR RDELETE expresion_id
      { $$ = { tipo: 'DELETE', tabla: $1, condicion_id: $3 }; }
    ;

lista_asignaciones
    : lista_asignaciones ',' asignacion { $1.push($3); $$ = $1; }
    | asignacion { $$ = [$1]; }
    ;

asignacion
    : IDENTIFICADOR '=' valor_sql { $$ = { columna: $1, valor: $3 }; }
    ;

valor_sql
    : STRING_LITERAL { $$ = $1.replace(/\"/g, ""); }
    | INT_LITERAL    { $$ = parseInt($1); }
    | FLOAT_LITERAL  { $$ = parseFloat($1); }
    | IDENTIFICADOR  { $$ = { tipo: 'VAR_REF', id: $1 }; /* Para $pp, $atack, etc */ }
    ;

expresion_id
    : INT_LITERAL { $$ = parseInt($1); }
    | IDENTIFICADOR { $$ = { tipo: 'VAR_REF', id: $1 }; }
    ;