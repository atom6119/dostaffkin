import { Component, signal } from '@angular/core';
import { Header } from '../../header/header';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-track',
  standalone: true,
  imports: [Header, FormsModule],
  templateUrl: './track.html',
  styleUrl: './track.css',
})
export class Track {
  // то, что вводит пользователь
  trackNumber = '';

  // результат трекинга (null = ничего не искали / очищено)
  trackResult = signal<any | null>(null);

  trackShipment(): void {
    const rawValue = this.trackNumber.trim();

    if (!rawValue) {
      alert('Заполните номер отправления');
      return;
    }

    this.trackResult.set(null);

    const numericValue = Number(rawValue);
    if (Number.isNaN(numericValue) || numericValue <= 0) {
      alert('Введите корректный номер отправления');
      return;
    }

    // здесь позже вставишь реальный запрос к API
    this.trackResult.set({
      id: numericValue,
      route: {
        from: 'Москва, улица Арбат, 1',
        to: 'Минск, проспект Независимости, 58',
      },
      statuses: [
        { type: 'created', label: 'Создан', date: '10.01.2026' },
        { type: 'in-way', label: 'В пути: Вязьма', date: '15.01.2026' },
        { type: 'in-way', label: 'В пути: Орша', date: '16.01.2026' },
        { type: 'in-way', label: 'В пути: Минск', date: '18.01.2026' },
        { type: 'ready', label: 'Готов к выдаче', date: '25.01.2026' },
        { type: 'done', label: 'Вручен', date: '27.01.2026' },
      ],
    });
  }
}
