import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnChanges,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, of, switchMap } from 'rxjs';
import { DemoService } from '@data/demo/demo.service';
import { RecordFormat, ShopRecord } from '@data/records/record.model';
import { RecordsService } from '@data/records/records.service';

type SubmitState = 'idle' | 'submitting' | 'failed';

type FieldName = 'artist' | 'title' | 'format' | 'variant' | 'year' | 'genre' | 'price' | 'stock' | 'description';

interface FieldError {
  key: string;
  params?: Record<string, unknown>;
}

// Keep these limits in step with backend/lib/recordValidation.js and backend/lib/coverUpload.js
const MIN_YEAR = 1877;
const MAX_NAME_LENGTH = 200;
const MAX_SHORT_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 1000;
const COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_COVER_BYTES = 5 * 1024 * 1024;

// Whitespace alone does not count as filled in
function notBlank(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim() ? null : { required: true };
}

// The newest release year allowed is next year, for upcoming pressings
function maxYear(): number {
  return new Date().getFullYear() + 1;
}

function yearInRange(control: AbstractControl<string>): ValidationErrors | null {
  const year = Number(control.value);
  return !control.value || (year >= MIN_YEAR && year <= maxYear()) ? null : { yearRange: true };
}

@Component({
  selector: 'app-record-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslateModule],
  templateUrl: './record-form.component.html',
  styleUrl: './record-form.component.scss'
})
export class RecordFormComponent implements OnChanges {
  private readonly recordsService: RecordsService = inject(RecordsService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly demoService: DemoService = inject(DemoService);

  // The Record to edit, or null to create a new one
  readonly record = input<ShopRecord | null>(null);
  // The Record as stored, after it was created or updated
  readonly saved = output<ShopRecord>();
  readonly cancelled = output<void>();

  protected readonly formats: RecordFormat[] = ['Vinyl', 'CD', 'Cassette'];
  protected readonly yearBounds = { min: MIN_YEAR, max: maxYear() };

  protected readonly form = new FormGroup({
    artist: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(MAX_NAME_LENGTH)]
    }),
    title: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(MAX_NAME_LENGTH)]
    }),
    format: new FormControl<RecordFormat>('Vinyl', { nonNullable: true, validators: [Validators.required] }),
    variant: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(MAX_SHORT_LENGTH)] }),
    year: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{4}$/), yearInRange]
    }),
    genre: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(MAX_SHORT_LENGTH)] }),
    // Dollars with up to two decimals; stored as cents
    price: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]
    }),
    stock: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d+$/)]
    }),
    featured: new FormControl(false, { nonNullable: true }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(MAX_DESCRIPTION_LENGTH)]
    })
  });
  protected readonly state = signal<SubmitState>('idle');

  // The Demo refuses uploads, so the form offers the shop's existing covers instead of the file input
  protected readonly demo = this.demoService.enabled;
  protected readonly existingCovers = toSignal(
    toObservable(this.demo).pipe(switchMap((on) => (on ? this.demoService.covers().pipe(catchError(() => of([]))) : of([])))),
    { initialValue: [] as string[] }
  );
  // The existing cover picked on the Demo; when editing it starts as the Record's own cover
  protected readonly pickedCover = signal<string | null>(null);

  // The cover is a file, so it lives outside the form group
  private readonly coverInput = viewChild<ElementRef<HTMLInputElement>>('coverInput');
  private readonly coverFile = signal<File | null>(null);
  private readonly coverChecked = signal(false);
  private readonly coverRejection = signal<string | null>(null);
  protected readonly coverError = computed<FieldError | null>(() => {
    if (this.coverRejection()) {
      return { key: 'admin.form.errors.rejected', params: { message: this.coverRejection() } };
    }
    if (!this.coverChecked()) {
      return null;
    }
    const file = this.coverFile();
    if (!file) {
      // When editing, no file means keeping the current cover
      return this.record() || this.pickedCover() ? null : { key: 'admin.form.errors.coverRequired' };
    }
    if (!COVER_TYPES.includes(file.type)) {
      return { key: 'admin.form.errors.coverType' };
    }
    return file.size > MAX_COVER_BYTES ? { key: 'admin.form.errors.coverSize' } : null;
  });

  // Runs whenever the parent passes a different Record to edit, or null when editing ends
  ngOnChanges(): void {
    this.reset();
    const record = this.record();
    if (record) {
      this.fill(record);
      // Keyboard and screen-reader users land on the form they just opened
      this.host.nativeElement.querySelector('input')?.focus();
    }
  }

  // The message to show under a field once it has been touched, or null when it is fine
  protected errorFor(name: FieldName): FieldError | null {
    const control = this.form.controls[name];
    const errors = control.errors;
    if (!control.touched || !errors) {
      return null;
    }
    if (errors['server']) {
      return { key: 'admin.form.errors.rejected', params: { message: errors['server'] } };
    }
    if (errors['required']) {
      return { key: 'admin.form.errors.required' };
    }
    if (errors['maxlength']) {
      return { key: 'admin.form.errors.tooLong', params: { max: errors['maxlength'].requiredLength } };
    }
    switch (name) {
      case 'year':
        return { key: 'admin.form.errors.year', params: this.yearBounds };
      case 'price':
        return { key: 'admin.form.errors.price' };
      case 'stock':
        return { key: 'admin.form.errors.stock' };
      default:
        return null;
    }
  }

  protected onCoverChange(event: Event): void {
    this.coverFile.set((event.target as HTMLInputElement).files?.[0] ?? null);
    this.coverChecked.set(true);
    this.coverRejection.set(null);
    this.clearResult();
  }

  protected pickCover(coverUrl: string): void {
    this.pickedCover.set(coverUrl);
    this.coverChecked.set(true);
    this.coverRejection.set(null);
    this.clearResult();
  }

  protected coverSrc(coverUrl: string): string {
    return this.recordsService.coverSrc(coverUrl);
  }

  // Editing after a failure hides the stale message
  protected clearResult(): void {
    if (this.state() !== 'submitting') {
      this.state.set('idle');
    }
  }

  protected submit(): void {
    if (this.state() === 'submitting') {
      return;
    }

    // Shows every field message on an untouched or invalid form instead of posting
    this.coverChecked.set(true);
    const cover = this.coverFile();
    const editing = this.record();
    if (this.form.invalid || this.coverError()) {
      this.form.markAllAsTouched();
      return;
    }

    this.state.set('submitting');

    const body = this.toFormData(cover);
    const request = editing ? this.recordsService.update(editing.id, body) : this.recordsService.create(body);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (record) => {
        this.reset();
        this.saved.emit(record);
      },
      error: (error: unknown) => this.showFailure(error)
    });
  }

  // Load a Record's values into the form; the price is shown in dollars
  private fill(record: ShopRecord): void {
    this.form.setValue({
      artist: record.artist,
      title: record.title,
      format: record.format,
      variant: record.variant ?? '',
      year: String(record.year),
      genre: record.genre,
      price: (record.price / 100).toFixed(2),
      stock: String(record.stock),
      featured: record.featured,
      description: record.description
    });
    this.pickedCover.set(record.coverUrl);
  }

  private toFormData(cover: File | null): FormData {
    const value = this.form.getRawValue();
    const body = new FormData();
    body.set('artist', value.artist.trim());
    body.set('title', value.title.trim());
    body.set('format', value.format);
    body.set('variant', value.variant.trim());
    body.set('year', value.year);
    body.set('genre', value.genre.trim());
    body.set('price', String(Math.round(Number(value.price) * 100)));
    body.set('stock', value.stock);
    body.set('featured', String(value.featured));
    body.set('description', value.description.trim());
    if (cover) {
      body.set('cover', cover);
    }
    // Only a different pick is sent, so an edit that keeps the cover leaves it alone
    const picked = this.pickedCover();
    if (picked && picked !== this.record()?.coverUrl) {
      body.set('coverUrl', picked);
    }
    return body;
  }

  // The backend answers 400 with a message per invalid field; show each next to its field
  private showFailure(error: unknown): void {
    this.state.set('failed');

    const fieldErrors: Record<string, string> | undefined =
      error instanceof HttpErrorResponse && error.status === 400 ? error.error?.errors : undefined;
    if (!fieldErrors) {
      return;
    }

    for (const [field, message] of Object.entries(fieldErrors)) {
      if (field === 'cover') {
        this.coverRejection.set(message);
      } else {
        // Editing the field runs its validators again, which clears this error
        const control = this.form.get(field);
        control?.setErrors({ server: message });
        control?.markAsTouched();
      }
    }
  }

  private reset(): void {
    this.form.reset();
    this.coverFile.set(null);
    this.pickedCover.set(null);
    this.coverChecked.set(false);
    this.coverRejection.set(null);
    const input = this.coverInput()?.nativeElement;
    if (input) {
      input.value = '';
    }
    this.state.set('idle');
  }
}
