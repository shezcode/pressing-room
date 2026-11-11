import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AboutComponent } from './about/about.component';
import { FeaturedComponent } from './featured/featured.component';
import { FridayListComponent } from './friday-list/friday-list.component';
import { HeroComponent } from './hero/hero.component';
import { RacksComponent } from './racks/racks.component';

// The ids are the targets of the hero, header and footer links (routerLink + fragment, see withInMemoryScrolling in app.config).
// They sit outside each @defer so a link can scroll to a section before it has loaded; the placeholder heights are the
// sections' measured heights, so nothing below jumps when one loads.
@Component({
  selector: 'app-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HeroComponent, FeaturedComponent, FridayListComponent, RacksComponent, AboutComponent],
  template: `
    <app-hero />
    <div id="featured">
      @defer (on viewport) {
      <app-featured />
      } @placeholder {
      <div class="placeholder placeholder--featured"></div>
      }
    </div>
    @defer (on viewport) {
    <app-friday-list />
    } @placeholder {
    <div class="placeholder placeholder--friday-list"></div>
    }
    <div id="racks">
      @defer (on viewport) {
      <app-racks />
      } @placeholder {
      <div class="placeholder placeholder--racks"></div>
      }
    </div>
    <div id="about">
      @defer (on viewport) {
      <app-about />
      } @placeholder {
      <div class="placeholder placeholder--about"></div>
      }
    </div>
  `,
  styles: `
    .placeholder {
      border-bottom: 2px solid var(--color-divider);
    }
    .placeholder--featured,
    .placeholder--racks {
      background-color: var(--color-surface-alt);
    }
    /* shortcut: heights measured at 1280px and 390px with 9 Records, re-measure if a section's layout changes */
    .placeholder--featured {
      min-height: 339px;
    }
    .placeholder--friday-list {
      min-height: 194px;
    }
    .placeholder--racks {
      min-height: 1519px;
    }
    .placeholder--about {
      min-height: 363px;
    }
    @media (max-width: 768px) {
      .placeholder--featured {
        min-height: 625px;
      }
      .placeholder--friday-list {
        min-height: 289px;
      }
      .placeholder--racks {
        min-height: 4668px;
      }
      .placeholder--about {
        min-height: 596px;
      }
    }
  `
})
export class LandingComponent {}
