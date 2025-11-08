import { Component, Input } from '@angular/core';
import { CartService } from '../../../core/services/cart.service';
import { Book } from '../../../core/models/book.model';
import { ToastService } from '../../../core/services/toast.service';

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
  @Input() book!: Book;

  constructor(private cartService: CartService, private toast: ToastService) { }

  addToCart(event: Event) {
    event.preventDefault();
    this.cartService.addItem(this.book, 1, 'physical');
    this.toast.show('Added to cart!', 'success');
  }
}
