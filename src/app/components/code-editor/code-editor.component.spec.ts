import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodeEditorComponent } from './code-editor.component';

describe('CodeEditorComponent', () => {
  let component: CodeEditorComponent;
  let fixture: ComponentFixture<CodeEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CodeEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CodeEditorComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
