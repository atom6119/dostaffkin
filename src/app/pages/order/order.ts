import { Component, signal, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Header } from '../../header/header';
import { DELIVERY_SIZES, DELIVERY_SPEEDS } from './order.config';

declare const ymaps: any;

@Component({
  selector: 'app-order',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Header],
  template: `
    <div id="map"></div>

    <app-header></app-header>

    <aside class="main" id="sidebar">
      <div class="main-header">
        <div class="main-title">Оформление доставки</div>
        <div class="main-text">Выберите параметры для расчета отправления</div>
      </div>

      <div class="main-content">
        <div class="main-route">
          <div class="main-block-title">Маршрут</div>
          <div class="main-fields">
            <div class="main-field" id="fromField">
              <div class="main-pin"></div>
              <input
                id="from"
                placeholder="Откуда: начните вводить адрес"
                autocomplete="off"
                [formControl]="fromControl"
                (input)="onFromChange()"
              />
              <div class="main-ac" id="fromAc" role="listbox" aria-label="Подсказки адресов"></div>
            </div>

            <div class="main-field" id="toField">
              <div class="main-pin"></div>
              <input
                id="to"
                placeholder="Куда: начните вводить адрес"
                autocomplete="off"
                [formControl]="toControl"
                (input)="onToChange()"
              />
              <div class="main-ac" id="toAc" role="listbox" aria-label="Подсказки адресов"></div>
            </div>
          </div>
        </div>

        <div class="main-package">
          <div class="main-block-title">Размер посылки</div>

          <div class="main-sizes">
            <button
              class="main-size-card"
              *ngFor="let size of sizes"
              type="button"
              [class.is-active]="size.value === selectedSize"
              (click)="selectSize(size.value)"
            >
              <div class="main-size-top">
                <div class="main-size-label">{{ size.value.toUpperCase() }}</div>
                <div class="main-size-rate">{{ size.rate }} ₽/км</div>
              </div>
              <div class="main-size-media" [ngClass]="size.mediaClass">
                <img
                  [src]="'/images/sizes/' + size.value + '.png'"
                  [alt]="'Короб ' + size.value.toUpperCase()"
                />
              </div>
              <div class="main-size-description" [innerHTML]="size.description"></div>
            </button>
          </div>
        </div>

        <div class="main-package">
          <div class="main-block-title">Скорость доставки</div>

          <div class="main-speed">
            <button
              class="main-speed-card"
              *ngFor="let speed of speeds"
              type="button"
              [class.is-active]="speed.value === selectedSpeed"
              (click)="selectSpeed(speed.value)"
            >
              <img
                [src]="speed.value === 'regular' ? '/images/sizes/vel0.png' : '/images/sizes/vel1.png'"
                [alt]="speed.label"
              />
              <span class="main-speed-description">{{ speed.label }}</span>
            </button>
          </div>
        </div>

        <div class="main-calculate-block">
          <button
            id="calc"
            class="button calculate-button"
            type="button"
            [disabled]="!canCalculate"
            (click)="calculate()"
          >
            Рассчитать
          </button>
        </div>

        <div class="main-result" id="result">
          <div class="main-result-title">Расчеты вашего заказа</div>
          <div class="main-result-lines">
            <div class="main-result-line">
              <span>Расстояние</span>
              <span>{{ calculationResult()?.distance || '—' }}</span>
            </div>
            <div class="main-result-line">
              <span>Доставим через</span>
              <span>{{ calculationResult()?.duration || '—' }}</span>
            </div>
            <div class="main-result-line">
              <span>Тариф</span>
              <span>{{ calculationResult()?.rate || '—' }}</span>
            </div>
          </div>
          <div class="main-price">
            <div class="main-price-label">Итого</div>
            <div class="main-price-value">
              {{ calculationResult()?.total || '—' }}
            </div>
          </div>
        </div>

        <div class="main-order-box">
          <div class="main-order-form" id="orderForm" [formGroup]="orderForm">
            <div class="main-order-title">Оформление доставки</div>

            <div class="main-block-info-row">
              <div class="main-block-title">Контакты</div>
              <div class="order-fields">
                <div class="main-field">
                  <input
                    id="customerName"
                    placeholder="Ваше имя"
                    autocomplete="off"
                    formControlName="name"
                  />
                </div>
                <div class="main-field">
                  <input
                    id="customerPhone"
                    placeholder="Ваш телефон"
                    autocomplete="off"
                    inputmode="tel"
                    formControlName="phone"
                  />
                </div>
              </div>
            </div>

            <div class="main-block-info-row extra-info">
              <div class="main-block-title">Дополнительная информация</div>
              <div class="main-field textarea">
                <textarea
                  id="comment"
                  placeholder="Детали доставки и комментарии"
                  formControlName="comment"
                ></textarea>
              </div>
            </div>

            <button
              id="submit"
              class="button main-submit-request"
              type="button"
              [disabled]="!canSubmit"
              (click)="submitOrder()"
            >
              Отправить заявку
            </button>
          </div>

          <div class="main-order-success" *ngIf="orderId()">
            <div class="main-success-icon">✓</div>
            <div class="main-success-title">Заявка отправлена!</div>
            <div class="main-success-title">
              Номер отправления – <span>{{ orderId() }}</span>
            </div>
            <div class="main-success-subtitle">Мы скоро свяжемся с вами</div>
          </div>
        </div>
      </div>
    </aside>
  `,
  styleUrls: ['./order.css'],
})
export class Order implements AfterViewInit, OnDestroy {
  public readonly sizes = DELIVERY_SIZES;
  public readonly speeds = DELIVERY_SPEEDS;

  public map: any;
  private mapRoute: any;

