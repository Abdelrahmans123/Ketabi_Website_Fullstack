import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Cart, CartItem } from '../models/cart.model';
import { Book } from '../models/book.model';
@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly CART_KEY = 'ketabi_cart';
  private cartSubject = new BehaviorSubject<Cart>({ items: [], total: 0 });
  cart$ = this.cartSubject.asObservable();

  constructor() {
    this.loadCart();
  }

  private loadCart() {
    const stored = localStorage.getItem(this.CART_KEY);
    if (stored) {
      this.cartSubject.next(JSON.parse(stored));
    } else {
      const cart: Cart = {
        items: [],
        total: 0,
      };
      this.cartSubject.next(cart);
      this.saveCart();
    }
  }

  private saveCart() {
    const cart = this.cartSubject.value;
    localStorage.setItem(this.CART_KEY, JSON.stringify(cart));
  }

  addItem(book: Book, quantity: number = 1, type: 'physical' | 'ebook') {
    const cart = this.cartSubject.value;
    const existingItem = cart.items.find((i) => i.bookId === book._id);
    if (existingItem) {
      existingItem.type = type;
      type === 'physical'
        ? (existingItem.quantity = Math.min(existingItem.quantity + quantity, existingItem.stock))
        : (existingItem.quantity = 1);
    } else {
      cart.items.push({
        bookId: book._id,
        name: book.name,
        price: book.price,
        discount: book.discount,
        image: { url: book.image ? book.image.url : 'default-book.jpg' },
        stock: book.stock,
        type: type,
        quantity: quantity,
      });
    }

    this.updateTotals(cart);
  }

  removeItem(bookId: string) {
    const cart = this.cartSubject.value;
    cart.items = cart.items.filter((i) => i.bookId !== bookId);
    this.updateTotals(cart);
  }

  updateItem(bookId: string, quantity: number, type: 'physical' | 'ebook') {
    const cart = this.cartSubject.value;
    const item = cart.items.find((i) => i.bookId === bookId);
    if (item) {
      item.type = type;
      item.quantity = type === 'ebook' ? 1 : quantity;
      this.updateTotals(cart);
    }
  }

  clearCart() {
    const cart: Cart = {
      items: [],
      total: 0,
    };
    this.cartSubject.next(cart);
    localStorage.removeItem(this.CART_KEY);
  }

  private updateTotals(cart: Cart) {
    cart.total = cart.items.reduce(
      (sum, item) =>
        sum +
        item.price * (item.type === 'ebook' ? 0.45 : 1) * item.quantity * (1 - item.discount / 100),
      0
    );
    this.cartSubject.next(cart);
    this.saveCart();
  }

  getCart() {
    const cart = this.cartSubject.value;
    return cart;
  }

  getCartItems() {
    const items = this.cartSubject.value.items;
    return items;
  }
}
