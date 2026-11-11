import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { SignUpFormComponent } from './sign-up-form.component';
import { AuthenticationService } from '@core/security/authentication.service';
import { LocationsService } from '@data/locations/locations.service';

describe('SignUpFormComponent', () => {
  let fixture: ComponentFixture<SignUpFormComponent>;
  let authenticationServiceSpy: jasmine.SpyObj<AuthenticationService>;

  const select = (id: string): HTMLSelectElement => fixture.nativeElement.querySelector(`#sign-up-${id}`);

  const choose = (id: string, value: string): void => {
    const element = select(id);
    element.value = value;
    element.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };

  const type = (id: string, value: string): void => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(`#sign-up-${id}`);
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  beforeEach(async () => {
    const locationsServiceSpyObj = jasmine.createSpyObj('LocationsService', ['countries', 'communities', 'provinces']);
    locationsServiceSpyObj.countries.and.returnValue(
      of([
        { id: '1', name: 'España', isoCode: 'ES' },
        { id: '2', name: 'Francia', isoCode: 'FR' }
      ])
    );
    locationsServiceSpyObj.communities.and.returnValue(of([{ id: '13', name: 'Madrid' }]));
    locationsServiceSpyObj.provinces.and.returnValue(of([{ id: '28', name: 'Madrid', communityId: '13' }]));
    authenticationServiceSpy = jasmine.createSpyObj('AuthenticationService', ['signUp']);

    await TestBed.configureTestingModule({
      imports: [SignUpFormComponent, TranslateModule.forRoot()],
      providers: [
        { provide: LocationsService, useValue: locationsServiceSpyObj },
        { provide: AuthenticationService, useValue: authenticationServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SignUpFormComponent);
    fixture.detectChanges();
  });

  it('enables the community and province selects once Spain is chosen', () => {
    expect(select('community').disabled).toBeTrue();
    expect(select('province').disabled).toBeTrue();

    choose('country', '1');

    expect(select('community').disabled).toBeFalse();
    expect(select('province').disabled).toBeFalse();
  });

  it('disables and clears the community and province when another country is chosen', () => {
    choose('country', '1');
    choose('community', '13');
    choose('province', '28');

    choose('country', '2');

    expect(select('community').disabled).toBeTrue();
    expect(select('province').disabled).toBeTrue();
    expect(select('community').value).toBe('');
    expect(select('province').value).toBe('');
  });

  it('signs up a Customer outside Spain without a community or province', () => {
    authenticationServiceSpy.signUp.and.returnValue(of());
    type('name', 'Marie');
    type('email', 'marie@example.com');
    type('password', 'secret');
    choose('country', '2');

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    expect(authenticationServiceSpy.signUp).toHaveBeenCalledWith({
      name: 'Marie',
      email: 'marie@example.com',
      password: 'secret',
      countryId: '2',
      communityId: '',
      provinceId: ''
    });
  });
});
