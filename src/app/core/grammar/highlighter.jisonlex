%lex
%options case-insensitive

%%
/* 1. Comentarios */
\s+                             { return 'ESPACIO'; }
"/*"[\s\S]*?"*/"                { return 'COMENTARIO'; }
"#".* { return 'COMENTARIO'; }

/* 2. Palabras Reservadas */
"int"|"float"|"string"|"boolean"|"char"   { return 'RESERVADA'; }
"if"|"else"|"for"|"each"|"switch"|"case"  { return 'RESERVADA'; }
"default"|"break"|"continue"|"import"     { return 'RESERVADA'; }
"component"|"main"|"function"|"load"      { return 'RESERVADA'; }
"execute"|"extends"|"from"|"through"|"to" { return 'RESERVADA'; }
"track"|"empty"|"return"                  { return 'RESERVADA'; }

/* 3. Palabras de UI y SQL */
"T"|"IMG"|"FORM"|"SUBMIT"|"TABLE"         { return 'RESERVADA'; }
"COLUMNS"|"DELETE"|"IN"|"INPUT_TEXT"      { return 'RESERVADA'; }
"INPUT_NUMBER"|"INPUT_BOOL"               { return 'RESERVADA'; }

/* 4. Operadores */
"=="|"!="|">="|"<="|"&&"|"||"|"++"|"--"|"+"|"-"|"*"|"/"|"%"|"="|">"|"<"|"!" { return 'OPERADOR'; }

/* 5. Literales de texto */
\"[^\"]*\"                      { return 'STRING'; }
"'"."'"                         { return 'STRING'; }
"`"[^`]+"`"                     { return 'STRING'; }

/* 6. Otros Literales */
[0-9]+"."[0-9]+                 { return 'LITERAL_NUM'; }
[0-9]+                          { return 'LITERAL_NUM'; }
"True"|"False"                  { return 'LITERAL_NUM'; }
"#"[0-9a-fA-F]{3,8}             { return 'LITERAL_NUM'; }

/* 7. Símbolos de agrupación */
"{"|"}"|"["|"]"|"("|")"         { return 'SIMBOLO'; }

/* 8. Variables */
"$"[a-zA-Z0-9_]+                { return 'VARIABLE'; }
"@"                             { return 'VARIABLE'; }

/* 9. Identificadores y otros */
[a-zA-Z_][a-zA-Z0-9_]* { return 'IDENTIFICADOR'; }
":"|";"|","|"."                 { return 'OTRO'; }
.                               { return 'ERROR'; }

<<EOF>>                         { return 'EOF'; }

/lex

/* --- SECCIÓN GRAMÁTICA DUMMY --- */
/* Esto obliga a Jison a compilar un objeto completo y válido */
%%
inicio
    : /* vacio */
    ;