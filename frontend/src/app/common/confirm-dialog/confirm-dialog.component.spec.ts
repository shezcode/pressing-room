import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { ConfirmDialogComponent, ConfirmDialogConfig } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let component: ConfirmDialogComponent;
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<ConfirmDialogComponent>>;
  let translateServiceSpy: jasmine.SpyObj<TranslateService>;

  const dialogConfig: ConfirmDialogConfig = {
    title: 'Test Title',
    message: 'Test Message',
    yesActionText: 'Yes',
    noActionText: 'No'
  };

  beforeEach(async () => {
    const dialogRefSpyObj = jasmine.createSpyObj('MatDialogRef', ['close']);
    const translateServiceSpyObj = jasmine.createSpyObj('TranslateService', ['instant']);

    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: dialogConfig },
        { provide: MatDialogRef, useValue: dialogRefSpyObj },
        { provide: TranslateService, useValue: translateServiceSpyObj }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    dialogRefSpy = TestBed.inject(MatDialogRef) as jasmine.SpyObj<MatDialogRef<ConfirmDialogComponent>>;
    translateServiceSpy = TestBed.inject(TranslateService) as jasmine.SpyObj<TranslateService>;
  });

  it('should initialize with provided config', () => {
    translateServiceSpy.instant.and.callFake((key: string) => key);

    component.ngOnInit();

    expect(component.title).toBe(dialogConfig.title);
    expect(component.message).toBe(dialogConfig.message);
    expect(component.yesActionText).toBe(`${dialogConfig.yesActionText}`);
    expect(component.noActionText).toBe(`${dialogConfig.noActionText}`);
  });

  it('should use default translation keys if action texts are not provided', () => {
    const defaultConfig: ConfirmDialogConfig = {
      title: 'Test Title',
      message: 'Test Message'
    };
    const translatedYesText = 'Translated Yes';
    const translatedNoText = 'Translated No';
    translateServiceSpy.instant.and.callFake((key: string) => {
      if (key === 'confirmdialog.yes') return translatedYesText;
      if (key === 'confirmdialog.no') return translatedNoText;
      return key;
    });

    component.config = defaultConfig;
    component.ngOnInit();

    expect(component.yesActionText).toBe(translatedYesText);
    expect(component.noActionText).toBe(translatedNoText);
  });

  it('should close dialog with true on confirm', () => {
    component.onConfirm();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });

  it('should close dialog with false on dismiss', () => {
    component.onDismiss();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(false);
  });
});
