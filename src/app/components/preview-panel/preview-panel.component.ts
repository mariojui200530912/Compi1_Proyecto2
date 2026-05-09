import { Component, Input, OnChanges, SimpleChanges, inject, ViewEncapsulation } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-preview-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './preview-panel.component.html',
  styleUrls: ['./preview-panel.component.css'],
  encapsulation: ViewEncapsulation.None 
})
export class PreviewPanelComponent implements OnChanges {
  @Input() html: string = '';
  public safeHtml: SafeHtml = '';
  private sanitizer = inject(DomSanitizer);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['html']) {
      // Limpiamos el HTML para que Angular permita inyectar tags de estilo y scripts
      this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(this.html);
    }
  }
}