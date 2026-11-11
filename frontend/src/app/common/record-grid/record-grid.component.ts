import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ShopRecord, formatLabel } from '@data/records/record.model';
import { RecordsService } from '@data/records/records.service';

// The Record card grid shared by the landing racks and the Catalog
@Component({
  selector: 'app-record-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, RouterLink, TranslateModule],
  templateUrl: './record-grid.component.html',
  styleUrl: './record-grid.component.scss'
})
export class RecordGridComponent {
  private readonly recordsService: RecordsService = inject(RecordsService);

  readonly records = input.required<ShopRecord[]>();

  protected readonly formatLabel = formatLabel;

  protected coverSrc(record: ShopRecord): string {
    return this.recordsService.coverSrc(record.coverUrl);
  }
}
