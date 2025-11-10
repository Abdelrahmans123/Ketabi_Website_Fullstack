import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CartService } from '../../../core/services/cart.service';
import { Book } from '../../../core/models/book.model';
import { ToastService } from '../../../core/services/toast.service';
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
  @Input() price?: number;
  @Input() rating?: number;
  @Input() book!: Book;

  constructor(private cartService: CartService, private toast: ToastService) { }

  addToCart(event: Event) {
    event.preventDefault();
    this.cartService.addItem(this.book, 1, 'physical');
    this.toast.show('Added to cart!', 'success');
  }
}
