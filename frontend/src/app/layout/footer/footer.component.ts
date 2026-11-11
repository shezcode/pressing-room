import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

interface FooterLink {
  readonly label: string;
  // A link without a routerLink is an inert placeholder
  readonly routerLink?: string;
  readonly fragment?: string;
}

interface FooterColumn {
  heading: string;
  links: FooterLink[];
}

@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslateModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  protected readonly year = new Date().getFullYear();

  // Only the main menu's Home, About and Shop work: the other links are inert placeholders
  protected readonly columns: FooterColumn[] = [
    {
      heading: 'footer.mainMenu',
      links: [
        { label: 'nav.home', routerLink: '/' },
        { label: 'nav.about', routerLink: '/', fragment: 'about' },
        { label: 'nav.shop', routerLink: '/', fragment: 'racks' }
      ]
    },
    {
      heading: 'footer.company',
      links: [{ label: 'footer.theCompany' }, { label: 'footer.careers' }, { label: 'footer.press' }]
    },
    {
      heading: 'footer.discover',
      links: [{ label: 'footer.gradingGuide' }, { label: 'footer.ourHistory' }, { label: 'footer.tradeIns' }]
    },
    {
      heading: 'footer.findUsOn',
      links: [{ label: 'footer.instagram' }, { label: 'footer.discogs' }, { label: 'footer.bandcamp' }]
    }
  ];
}
