import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { AppComponent } from './app.component';
import { LocaleService } from '@core/locale/locale.service';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let localeServiceSpy: jasmine.SpyObj<LocaleService>;

  beforeEach(async () => {
    const localeServiceSpyObj = jasmine.createSpyObj('LocaleService', ['setupAppLanguage']);

    await TestBed.configureTestingModule({
      imports: [AppComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LocaleService, useValue: localeServiceSpyObj }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    localeServiceSpy = TestBed.inject(LocaleService) as jasmine.SpyObj<LocaleService>;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should call setupAppLanguage on LocaleService when initialized', () => {
    expect(localeServiceSpy.setupAppLanguage).toHaveBeenCalled();
  });
});
