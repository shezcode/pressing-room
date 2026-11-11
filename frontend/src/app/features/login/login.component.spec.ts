import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { DemoService } from '@data/demo/demo.service';
import { Shop, api, button, setUpShop } from '../shopping.testing';

describe('LoginComponent demo sign-in', () => {
  let shop: Shop;

  // Startup reads the demo status once; the test answers it, then opens the login page
  const openLogin = async (demo: boolean, url = '/login') => {
    TestBed.inject(DemoService).load();
    shop.http.expectOne(api('/api/demo')).flush({ enabled: demo });
    await shop.harness.navigateByUrl(url);
    await shop.settle();
  };

  const demoButtons = () => shop.page().querySelectorAll('.login__demo button');

  const tryAs = async (label: string, role: 'customer' | 'admin') => {
    button(shop, label).click();
    const request = shop.http.expectOne(api('/api/demo/signin'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ role });
    request.flush({
      message: 'ok',
      token: 'token',
      user: { id: 'u1', name: 'Demo', email: 'demo@example.com', role }
    });
    await shop.settle();
  };

  beforeEach(async () => {
    shop = await setUpShop();
  });

  it('shows no demo buttons when demo mode is off', async () => {
    await openLogin(false);
    expect(demoButtons().length).toBe(0);
    expect(shop.text()).toContain('login.signIn.submit');
  });

  it('shows both demo buttons next to the normal forms when demo mode is on', async () => {
    await openLogin(true);
    expect(demoButtons().length).toBe(2);
    expect(shop.text()).toContain('login.signIn.submit');
    expect(shop.text()).toContain('login.signUp.title');
  });

  it('takes the Demo Customer to their Collection', async () => {
    await openLogin(true);
    await tryAs('login.demo.customer', 'customer');
    expect(TestBed.inject(Router).url).toBe('/collection');
  });

  it('takes the Admin to Records management', async () => {
    await openLogin(true);
    await tryAs('login.demo.admin', 'admin');
    expect(TestBed.inject(Router).url).toBe('/admin/records');
  });

  it('returns the Demo Customer to the page that sent them to login', async () => {
    await openLogin(true, '/login?returnUrl=%2Fcheckout');
    await tryAs('login.demo.customer', 'customer');
    expect(TestBed.inject(Router).url).toBe('/checkout');
  });
});
