/* Definicion Lexica */
%lex
%options case-sensitive

%%

\s+                         /* ignorar espacios */
"/*"[\s\S]*?"*/"            /* ignorar comentarios de bloque */

/* Palabras reservadas del for */
"@for"                      return 'FOR';
"from"                      return 'FROM';
"through"                   return 'THROUGH';
"to"                        return 'TO';
"extends"                   return 'EXTENDS';

/* Propiedades simples y compuestas */
"height"                    return 'HEIGHT';
"width"                     return 'WIDTH';
"min-width"                 return 'MIN_WIDTH';
"max-width"                 return 'MAX_WIDTH';
"min-height"                return 'MIN_HEIGHT';
"max-height"                return 'MAX_HEIGHT';
"background color"          return 'BG_COLOR';
"color"                     return 'COLOR';

"text align"                return 'TEXT_ALIGN';
"text size"                 return 'TEXT_SIZE';
"text font"                 return 'TEXT_FONT';

"padding left"              return 'PADDING_LEFT';
"padding top"               return 'PADDING_TOP';
"padding right"             return 'PADDING_RIGHT';
"padding bottom"            return 'PADDING_BOTTOM';
"padding"                   return 'PADDING';

"margin left"               return 'MARGIN_LEFT';
"margin top"                return 'MARGIN_TOP';
"margin right"              return 'MARGIN_RIGHT';
"margin bottom"             return 'MARGIN_BOTTOM';
"margin"                    return 'MARGIN';

"border radius"             return 'BORDER_RADIUS';

/* Combinaciones de Bordes */
"border top style"          return 'BORDER_TOP_STYLE';
"border bottom style"       return 'BORDER_BOTTOM_STYLE';
"border left style"         return 'BORDER_LEFT_STYLE';
"border right style"        return 'BORDER_RIGHT_STYLE';
"border style"              return 'BORDER_STYLE';

"border top width"          return 'BORDER_TOP_WIDTH';
"border bottom width"       return 'BORDER_BOTTOM_WIDTH';
"border left width"         return 'BORDER_LEFT_WIDTH';
"border right width"        return 'BORDER_RIGHT_WIDTH';
"border width"              return 'BORDER_WIDTH';

"border top color"          return 'BORDER_TOP_COLOR';
"border bottom color"       return 'BORDER_BOTTOM_COLOR';
"border left color"         return 'BORDER_LEFT_COLOR';
"border right color"        return 'BORDER_RIGHT_COLOR';
"border color"              return 'BORDER_COLOR';

"border top"                return 'BORDER_TOP';
"border bottom"             return 'BORDER_BOTTOM';
"border left"               return 'BORDER_LEFT';
"border right"              return 'BORDER_RIGHT';
"border"                    return 'BORDER';

/* Valores predefinidos */
"solid"                     return 'SOLID';
"blue"|"white"|"red"|"green"|"violet"|"gray"|"black"|"lightgray"   return 'COLOR_NAME';
"CENTER"|"RIGHT"|"LEFT"     return 'DIRECTION';
"HELVETICA"|"SANS SERIF"|"SANS"|"MONO"|"CURSIVE"  return 'FONT_NAME';
"DOTTED"|"LINE"|"DOUBLE"    return 'BORDER_STYLE_VAL';

/* Función rgb */
"rgb"                       return 'RGB';

/* Operadores relacionales y lógicos (Requisito Global) */
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
"{"                         return '{';
"}"                         return '}';
":"                         return ':';
";"                         return ';';
"="                         return '=';
"("                         return '(';
")"                         return ')';
","                         return ',';

/* Variables y Literales */
"$"[a-zA-Z0-9_]+            return 'VARIABLE';
"#"[0-9a-fA-F]{3,8}         return 'HEX_COLOR';
[0-9]+("."[0-9]+)?          return 'NUMERO';

/* Identificador dinámico */
[a-zA-Z0-9_$-]+             return 'IDENTIFICADOR';

<<EOF>>                     return 'EOF';
.                           return 'INVALID';

/lex

/* Asociacion y Precedencia */

/* Nivel 0 (Menor precedencia) */
%left 'OP_MAYOR' 'OP_MAYORIGUAL' 'OP_MENOR' 'OP_MENORIGUAL' 'OP_IGUALDAD' 'OP_DISTINTO'

/* Nivel 1 */
%left '+' '-' 'OP_OR' 'OP_AND'

/* Nivel 2 */
%left '*' '/' 'OP_NOT'

/* Nivel 3 */
%left '%'

/* Nivel 4 (Mayor precedencia) */
%right UMINUS

%start inicio

%%

/* Reglas Sintacticas */

inicio
    : instrucciones EOF { return $1; }
    ;

instrucciones
    : instrucciones instruccion { $1.push($2); $$ = $1; }
    | instruccion { $$ = [$1]; }
    ;

instruccion
    : definicion_estilo { $$ = $1; }
    | bucle_for         { $$ = $1; }
    ;

