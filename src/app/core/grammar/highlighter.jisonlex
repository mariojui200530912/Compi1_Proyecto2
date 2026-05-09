%options case-insensitive

%%
/* 1. Comentarios */
\s+                             { return 'ESPACIO'; }
"/*"[\s\S]*?"*/"                { return 'COMENTARIO'; }
"#".*                           { return 'COMENTARIO'; }

/* 2. Palabras Reservadas (Color: Morado) */
"int"|"float"|"string"|"boolean"|"char"   { return 'RESERVADA'; }
"if"|"else"|"for"|"each"|"switch"|"case"  { return 'RESERVADA'; }
"default"|"break"|"continue"|"import"     { return 'RESERVADA'; }
"component"|"main"|"function"|"load"      { return 'RESERVADA'; }
"execute"|"extends"|"from"|"through"|"to" { return 'RESERVADA'; }
"track"|"empty"|"return"                  { return 'RESERVADA'; }

/* 3. Palabras de UI y SQL (También reservadas - Morado) */
"T"|"IMG"|"FORM"|"SUBMIT"|"TABLE"         { return 'RESERVADA'; }
"COLUMNS"|"DELETE"|"IN"|"INPUT_TEXT"      { return 'RESERVADA'; }
"INPUT_NUMBER"|"INPUT_BOOL"               { return 'RESERVADA'; }

/* 4. Operadores (Color: Verde) */
/* IMPORTANTE: Los dobles primero para que el lexer no se confunda */
"=="|"!="|">="|"<="|"&&"|"||"|"++"|"--"|"+"|"-"|"*"|"/"|"%"|"="|">"|"<"|"!" { return 'OPERADOR'; }

/* 5. Literales de texto (Color: Naranja) */
\"[^\"]*\"                      { return 'STRING'; }
"'"."'"                         { return 'STRING'; }
"`"[^`]+"`"                     { return 'STRING'; }

/* 6. Otros Literales (Color: Celeste) */
[0-9]+"."[0-9]+                 { return 'LITERAL_NUM'; }
[0-9]+                          { return 'LITERAL_NUM'; }
"True"|"False"                  { return 'LITERAL_NUM'; }
"#"[0-9a-fA-F]{3,8}             { return 'LITERAL_NUM'; }

/* 7. Símbolos de agrupación (Color: Azul) */
"{"|"}"|"["|"]"|"("|")"         { return 'SIMBOLO'; }

/* 8. Variables (Color: Blanco) */
"$"[a-zA-Z0-9_]+                { return 'VARIABLE'; }
"@"                             { return 'VARIABLE'; }

/* 9. Identificadores y otros (Color: Blanco) */
[a-zA-Z_][a-zA-Z0-9_]*          { return 'IDENTIFICADOR'; }
":"|";"|","|"."                 { return 'OTRO'; }
.                               { return 'ERROR'; }

<<EOF>>                         { return 'EOF'; }