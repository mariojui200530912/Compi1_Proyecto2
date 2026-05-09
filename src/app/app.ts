import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { EditorComponent } from './components/editor/editor.component'; 

@Component({
  selector: 'yfera-root', // o el selector que tengas ahí
  standalone: true,
  imports: [CommonModule, RouterOutlet, EditorComponent], 
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App { 
  title = 'yfera-ide';
}