definicion_estilo
    : IDENTIFICADOR herencia '{' propiedades '}'
      { $$ = { tipo: 'ESTILO', nombre: $1, padre: $2, props: $4 }; }
    ;

herencia
    : EXTENDS IDENTIFICADOR { $$ = $2; }
    | /* vacio */           { $$ = null; }
    ;

propiedades
    : propiedades propiedad { $1.push($2); $$ = $1; }
    | propiedad             { $$ = [$1]; }
    ;

propiedad
    : prop_id '=' valor ';' { $$ = { propiedad: $1, valor: $3 }; }
    ;

prop_id
    : HEIGHT | WIDTH | MIN_WIDTH | MAX_WIDTH | MIN_HEIGHT | MAX_HEIGHT
    | BG_COLOR | COLOR | TEXT_ALIGN | TEXT_SIZE | TEXT_FONT
    | PADDING | PADDING_LEFT | PADDING_TOP | PADDING_RIGHT | PADDING_BOTTOM
    | MARGIN | MARGIN_LEFT | MARGIN_TOP | MARGIN_RIGHT | MARGIN_BOTTOM
    | BORDER_RADIUS 
    | BORDER_STYLE | BORDER_TOP_STYLE | BORDER_BOTTOM_STYLE | BORDER_LEFT_STYLE | BORDER_RIGHT_STYLE
    | BORDER_WIDTH | BORDER_TOP_WIDTH | BORDER_BOTTOM_WIDTH | BORDER_LEFT_WIDTH | BORDER_RIGHT_WIDTH
    | BORDER_COLOR | BORDER_TOP_COLOR | BORDER_BOTTOM_COLOR | BORDER_LEFT_COLOR | BORDER_RIGHT_COLOR
    | BORDER | BORDER_TOP | BORDER_BOTTOM | BORDER_LEFT | BORDER_RIGHT
    ;

valor
    : expresion '%'         { $$ = { tipo: 'porcentaje', valor: $1 }; }
    | expresion             { $$ = { tipo: 'numero', valor: $1 }; }
    | COLOR_NAME            { $$ = { tipo: 'color', valor: $1 }; }
    | HEX_COLOR             { $$ = { tipo: 'hex', valor: $1 }; }
    | DIRECTION             { $$ = { tipo: 'direccion', valor: $1 }; }
    | FONT_NAME             { $$ = { tipo: 'fuente', valor: $1 }; }
    | BORDER_STYLE_VAL      { $$ = { tipo: 'estilo_borde', valor: $1 }; }
    | SOLID                 { $$ = { tipo: 'estilo_borde', valor: 'solid' }; }
    | rgb_func              { $$ = $1; }
    | border_abreviado      { $$ = $1; }
    ;

rgb_func
    : RGB '(' NUMERO ',' NUMERO ',' NUMERO ')'
      { $$ = { tipo: 'rgb', r: Number($3), g: Number($5), b: Number($7) }; }
    ;

border_abreviado
    : NUMERO BORDER_STYLE_VAL COLOR_NAME
      { $$ = { tipo: 'border_abrev', width: Number($1), style: $2, color: $3 }; }
    | NUMERO SOLID COLOR_NAME
      { $$ = { tipo: 'border_abrev', width: Number($1), style: 'solid', color: $3 }; }
    | NUMERO BORDER_STYLE_VAL HEX_COLOR
      { $$ = { tipo: 'border_abrev', width: Number($1), style: $2, color: $3 }; }
    ;

/* Expresiones Globales */
expresion
    /* Aritméticas */
    : expresion '+' expresion { $$ = { tipo: 'ARITMETICA', op: '+', left: $1, right: $3 }; }
    | expresion '-' expresion { $$ = { tipo: 'ARITMETICA', op: '-', left: $1, right: $3 }; }
    | expresion '*' expresion { $$ = { tipo: 'ARITMETICA', op: '*', left: $1, right: $3 }; }
    | expresion '/' expresion { $$ = { tipo: 'ARITMETICA', op: '/', left: $1, right: $3 }; }
    | expresion '%' expresion { $$ = { tipo: 'ARITMETICA', op: '%', left: $1, right: $3 }; }
    | '-' expresion %prec UMINUS { $$ = { tipo: 'ARITMETICA', op: 'UNARIO', val: $2 }; }
    
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
    
    /* Valores y Agrupación */
    | NUMERO                { $$ = { tipo: 'LITERAL', val: Number($1) }; }
    | VARIABLE              { $$ = { tipo: 'ACCESO_VAR', id: $1 }; }
    | '(' expresion ')'     { $$ = $2; }
    ;

bucle_for
    : FOR VARIABLE FROM expresion tipo_rango expresion '{' instrucciones '}'
      { $$ = { tipo: 'FOR', variable: $2, inicio: $4, fin: $6, rango: $5, cuerpo: $8 }; }
    ;

tipo_rango
    : THROUGH { $$ = 'INCLUSIVO'; }
    | TO      { $$ = 'EXCLUSIVO'; }
    ;