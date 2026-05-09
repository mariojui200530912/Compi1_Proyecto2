/* ANALIZADOR LÉXICO */
%lex

%%

/* ESPACIOS Y COMENTARIOS */
\s+                                     /* ignorar espacios en blanco */
"//".* /* comentarios de una línea con // */
"#".* /* comentarios de una línea con # */
"/*"[^*]*"*"([^/*][^*]*"*"*)*"/"        /* comentarios multilínea */

/* PALABRAS RESERVADAS - TIPOS */
"int"               return 'R_INT';
"float"             return 'R_FLOAT';
"string"            return 'R_STRING';
"boolean"           return 'R_BOOLEAN';
"char"              return 'R_CHAR';

/* PALABRAS RESERVADAS - CONTROL DE FLUJO */
"if"                return 'R_IF';
"else"              return 'R_ELSE';
"switch"            return 'R_SWITCH';
"case"              return 'R_CASE';
"default"           return 'R_DEFAULT';
"while"             return 'R_WHILE';
"do"                return 'R_DO';
"for"               return 'R_FOR';
"break"             return 'R_BREAK';
"continue"          return 'R_CONTINUE';

/* PALABRAS RESERVADAS - ESTRUCTURA Y BD */
"import"            return 'R_IMPORT';
"main"              return 'R_MAIN';
"function"          return 'R_FUNCTION';
"execute"           return 'R_EXECUTE';
"load"              return 'R_LOAD';

/* BOOLEANOS (case insensitive por las opciones) */
"true"              return 'R_TRUE';
"false"             return 'R_FALSE';

/* OPERADORES Y SÍMBOLOS */
"%"                 return 'OP_MODULO';
"++"                return 'OP_INC';
"--"                return 'OP_DEC';
"+"                 return 'OP_MAS';
"-"                 return 'OP_MENOS';
"*"                 return 'OP_MULT';
"/"                 return 'OP_DIV';

"<="                return 'OP_MENORIGUAL';
">="                return 'OP_MAYORIGUAL';
"=="                return 'OP_IGUALDAD';
"!="                return 'OP_DISTINTO';
"<"                 return 'OP_MENOR';
">"                 return 'OP_MAYOR';

"&&"                return 'OP_AND';
"||"                return 'OP_OR';
"!"                 return 'OP_NOT';

"="                 return 'IGUAL';
";"                 return 'PT_COMA';
":"                 return 'DOS_PT';
","                 return 'COMA';
"{"                 return 'LLAVE_IZQ';
"}"                 return 'LLAVE_DER';
"("                 return 'PAR_IZQ';
")"                 return 'PAR_DER';
"["                 return 'COR_IZQ';
"]"                 return 'COR_DER';
"@"                 return 'ARROBA';

/* LITERALES Y TOKENS COMPLEJOS */
\"[^\"]*\"                  return 'CADENA';
\'[^\']\'                   return 'CARACTER';
[0-9]+"."[0-9]+             return 'DECIMAL';
[0-9]+                      return 'ENTERO';
"`"[^`]+"`"                 return 'SQL_QUERY';
[a-zA-Z_][a-zA-Z0-9_]* return 'IDENTIFICADOR';

<<EOF>>                     return 'EOF';
.                           return 'INVALID';

/lex

/* PRECEDENCIA DE OPERADORES */
/* Nivel 0 (Menor precedencia) */
%left 'OP_MAYOR' 'OP_MAYORIGUAL' 'OP_MENOR' 'OP_MENORIGUAL' 'OP_IGUALDAD' 'OP_DISTINTO'

/* Nivel 1 */
%left 'OP_MAS' 'OP_MENOS' 'OP_OR' 'OP_AND'

/* Nivel 2 */
%left 'OP_MULT' 'OP_DIV'
%right 'OP_NOT'

/* Nivel 3 */
%left 'OP_MODULO'

/* Nivel 4 (Mayor precedencia) */
%right UMINUS
%left 'OP_INC' 'OP_DEC'

%start inicio

%%

/* REGLAS SINTÁCTICAS (AST) */

inicio
    : programa EOF { return $1; }
    ;

programa
    : lista_imports declaraciones_globales bloque_main 
      { $$ = { tipo: 'PROGRAMA', imports: $1, globales: $2, main: $3 }; }
    | declaraciones_globales bloque_main               
      { $$ = { tipo: 'PROGRAMA', imports: [], globales: $1, main: $2 }; }
    | lista_imports bloque_main                        
      { $$ = { tipo: 'PROGRAMA', imports: $1, globales: [], main: $2 }; }
    | bloque_main                                      
      { $$ = { tipo: 'PROGRAMA', imports: [], globales: [], main: $1 }; }
    ;

/* --- IMPORTS --- */
lista_imports
    : lista_imports importacion { $1.push($2); $$ = $1; }
    | importacion { $$ = [$1]; }
    ;

importacion
    : R_IMPORT CADENA PT_COMA { $$ = $2.replace(/\"/g, ""); }
    ;

/* --- DECLARACIONES GLOBALES (Variables, Arreglos, Funciones) --- */
declaraciones_globales
    : declaraciones_globales dec_global { $1.push($2); $$ = $1; }
    | dec_global { $$ = [$1]; }
    ;

dec_global
    : declaracion_var PT_COMA { $$ = $1; }
    | declaracion_arreglo PT_COMA { $$ = $1; }
    | funcion { $$ = $1; }
    ;

/* --- TIPO DE DATOS --- */
tipo
    : R_INT { $$ = 'int'; }
    | R_FLOAT { $$ = 'float'; }
    | R_STRING { $$ = 'string'; }
    | R_BOOLEAN { $$ = 'boolean'; }
    | R_CHAR { $$ = 'char'; }
    ;

/* --- VARIABLES Y ARREGLOS --- */
declaracion_var
    : tipo IDENTIFICADOR IGUAL expresion 
      { $$ = { tipo: 'DECLARACION', dataType: $1, id: $2, valor: $4 }; }
    ;

declaracion_arreglo
    /* Ej: int[] arreglo = [3]; */
    : tipo COR_IZQ COR_DER IDENTIFICADOR IGUAL COR_IZQ expresion COR_DER 
      { $$ = { tipo: 'DEC_ARREGLO_TAM', dataType: $1, id: $4, tamano: $7 }; }
    /* Ej: string[] pokemons = {"Bulbasaur", "Togepy"}; */
    | tipo COR_IZQ COR_DER IDENTIFICADOR IGUAL LLAVE_IZQ lista_expresiones LLAVE_DER 
      { $$ = { tipo: 'DEC_ARREGLO_LISTA', dataType: $1, id: $4, valores: $7 }; }
    /* Ej: float[] myTeam = execute `sql`; */
    | tipo COR_IZQ COR_DER IDENTIFICADOR IGUAL R_EXECUTE SQL_QUERY 
      { $$ = { tipo: 'DEC_ARREGLO_SQL', dataType: $1, id: $4, query: $7.replace(/`/g, "") }; }
    ;

/* --- FUNCIONES --- */
funcion
    : R_FUNCTION IDENTIFICADOR PAR_IZQ parametros PAR_DER LLAVE_IZQ inst_funcion LLAVE_DER
      { $$ = { tipo: 'FUNCION', id: $2, params: $4, cuerpo: $7 }; }
    | R_FUNCTION IDENTIFICADOR PAR_IZQ PAR_DER LLAVE_IZQ inst_funcion LLAVE_DER
      { $$ = { tipo: 'FUNCION', id: $2, params: [], cuerpo: $6 }; }
    ;

parametros
    : parametros COMA tipo IDENTIFICADOR { $1.push({ tipoParam: $3, id: $4 }); $$ = $1; }
    | tipo IDENTIFICADOR { $$ = [{ tipoParam: $1, id: $2 }]; }
    ;

inst_funcion
    : inst_funcion inst_func { $1.push($2); $$ = $1; }
    | inst_func { $$ = [$1]; }
    ;

inst_func
    : R_EXECUTE SQL_QUERY PT_COMA 
      { $$ = { tipo: 'SQL_EXEC', query: $2.replace(/`/g, "") }; }
    | R_LOAD expresion PT_COMA 
      { $$ = { tipo: 'LOAD', ruta: $2 }; }
    ;

/* --- BLOQUE MAIN --- */
bloque_main
    : R_MAIN LLAVE_IZQ instrucciones LLAVE_DER { $$ = { tipo: 'MAIN', cuerpo: $3 }; }
    ;

instrucciones
    : instrucciones instruccion { $1.push($2); $$ = $1; }
    | instruccion { $$ = [$1]; }
    ;

instruccion
    : declaracion_var PT_COMA { $$ = $1; }
    | declaracion_arreglo PT_COMA { $$ = $1; }
    | asignacion PT_COMA { $$ = $1; }
    | llamada_componente PT_COMA { $$ = $1; }
    | if_stmt { $$ = $1; }
    | switch_stmt { $$ = $1; }
    | while_stmt { $$ = $1; }
    | do_while_stmt PT_COMA { $$ = $1; }
    | for_stmt { $$ = $1; }
    | R_BREAK PT_COMA { $$ = { tipo: 'BREAK' }; }
    | R_CONTINUE PT_COMA { $$ = { tipo: 'CONTINUE' }; }
    ;

/* --- ASIGNACIÓN Y COMPONENTES --- */
asignacion
    : IDENTIFICADOR IGUAL expresion 
      { $$ = { tipo: 'ASIGNACION', id: $1, valor: $3 }; }
    | IDENTIFICADOR COR_IZQ expresion COR_DER IGUAL expresion 
      { $$ = { tipo: 'ASIGNACION_ARR', id: $1, indice: $3, valor: $6 }; }
    ;

llamada_componente
    : ARROBA IDENTIFICADOR PAR_IZQ lista_expresiones PAR_DER 
      { $$ = { tipo: 'CALL_COMP', id: $2, argumentos: $4 }; }
    | ARROBA IDENTIFICADOR PAR_IZQ PAR_DER 
      { $$ = { tipo: 'CALL_COMP', id: $2, argumentos: [] }; }
    ;

/* --- ESTRUCTURAS DE CONTROL --- */
if_stmt
    : R_IF PAR_IZQ expresion PAR_DER LLAVE_IZQ instrucciones LLAVE_DER else_stmt 
      { $$ = { tipo: 'IF', condicion: $3, cuerpo_verdadero: $6, cuerpo_falso: $8 }; }
    ;

else_stmt
    : R_ELSE if_stmt { $$ = $2; }
    | R_ELSE LLAVE_IZQ instrucciones LLAVE_DER { $$ = { tipo: 'ELSE', cuerpo: $3 }; }
    | /* vacío */ { $$ = null; }
    ;

switch_stmt
    : R_SWITCH PAR_IZQ expresion PAR_DER LLAVE_IZQ casos LLAVE_DER
      { $$ = { tipo: 'SWITCH', condicion: $3, casos: $6 }; }
    ;

casos
    : casos caso { $1.push($2); $$ = $1; }
    | caso { $$ = [$1]; }
    ;

caso
    : R_CASE expresion DOS_PT instrucciones { $$ = { tipo: 'CASE', valor: $2, cuerpo: $4 }; }
    | R_CASE expresion DOS_PT { $$ = { tipo: 'CASE', valor: $2, cuerpo: [] }; } /* Soporte para caida en cascada */
    | R_DEFAULT DOS_PT instrucciones { $$ = { tipo: 'DEFAULT', cuerpo: $3 }; }
    ;

while_stmt
    : R_WHILE PAR_IZQ expresion PAR_DER LLAVE_IZQ instrucciones LLAVE_DER
      { $$ = { tipo: 'WHILE', condicion: $3, cuerpo: $6 }; }
    ;

do_while_stmt
    : R_DO LLAVE_IZQ instrucciones LLAVE_DER R_WHILE PAR_IZQ expresion PAR_DER
      { $$ = { tipo: 'DO_WHILE', cuerpo: $3, condicion: $7 }; }
    ;

for_stmt
    /* Soporta i=0; i<10; i=i+1 y tambien i++ */
    : R_FOR PAR_IZQ asignacion PT_COMA expresion PT_COMA asignacion PAR_DER LLAVE_IZQ instrucciones LLAVE_DER
      { $$ = { tipo: 'FOR', inicializacion: $3, condicion: $5, actualizacion: $7, cuerpo: $10 }; }
    ;

/* --- EXPRESIONES --- */
lista_expresiones
    : lista_expresiones COMA expresion { $1.push($3); $$ = $1; }
    | expresion { $$ = [$1]; }
    ;

expresion
    /* Aritméticas */
    : expresion OP_MAS expresion    { $$ = { tipo: 'ARITMETICA', op: '+', left: $1, right: $3 }; }
    | expresion OP_MENOS expresion  { $$ = { tipo: 'ARITMETICA', op: '-', left: $1, right: $3 }; }
    | expresion OP_MULT expresion   { $$ = { tipo: 'ARITMETICA', op: '*', left: $1, right: $3 }; }
    | expresion OP_DIV expresion    { $$ = { tipo: 'ARITMETICA', op: '/', left: $1, right: $3 }; }
    | expresion OP_MODULO expresion { $$ = { tipo: 'ARITMETICA', op: '%', left: $1, right: $3 }; }
    | OP_MENOS expresion %prec UMINUS { $$ = { tipo: 'ARITMETICA', op: 'UNARIO', val: $2 }; }
    
    /* Relacionales */
    | expresion OP_MENOR expresion  { $$ = { tipo: 'RELACIONAL', op: '<', left: $1, right: $3 }; }
    | expresion OP_MAYOR expresion  { $$ = { tipo: 'RELACIONAL', op: '>', left: $1, right: $3 }; }
    | expresion OP_MENORIGUAL expresion { $$ = { tipo: 'RELACIONAL', op: '<=', left: $1, right: $3 }; }
    | expresion OP_MAYORIGUAL expresion { $$ = { tipo: 'RELACIONAL', op: '>=', left: $1, right: $3 }; }
    | expresion OP_IGUALDAD expresion { $$ = { tipo: 'RELACIONAL', op: '==', left: $1, right: $3 }; }
    | expresion OP_DISTINTO expresion { $$ = { tipo: 'RELACIONAL', op: '!=', left: $1, right: $3 }; }
    
    /* Lógicas */
    | expresion OP_AND expresion    { $$ = { tipo: 'LOGICA', op: '&&', left: $1, right: $3 }; }
    | expresion OP_OR expresion     { $$ = { tipo: 'LOGICA', op: '||', left: $1, right: $3 }; }
    | OP_NOT expresion              { $$ = { tipo: 'LOGICA', op: '!', val: $2 }; }
    
    /* Incremento/Decremento (ej. i++) */
    | IDENTIFICADOR OP_INC          { $$ = { tipo: 'ASIGNACION', id: $1, valor: { tipo: 'ARITMETICA', op: '+', left: { tipo: 'ACCESO_VAR', id: $1 }, right: { tipo: 'LITERAL', val: 1 } } }; }
    | IDENTIFICADOR OP_DEC          { $$ = { tipo: 'ASIGNACION', id: $1, valor: { tipo: 'ARITMETICA', op: '-', left: { tipo: 'ACCESO_VAR', id: $1 }, right: { tipo: 'LITERAL', val: 1 } } }; }
    
    /* Valores y Agrupación */
    | PAR_IZQ expresion PAR_DER     { $$ = $2; }
    | IDENTIFICADOR                 { $$ = { tipo: 'ACCESO_VAR', id: $1 }; }
    | IDENTIFICADOR COR_IZQ expresion COR_DER { $$ = { tipo: 'ACCESO_ARREGLO', id: $1, indice: $3 }; }
    | R_TRUE                        { $$ = { tipo: 'LITERAL', dataType: 'boolean', val: true }; }
    | R_FALSE                       { $$ = { tipo: 'LITERAL', dataType: 'boolean', val: false }; }
    | ENTERO                        { $$ = { tipo: 'LITERAL', dataType: 'int', val: parseInt($1) }; }
    | DECIMAL                       { $$ = { tipo: 'LITERAL', dataType: 'float', val: parseFloat($1) }; }
    | CADENA                        { $$ = { tipo: 'LITERAL', dataType: 'string', val: $1.replace(/\"/g, "") }; }
    | CARACTER                      { $$ = { tipo: 'LITERAL', dataType: 'char', val: $1.replace(/\'/g, "") }; }
    ;