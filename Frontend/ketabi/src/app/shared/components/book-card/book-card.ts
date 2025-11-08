import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-book-card',
  standalone: true,
  imports: [],
  templateUrl: './book-card.html',
    styleUrls: ['./book-card.css'], 
})
export class BookCard {
  @Input() image: string = '';
  @Input() title: string = '';
  @Input() author: string = '';

}
