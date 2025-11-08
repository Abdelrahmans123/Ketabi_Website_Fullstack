import { Component, OnInit } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CommonModule, AsyncPipe } from '@angular/common';
import { CartItem } from '../../core/models/cart.model';
import { CartService } from '../../core/services/cart.service';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, AsyncPipe, RouterLink],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css',
})
export class CartComponent implements OnInit {
  cartItems$: Observable<CartItem[]>;
  total$: Observable<number>;

  // UI helper properties
  subtotal = 0;
  discountPercent = 0;
  deliveryFee = 0;
  physicalBooksTotal = 0;
  totalOrder = 0;

  // Coupon stuff
  couponCode = '';
  couponDiscount = 0;
  couponApplied = false;

  constructor(private cartService: CartService) {
    this.cartItems$ = this.cartService.cart$.pipe(map((cart) => cart.items));
    this.total$ = this.cartService.cart$.pipe(map((cart) => cart.total));
  }

  ngOnInit() {
    // Calculate subtotal dynamically when the cart changes
    this.cartItems$.subscribe((items) => {
      this.subtotal = items.reduce(
        (sum, item) =>
          sum +
          item.price *
            item.quantity *
            (item.type === 'ebook' ? 0.45 : 1) *
            (1 - item.discount / 100),
        0
      );
      this.physicalBooksTotal = items.reduce(
        (sum, item) =>
          sum +
          item.price *
            item.quantity *
            (item.type === 'ebook' ? 0 : 1) *
            (1 - item.discount / 100),
        0
      );
      this.deliveryFee = this.physicalBooksTotal * 0.0579;  
      this.totalOrder = this.subtotal + this.deliveryFee;
    });
  }

  increase(item: CartItem) {
    this.cartService.updateItem(item.bookId, item.quantity + 1, item.type);
  }

  decrease(item: CartItem) {
    if (item.quantity > 1) {
      this.cartService.updateItem(item.bookId, item.quantity - 1, item.type);
    }
  }

  changeType(item: CartItem) {
    const newType = item.type === 'ebook' ? 'physical' : 'ebook';
    this.cartService.updateItem(item.bookId, item.quantity, newType);
  }

  remove(item: CartItem) {
    this.cartService.removeItem(item.bookId);
  }

  clear() {
    this.cartService.clearCart();
  }

  trackById(_: number, item: CartItem) {
    return item.bookId;
  }
}
