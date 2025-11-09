import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-book-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './book-card.html',
  styleUrls: ['./book-card.css'],
})
export class BookCard {
  @Input() id: string = '';
  @Input() image: string = '';
  @Input() title: string = '';
  @Input() author: string = '';
}
