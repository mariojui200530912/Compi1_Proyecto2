import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SymbolTableComponent } from './symbol-table.component';

describe('SymbolTableComponent', () => {
  let component: SymbolTableComponent;
  let fixture: ComponentFixture<SymbolTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SymbolTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SymbolTableComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
