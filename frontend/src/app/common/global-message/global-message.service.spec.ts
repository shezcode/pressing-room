import { TestBed } from '@angular/core/testing';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import {
  GlobalMessageService,
  GlobalMessageConfig,
  GLOBAL_MESSAGE_ERROR_CLASS,
  GLOBAL_MESSAGE_SUCCESS_CLASS,
  GLOBAL_MESSAGE_WARNING_CLASS
} from './global-message.service';

describe('GlobalMessageService', () => {
  let service: GlobalMessageService;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let translateServiceSpy: jasmine.SpyObj<TranslateService>;

  beforeEach(() => {
    const snackBarSpyObj = jasmine.createSpyObj('MatSnackBar', ['open']);
    const translateServiceSpyObj = jasmine.createSpyObj('TranslateService', ['instant']);

    TestBed.configureTestingModule({
      imports: [MatSnackBarModule],
      providers: [
        GlobalMessageService,
        { provide: MatSnackBar, useValue: snackBarSpyObj },
        { provide: TranslateService, useValue: translateServiceSpyObj }
      ]
    });

    service = TestBed.inject(GlobalMessageService);
    snackBarSpy = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
    translateServiceSpy = TestBed.inject(TranslateService) as jasmine.SpyObj<TranslateService>;
  });

  it('should show an error message with error class', () => {
    const config: GlobalMessageConfig = { message: 'Error occurred', actionText: 'Close' };
    service.showError(config);
    expect(snackBarSpy.open).toHaveBeenCalledWith('Error occurred', 'Close', {
      duration: 5000,
      panelClass: GLOBAL_MESSAGE_ERROR_CLASS,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  });

  it('should show a success message with success class', () => {
    const config: GlobalMessageConfig = { message: 'Operation successful', actionText: 'Close' };
    service.showSuccess(config);
    expect(snackBarSpy.open).toHaveBeenCalledWith('Operation successful', 'Close', {
      duration: 5000,
      panelClass: GLOBAL_MESSAGE_SUCCESS_CLASS,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  });

  it('should show a warning message with warning class', () => {
    const config: GlobalMessageConfig = { message: 'Warning issued', actionText: 'Close' };
    service.showWarning(config);
    expect(snackBarSpy.open).toHaveBeenCalledWith('Warning issued', 'Close', {
      duration: 5000,
      panelClass: GLOBAL_MESSAGE_WARNING_CLASS,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  });

  it('should show an error message with default error message if message is not provided', () => {
    const config: GlobalMessageConfig = { message: '', actionText: 'Close' };
    translateServiceSpy.instant.and.returnValue('Unknown error occurred');
    service.showError(config);
    expect(translateServiceSpy.instant).toHaveBeenCalledWith('errors.unknown');
    expect(snackBarSpy.open).toHaveBeenCalledWith('Unknown error occurred', 'Close', {
      duration: 5000,
      panelClass: GLOBAL_MESSAGE_ERROR_CLASS,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  });

  it('should not show a message if message is not provided and class is not error', () => {
    const config: GlobalMessageConfig = { message: '', actionText: 'Close' };
    service.showSuccess(config);
    expect(snackBarSpy.open).not.toHaveBeenCalled();
  });
});
