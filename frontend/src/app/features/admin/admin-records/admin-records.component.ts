import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription, filter } from 'rxjs';
import { ConfirmDialogService } from '@app/common/confirm-dialog/confirm-dialog.service';
import { GlobalMessageService } from '@app/common/global-message/global-message.service';
import { ShopRecord } from '@data/records/record.model';
import { RecordsService } from '@data/records/records.service';
import { RecordFormComponent } from '../record-form/record-form.component';

type ListStatus = 'loading' | 'loaded' | 'error';

// What the Admin last did, shown above the form
interface Notice {
  key: string;
  record: ShopRecord;
}

const PAGE_SIZE = 20;

@Component({
  selector: 'app-admin-records',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, RecordFormComponent, RouterLink, TranslateModule],
  templateUrl: './admin-records.component.html',
  styleUrl: './admin-records.component.scss'
})
export class AdminRecordsComponent implements OnInit {
  private readonly recordsService: RecordsService = inject(RecordsService);
  private readonly confirmDialog: ConfirmDialogService = inject(ConfirmDialogService);
  private readonly globalMessage: GlobalMessageService = inject(GlobalMessageService);
  private readonly translate: TranslateService = inject(TranslateService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  protected readonly status = signal<ListStatus>('loading');
  protected readonly records = signal<ShopRecord[]>([]);
  protected readonly total = signal(0);
  protected readonly loadingMore = signal(false);
  protected readonly loadMoreFailed = signal(false);
  // The Record loaded into the form, or null while the form creates a new one
  protected readonly editing = signal<ShopRecord | null>(null);
  protected readonly notice = signal<Notice | null>(null);

  private page = 0;
  private request?: Subscription;

  ngOnInit(): void {
    this.loadFirstPage();
  }

  protected coverSrc(record: ShopRecord): string {
    return this.recordsService.coverSrc(record.coverUrl);
  }

  protected loadFirstPage(): void {
    this.request?.unsubscribe();
    this.status.set('loading');
    this.page = 0;

    this.request = this.recordsService
      .list({ page: 1, limit: PAGE_SIZE })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.page = 1;
          this.records.set(page.records);
          this.total.set(page.total);
          this.status.set('loaded');
        },
        error: () => this.status.set('error')
      });
  }

  protected loadMore(): void {
    if (this.loadingMore()) {
      return;
    }
    this.loadingMore.set(true);
    this.loadMoreFailed.set(false);

    this.request = this.recordsService
      .list({ page: this.page + 1, limit: PAGE_SIZE })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.page += 1;
          this.records.update((records) => [...records, ...page.records]);
          this.total.set(page.total);
          this.loadingMore.set(false);
        },
        error: () => {
          this.loadMoreFailed.set(true);
          this.loadingMore.set(false);
        }
      });
  }

  protected edit(record: ShopRecord): void {
    this.notice.set(null);
    // A copy, so choosing the same row again still reloads its stored values into the form
    this.editing.set({ ...record });
  }

  protected stopEditing(): void {
    this.editing.set(null);
  }

  protected onSaved(record: ShopRecord): void {
    // Judged by the saved Record, not by the form's current state, which may have moved on while the request ran
    if (this.records().some((r) => r.id === record.id)) {
      // An edit does not change the order, so the row is replaced where it stands
      this.records.update((records) => records.map((r) => (r.id === record.id ? record : r)));
      if (this.editing()?.id === record.id) {
        this.editing.set(null);
      }
      this.notice.set({ key: 'admin.form.updated', record });
    } else {
      // The new Record is newest, so reloading from the first page shows it at the top
      this.notice.set({ key: 'admin.form.created', record });
      this.loadFirstPage();
    }
  }

  protected confirmDelete(record: ShopRecord): void {
    this.confirmDialog
      .open({
        title: this.translate.instant('admin.delete.title'),
        message: this.translate.instant('admin.delete.message', { title: record.title, artist: record.artist }),
        yesActionText: 'admin.delete.confirm',
        noActionText: 'admin.delete.keep',
        maxWidth: 480
      })
      .pipe(
        filter((confirmed) => confirmed === true),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.delete(record));
  }

  private delete(record: ShopRecord): void {
    this.recordsService
      .delete(record.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          if (this.editing()?.id === record.id) {
            this.editing.set(null);
          }
          this.notice.set({ key: 'admin.delete.deleted', record });
          // Later rows move up a place, so the pages already loaded would no longer line up
          this.loadFirstPage();
        },
        error: () =>
          this.globalMessage.showError({
            message: this.translate.instant('admin.delete.error', { title: record.title }),
            actionText: this.translate.instant('common.close')
          })
      });
  }
}
