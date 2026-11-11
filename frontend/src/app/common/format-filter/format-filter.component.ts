import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RecordFormat } from '@data/records/record.model';

// A null format means "All"
const FORMAT_FILTERS: { format: RecordFormat | null; labelKey: string }[] = [
  { format: null, labelKey: 'racks.filters.all' },
  { format: 'Vinyl', labelKey: 'racks.filters.vinyl' },
  { format: 'CD', labelKey: 'racks.filters.cd' },
  { format: 'Cassette', labelKey: 'racks.filters.cassette' }
];

// The All/Vinyl/CD/Cassette buttons shared by the landing racks and the Catalog
@Component({
  selector: 'app-format-filter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  templateUrl: './format-filter.component.html',
  styleUrl: './format-filter.component.scss'
})
export class FormatFilterComponent {
  readonly active = input.required<RecordFormat | null>();
  readonly changed = output<RecordFormat | null>();

  protected readonly formatFilters = FORMAT_FILTERS;

  // Pressing the active filter again changes nothing
  protected select(format: RecordFormat | null): void {
    if (format !== this.active()) {
      this.changed.emit(format);
    }
  }
}
