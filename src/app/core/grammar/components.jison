/* ANALIZADOR LÉXICO */
%lex
%options case-sensitive

%%

\s+                         /* ignorar espacios */
"/*"[\s\S]*?"*/"            /* ignorar comentarios */
"//".* /* ignorar comentarios de una línea */

/* Tipos de datos */
"int"                       return 'RINT';
"string"                    return 'RSTRING';
"boolean"                   return 'RBOOL';
"float"                     return 'RFLOAT';
"char"                      return 'RCHAR';
"function"                  return 'RFUNCTION';

/* Elementos de UI */
"T"                         return 'RTEXTO';
"IMG"                       return 'RIMG';
"FORM"                      return 'RFORM';
"INPUT_TEXT"                return 'RINPUT_TEXT';
"INPUT_NUMBER"              return 'RINPUT_NUMBER';
"INPUT_BOOL"                return 'RINPUT_BOOL';
"SUBMIT"                    return 'RSUBMIT';

/* Atributos de Formularios */
"id"                        return 'RID';
"label"                     return 'RLABEL';
"value"                     return 'RVALUE';

/* Lógica */
"for each"                  return 'RFOR_EACH';
"for"                       return 'RFOR';
"track"                     return 'RTRACK';
"empty"                     return 'REMPTY';
"if"                        return 'RIF';
"else"                      return 'RELSE';
"switch"                    return 'RSWITCH';
"case"                      return 'RCASE';
"default"                   return 'RDEFAULT';

/* Booleanos */
"true"                      return 'RTRUE';
"false"                     return 'RFALSE';

/* Operadores relacionales y lógicos */
"<="                        return 'OP_MENORIGUAL';
">="                        return 'OP_MAYORIGUAL';
"=="                        return 'OP_IGUALDAD';
"!="                        return 'OP_DISTINTO';
"<"                         return 'OP_MENOR';
">"                         return 'OP_MAYOR';
"&&"                        return 'OP_AND';
"||"                        return 'OP_OR';
"!"                         return 'OP_NOT';

/* Operadores aritméticos y Símbolos */
"+"                         return '+';
"-"                         return '-';
"*"                         return '*';
"/"                         return '/';
"%"                         return '%';

/* Símbolos Estructurales */
"[["                        return 'D_COR_IZQ';  /* <--- NUEVO: Evita conflicto de tabla vs seccion */
"]]"                        return 'D_COR_DER';  /* <--- NUEVO */
"{"                         return '{';
"}"                         return '}';
"("                         return '(';
")"                         return ')';
"["                         return '[';
"]"                         return ']';
"<"                         return '<';
">"                         return '>';
","                         return ',';
":"                         return ':';
"@"                         return '@';

/* Variables y Cadenas */
"$"[a-zA-Z0-9_]+            return 'VARIABLE';
\"[^\"]*\"                  return 'STRING_LITERAL';
[0-9]+("."[0-9]+)?          return 'NUMERO';

[a-zA-Z_][a-zA-Z0-9_]* return 'IDENTIFICADOR';

<<EOF>>                     return 'EOF';
.                           return 'INVALID';

/lex

/* Asociación y Precedencia */
%left 'OP_MAYOR' 'OP_MAYORIGUAL' 'OP_MENOR' 'OP_MENORIGUAL' 'OP_IGUALDAD' 'OP_DISTINTO'
%left '+' '-' 'OP_OR' 'OP_AND'
%left '*' '/' 'OP_NOT'
%left '%'
%right UMINUS

%start inicio

%%

/* REGLAS SINTACTICAS */

inicio
    : componentes EOF { return $1; }
    ;

componentes
    : componentes componente { $1.push($2); $$ = $1; }
    | componente { $$ = [$1]; }
    ;

componente
    : IDENTIFICADOR '(' parametros ')' '{' cuerpo_comp '}'
      { $$ = { tipo: 'COMPONENTE', nombre: $1, params: $3, cuerpo: $6 }; }
    ;

parametros
    : lista_parametros { $$ = $1; }
    | /* vacío */ { $$ = []; }
    ;

lista_parametros
    : lista_parametros ',' parametro { $1.push($3); $$ = $1; }
    | parametro { $$ = [$1]; }
    ;

parametro
    : tipo IDENTIFICADOR { $$ = { tipo: $1, id: $2 }; }
    ;

tipo: RINT | RSTRING | RBOOL | RFLOAT | RCHAR | RFUNCTION ;

cuerpo_comp
    : cuerpo_comp elemento { $1.push($2); $$ = $1; }
    | /* vacío */ { $$ = []; }
    ;

elemento
    : seccion { $$ = $1; }
    | tabla { $$ = $1; }
    | texto { $$ = $1; }
    | imagen { $$ = $1; }
    | formulario { $$ = $1; }
    | logica { $$ = $1; }
    ;

