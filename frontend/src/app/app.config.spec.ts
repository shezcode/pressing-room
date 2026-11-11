import { createApplication } from '@angular/platform-browser';
import { appConfig } from './app.config';

describe('appConfig', () => {
  it('boots without zone.js', async () => {
    const app = await createApplication(appConfig);
    expect(app.components).toEqual([]);
    app.destroy();
  });
});