  public routeForm: FormGroup;
  public orderForm: FormGroup;

  public orderId = signal<string | null>(null);
  public calculationResult = signal<{
    distance: string;
    duration: string;
    rate: string;
    total: string;
  } | null>(null);

  private mapReady = false;
  private fromSuggest: any;
  private toSuggest: any;

  private fromSelectedValue: string | null = null;
  private toSelectedValue: string | null = null;

  constructor(private readonly formBuilder: FormBuilder) {
    this.routeForm = this.formBuilder.group({
      from: ['', Validators.required],
      to: ['', Validators.required],
      size: [DELIVERY_SIZES[0].value, Validators.required],
      speed: [DELIVERY_SPEEDS[0].value, Validators.required],
    });

    this.orderForm = this.formBuilder.group({
      name: ['', Validators.required],
      phone: ['', Validators.required],
      comment: [''],
    });

    // Любое изменение маршрута/размера/скорости — чистим расчёт и отчёт
    this.routeForm.valueChanges.subscribe(() => {
      this.calculationResult.set(null);
      this.orderId.set(null);
    });

    // Любое изменение контактных данных — убираем только отчёт
    this.orderForm.valueChanges.subscribe(() => {
      this.orderId.set(null);
    });
  }

  ngAfterViewInit(): void {
    if (typeof ymaps === 'undefined') {
      return;
    }

    ymaps.ready(() => {
      const mapElement = document.getElementById('map');

      if (!mapElement) {
        return;
      }

      this.map = new ymaps.Map('map', {
        center: [55.76, 37.64],
        zoom: 10,
        controls: [],
      });

      this.mapReady = true;

      this.fromSuggest = new ymaps.SuggestView('from');
      this.toSuggest = new ymaps.SuggestView('to');

      this.fromSuggest.events.add('select', (e: any) => {
        const item = e.get('item');
        const value = item && item.value ? item.value : null;
        if (value) {
          this.fromSelectedValue = value;
          this.fromControl.setValue(value);
        }
      });

      this.toSuggest.events.add('select', (e: any) => {
        const item = e.get('item');
        const value = item && item.value ? item.value : null;
        if (value) {
          this.toSelectedValue = value;
          this.toControl.setValue(value);
        }
      });
    });
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.destroy();
      this.map = null;
    }
  }

  get selectedSize(): string {
    return this.routeForm.get('size')?.value;
  }

  get selectedSpeed(): string {
    return this.routeForm.get('speed')?.value;
  }

  get fromAddress(): string {
    return this.routeForm.get('from')?.value;
  }

  get toAddress(): string {
    return this.routeForm.get('to')?.value;
  }

  get fromControl(): FormControl {
    return this.routeForm.get('from') as FormControl;
  }

  get toControl(): FormControl {
    return this.routeForm.get('to') as FormControl;
  }

  get canCalculate(): boolean {
    return this.routeForm.valid;
  }

  get canSubmit(): boolean {
    return this.routeForm.valid && this.orderForm.valid && !!this.calculationResult();
  }

  selectSize(value: string): void {
    this.routeForm.patchValue({ size: value });
  }

  selectSpeed(value: string): void {
    this.routeForm.patchValue({ speed: value });
  }

  onFromChange(): void {
    this.fromSelectedValue = null;
  }

  onToChange(): void {
    this.toSelectedValue = null;
  }

  private buildRoute(from: string, to: string): Promise<{ distanceKm: number; durationMinutes: number }> {
    return new Promise((resolve, reject) => {
      if (!this.map || !this.mapReady) {
        reject('map-not-ready');
        return;
      }

      if (!from || !to) {
        reject('addresses-empty');
        return;
      }

      const fromStr = this.fromSelectedValue || from;
      const toStr = this.toSelectedValue || to;

      const multiRoute = new ymaps.multiRouter.MultiRoute(
        {
          referencePoints: [fromStr, toStr],
          params: {
            results: 1,
            routingMode: 'auto',
          },
        },
        {
          boundsAutoApply: true,
        }
      );

      if (this.mapRoute) {
        this.map.geoObjects.remove(this.mapRoute);
      }

      this.mapRoute = multiRoute;
      this.map.geoObjects.add(this.mapRoute);

      multiRoute.model.events.add('requestsuccess', () => {
        const activeRoute = multiRoute.getActiveRoute();
        if (!activeRoute) {
          reject('no-route');
          return;
        }

        const distance = activeRoute.properties.get('distance');
        const duration = activeRoute.properties.get('duration');

        const distanceKm = distance && distance.value ? distance.value / 1000 : 0;
        const durationMinutes = duration && duration.value ? Math.round(duration.value / 60) : 0;

        resolve({ distanceKm, durationMinutes });
      });

      multiRoute.model.events.add('requestfail', () => {
        reject('route-fail');
      });
    });
  }

  async calculate(): Promise<void> {
    if (!this.routeForm.valid) {
      return;
    }

    const size = this.sizes.find((s) => s.value === this.selectedSize);

    try {
      const { distanceKm, durationMinutes } = await this.buildRoute(this.fromAddress, this.toAddress);

      const rate = size?.rate ?? 0;
      const total = Math.max(size?.min ?? 0, distanceKm * rate);

      this.calculationResult.set({
        distance: `${distanceKm.toFixed(1)} км`,
        duration: `${durationMinutes} минут`,
        rate: `${rate} ₽/км`,
        total: `${Math.round(total)} ₽`,
      });
    } catch (_) {
      this.calculationResult.set(null);
    }
  }

  submitOrder(): void {
    if (!this.canSubmit) {
      return;
    }

    this.orderId.set('DF-' + Math.floor(Math.random() * 1000000));
  }
}