/* --- SECCIONES --- */
seccion
    : lista_estilos '[' cuerpo_comp ']' { $$ = { tipo: 'SECCION', estilos: $1, contenido: $3 }; }
    | '[' cuerpo_comp ']' { $$ = { tipo: 'SECCION', estilos: [], contenido: $2 }; }
    ;

lista_estilos
    : '<' ids_estilos '>' { $$ = $2; }
    ;

ids_estilos
    : ids_estilos ',' IDENTIFICADOR { $1.push($3); $$ = $1; }
    | IDENTIFICADOR { $$ = [$1]; }
    ;

/* --- TABLAS --- */
tabla
    : lista_estilos D_COR_IZQ cuerpo_tabla D_COR_DER 
      { $$ = { tipo: 'TABLA', estilos: $1, filas: $3 }; }
    | D_COR_IZQ cuerpo_tabla D_COR_DER 
      { $$ = { tipo: 'TABLA', estilos: [], filas: $2 }; }
    ;

cuerpo_tabla
    : cuerpo_tabla fila { $1.push($2); $$ = $1; }
    | fila { $$ = [$1]; }
    ;

fila
    : D_COR_IZQ celdas D_COR_DER { $$ = { tipo: 'FILA', celdas: $2 }; }
    ;

celdas
    : celdas celda { $1.push($2); $$ = $1; }
    | celda { $$ = [$1]; }
    ;

celda
    : D_COR_IZQ cuerpo_comp D_COR_DER { $$ = { tipo: 'CELDA', contenido: $2 }; }
    ;

