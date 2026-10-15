import { Directive, ElementRef, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Saisie d'un montant au format français. `type="number"` ignore la virgule selon le navigateur
 * (« 12,5 » devient 125) : le champ reste un texte, accepte la virgule comme le point, limite la
 * saisie à deux décimales et transmet un nombre au formulaire (`null` si le champ est vide).
 */
@Directive({
  selector: 'input[appDecimal]',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DecimalInput), multi: true },
  ],
  host: {
    inputmode: 'decimal',
    autocomplete: 'off',
    '(input)': 'onInput()',
    '(blur)': 'onBlur()',
  },
})
export class DecimalInput implements ControlValueAccessor {
  private readonly input = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: number | null): void {
    this.input.value = format(value);
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.input.disabled = disabled;
  }

  protected onInput(): void {
    const raw = this.input.value;
    const clean = sanitize(raw);
    if (clean !== raw) {
      const caret = Math.max(0, (this.input.selectionStart ?? clean.length) - (raw.length - clean.length));
      this.input.value = clean;
      this.input.setSelectionRange(caret, caret);
    }
    this.onChange(parse(clean));
  }

  protected onBlur(): void {
    this.input.value = format(parse(this.input.value));
    this.onTouched();
  }
}

/** Ne garde que les chiffres et un séparateur décimal (virgule), suivi d'au plus deux chiffres. */
function sanitize(value: string): string {
  const [integer, ...rest] = value.replace(/\./g, ',').replace(/[^\d,]/g, '').split(',');
  return rest.length ? `${integer},${rest.join('').slice(0, 2)}` : integer;
}

function parse(value: string): number | null {
  if (!value) {
    return null;
  }
  const number = Number(value.replace(',', '.'));
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : null;
}

function format(value: number | null): string {
  return value === null || value === undefined ? '' : Number(value).toFixed(2).replace('.', ',');
}
