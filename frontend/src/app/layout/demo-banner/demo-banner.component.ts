import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DemoService } from '@data/demo/demo.service';

@Component({
  selector: 'app-demo-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  template: `
    @if (demo.enabled()) {
    <p class="demo-banner" role="note">{{ 'demo.banner' | translate }}</p>
    }
  `,
  // In the page flow above the sticky header, so it scrolls away instead of covering content
  styles: `
    .demo-banner {
      margin: 0;
      padding: 0.35rem 1rem;
      font-size: 0.8rem;
      line-height: 1.4;
      text-align: center;
      background: var(--color-accent);
      color: var(--color-on-accent);
    }
  `
})
export class DemoBannerComponent {
  protected readonly demo: DemoService = inject(DemoService);
}
