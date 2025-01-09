import { Component, Input, OnDestroy, OnInit, SimpleChanges, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR, FormControl, ControlValueAccessor } from '@angular/forms';
import { AutocompleteType, GOlrResponse, GoCategory, NoctuaFormUtils, NoctuaLookupService } from '@geneontology/noctua-form-base';
import { Subject, Subscription, catchError, debounceTime, filter, of, startWith, switchMap, takeUntil } from 'rxjs';
import { InlineReferenceService } from '@noctua.editor/inline-reference/inline-reference.service';

@Component({
  selector: 'noc-term-autocomplete',
  templateUrl: './term-autocomplete.component.html',
  styleUrls: ['./term-autocomplete.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TermAutocompleteComponent),
      multi: true
    }
  ]
})
export class TermAutocompleteComponent implements OnInit, OnDestroy, ControlValueAccessor {

  AutocompleteType = AutocompleteType;
  @Input() formControlName: string;
  @Input() label: string;
  @Input() category: GoCategory[] = [];
  @Input() autocompleteType: AutocompleteType = AutocompleteType.TERM;
  @Input() appearance: 'legacy' | 'standard' | 'fill' | 'outline' = 'fill';

  control = new FormControl();
  options: string[] = [];
  filteredOptions: GOlrResponse[] | string[] = [];
  private valueChangesSubscription: Subscription;
  private _unsubscribeAll: Subject<any>;

  private onChange: (value: any) => void;
  private onTouched: () => void;

  constructor(private lookupService: NoctuaLookupService,
    private inlineReferenceService: InlineReferenceService,
  ) {
    this._unsubscribeAll = new Subject();
  }

  ngOnInit(): void {
    this.subscribeToValueChanges();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.filteredOptions = [];
    if (changes['category'] && !changes['category'].firstChange) {
      const previousCategory = changes['category'].previousValue;
      const currentCategory = changes['category'].currentValue;

      if (!NoctuaFormUtils.areArraysEqualByKey(previousCategory, currentCategory, 'id')) {
        this.subscribeToValueChanges();
      }
    }
  }

  subscribeToValueChanges(): void {
    if (this.valueChangesSubscription) {
      this.valueChangesSubscription.unsubscribe();
      this.filteredOptions = [];
    }

    if (this.category && this.category.length > 0) {
      this.valueChangesSubscription = this.control.valueChanges.pipe(
        takeUntil(this._unsubscribeAll),
        debounceTime(300),
        startWith(''),
        filter(value => value && value.length > 2),
        switchMap(value => this.lookupService.search(value, this.category).pipe(
          catchError(err => {
            console.error('Error in search:', err);
            return of([]);
          })
        ))
      ).subscribe(data => {
        this.filteredOptions = data;
        // console.log('Filtered options:', data);
      });
    }
  }

  writeValue(value: any): void {
    this.control.setValue(value);

    if (!value) {
      this.filteredOptions = [];
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
    this.control.valueChanges.subscribe(fn);
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    isDisabled ? this.control.disable() : this.control.enable();
  }

  selectTerm(term: any) {
    this.filteredOptions = [];
  }

  onFocus(): void {
    if (!this.control.value) {
      this.filteredOptions = this.lookupService.preLookup(this.autocompleteType, this.category);
    }
  }


  openAddReference(event) {
    event.stopPropagation();
    const data = {
      formControl: this.control as FormControl,
    };
    this.inlineReferenceService.open(event.target, { data });
  }

  termDisplayFn(term): string | undefined {
    if (typeof term === 'string') {
      return term;
    } else if (term && term.id && term.label) {
      return term.label;
    }
    return undefined;
  }

  compareFn(o1: any, o2: any): boolean {
    return o1 && o2 ? o1.id === o2.id : o1 === o2;
  }

  ngOnDestroy(): void {
    if (this.valueChangesSubscription) {
      this.valueChangesSubscription.unsubscribe();
    }
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }
}