/* --- TEXTO E IMÁGENES --- */
texto
    : RTEXTO lista_estilos '(' STRING_LITERAL ')' { $$ = { tipo: 'TEXTO', estilos: $2, contenido: $4.replace(/\"/g, "") }; }
    | RTEXTO '(' STRING_LITERAL ')' { $$ = { tipo: 'TEXTO', estilos: [], contenido: $3.replace(/\"/g, "") }; }
    ;

imagen
    : RIMG lista_estilos '(' lista_urls ')' 
      { $$ = { tipo: 'IMAGEN', estilos: $2, fuentes: $4 }; }
    | RIMG '(' lista_urls ')' 
      { $$ = { tipo: 'IMAGEN', estilos: [], fuentes: $3 }; }
    ;

lista_urls
    : lista_urls ',' expresion { $1.push($3); $$ = $1; }
    | expresion { $$ = [$1]; }
    ;

/* --- FORMULARIOS --- */
formulario
    : RFORM lista_estilos '{' cuerpo_comp '}' form_submit
      { $$ = { tipo: 'FORMULARIO', estilos: $2, cuerpo: $4, submit: $6 }; }
    | RFORM '{' cuerpo_comp '}' form_submit
      { $$ = { tipo: 'FORMULARIO', estilos: [], cuerpo: $3, submit: $5 }; }
    ;

form_submit
    : RSUBMIT lista_estilos '{' RLABEL ':' STRING_LITERAL func_submit '}'
      { $$ = { tipo: 'SUBMIT', estilos: $2, label: $6.replace(/\"/g, ""), funcion: $7 }; }
    | RSUBMIT '{' RLABEL ':' STRING_LITERAL func_submit '}'
      { $$ = { tipo: 'SUBMIT', estilos: [], label: $5.replace(/\"/g, ""), funcion: $6 }; }
    | /* vacío */ { $$ = null; }
    ;

func_submit
    : RFUNCTION ':' VARIABLE '(' lista_arrobas ')'
      { $$ = { id: $3, args: $5 }; }
    | /* vacío */ { $$ = null; }
    ;

lista_arrobas
    : lista_arrobas ',' '@' IDENTIFICADOR { $1.push('@' + $4); $$ = $1; }
    | '@' IDENTIFICADOR { $$ = ['@' + $2]; }
    ;

elemento
    : input_item { $$ = $1; }
    ;

input_item
    : tipo_input lista_estilos '(' RID ':' STRING_LITERAL ',' RLABEL ':' STRING_LITERAL ',' RVALUE ':' expresion ')'
      { $$ = { tipo: $1, estilos: $2, id: $6.replace(/\"/g, ""), label: $10.replace(/\"/g, ""), valor: $14 }; }
    | tipo_input '(' RID ':' STRING_LITERAL ',' RLABEL ':' STRING_LITERAL ',' RVALUE ':' expresion ')'
      { $$ = { tipo: $1, estilos: [], id: $5.replace(/\"/g, ""), label: $9.replace(/\"/g, ""), valor: $13 }; }
    ;

tipo_input
    : RINPUT_TEXT { $$ = 'INPUT_TEXT'; }
    | RINPUT_NUMBER { $$ = 'INPUT_NUMBER'; }
    | RINPUT_BOOL { $$ = 'INPUT_BOOL'; }
    ;

/* --- LÓGICA --- */
logica
    : ciclo_for { $$ = $1; }
    | if_stmt { $$ = $1; }
    | switch_stmt { $$ = $1; }
    ;

if_stmt
    : RIF '(' expresion ')' '{' cuerpo_comp '}' else_stmt 
      { $$ = { tipo: 'IF', condicion: $3, entonces: $6, sino: $8 }; }
    ;

else_stmt
    : RELSE if_stmt { $$ = $2; }
    | RELSE '{' cuerpo_comp '}' { $$ = { tipo: 'ELSE', cuerpo: $3 }; }
    | /* vacío */ { $$ = null; }
    ;

switch_stmt
    : RSWITCH '(' expresion ')' '{' lista_casos '}'
      { $$ = { tipo: 'SWITCH', variable: $3, casos: $6 }; }
    ;

lista_casos
    : lista_casos ',' caso_item { $1.push($3); $$ = $1; }
    | caso_item { $$ = [$1]; }
    ;

caso_item
    : RCASE expresion '{' cuerpo_comp '}'
      { $$ = { tipo: 'CASE', valor: $2, cuerpo: $4 }; }
    | RDEFAULT '{' cuerpo_comp '}'
      { $$ = { tipo: 'DEFAULT', cuerpo: $3 }; }
    ;

ciclo_for
    : RFOR_EACH '(' VARIABLE ':' VARIABLE ')' '{' cuerpo_comp '}'
      { $$ = { tipo: 'FOR_EACH', array: $3, alias: $5, cuerpo: $8 }; }
    | RFOR '(' VARIABLE ':' VARIABLE ',' VARIABLE ':' VARIABLE ')' RTRACK VARIABLE '{' cuerpo_comp '}' bloque_empty
      { $$ = { tipo: 'FOR_COMPLEJO', array1: $3, alias1: $5, array2: $7, alias2: $9, indice: $12, cuerpo: $14, vacio: $16 }; }
    ;

bloque_empty
    : REMPTY '{' cuerpo_comp '}' { $$ = $3; }
    | /* vacío */ { $$ = null; }
    ;

/* --- EXPRESIONES GLOBALES --- */
expresion
    : expresion '+' expresion { $$ = { tipo: 'ARITMETICA', op: '+', left: $1, right: $3 }; }
    | expresion '-' expresion { $$ = { tipo: 'ARITMETICA', op: '-', left: $1, right: $3 }; }
    | expresion '*' expresion { $$ = { tipo: 'ARITMETICA', op: '*', left: $1, right: $3 }; }
    | expresion '/' expresion { $$ = { tipo: 'ARITMETICA', op: '/', left: $1, right: $3 }; }
    | expresion '%' expresion { $$ = { tipo: 'ARITMETICA', op: '%', left: $1, right: $3 }; }
    | '-' expresion %prec UMINUS { $$ = { tipo: 'ARITMETICA', op: 'UNARIO', val: $2 }; }
    
    | expresion OP_MENOR expresion  { $$ = { tipo: 'RELACIONAL', op: '<', left: $1, right: $3 }; }
    | expresion OP_MAYOR expresion  { $$ = { tipo: 'RELACIONAL', op: '>', left: $1, right: $3 }; }
    | expresion OP_MENORIGUAL expresion { $$ = { tipo: 'RELACIONAL', op: '<=', left: $1, right: $3 }; }
    | expresion OP_MAYORIGUAL expresion { $$ = { tipo: 'RELACIONAL', op: '>=', left: $1, right: $3 }; }
    | expresion OP_IGUALDAD expresion { $$ = { tipo: 'RELACIONAL', op: '==', left: $1, right: $3 }; }
    | expresion OP_DISTINTO expresion { $$ = { tipo: 'RELACIONAL', op: '!=', left: $1, right: $3 }; }
    
    | expresion OP_AND expresion    { $$ = { tipo: 'LOGICA', op: '&&', left: $1, right: $3 }; }
    | expresion OP_OR expresion     { $$ = { tipo: 'LOGICA', op: '||', left: $1, right: $3 }; }
    | OP_NOT expresion              { $$ = { tipo: 'LOGICA', op: '!', val: $2 }; }
    
    | NUMERO                        { $$ = { tipo: 'LITERAL', val: Number($1) }; }
    | STRING_LITERAL                { $$ = { tipo: 'LITERAL', val: $1.replace(/\"/g, "") }; }
    | RTRUE                         { $$ = { tipo: 'LITERAL', val: true }; }
    | RFALSE                        { $$ = { tipo: 'LITERAL', val: false }; }
    | VARIABLE                      { $$ = { tipo: 'ACCESO_VAR', id: $1 }; }
    | VARIABLE '[' expresion ']'    { $$ = { tipo: 'ACCESO_ARREGLO', id: $1, indice: $3 }; }
    | '(' expresion ')'             { $$ = $2; }
    ;