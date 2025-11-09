import { Component, OnInit } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CommonModule, AsyncPipe, CurrencyPipe } from '@angular/common';
import { CartItem } from '../../core/models/cart.model';
import { CartService } from '../../core/services/cart.service';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CouponService } from '../../core/services/coupon.service';
import { ToastService } from '../../core/services/toast.service';
import { take } from 'rxjs';
import { OrderService } from '../../core/services/order.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, AsyncPipe, RouterLink, FormsModule],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css',
})
export class CartComponent implements OnInit {
  cartItems$: Observable<CartItem[]>;
  total$: Observable<number>;

  // UI helper properties
  subtotal = 0;
  physicalBooksTotal = 0;
  totalOrder = 0;
  cartItems: CartItem[] = [];

  // Coupon stuff
  couponCode = '';
  couponError = '';
  couponSuccess = '';
  discountAmount = 0;
  minOrderValue = 0;
  isLoading = false;
  discountOfTotal = 0;

  // gift
  isGift = false;
  giftEmail = '';
  giftMessage = '';

  //shipping
  street = '';
  city = '';
  phoneNumber = '';

  constructor(private cartService: CartService, private couponService: CouponService, private toastService: ToastService, private orderService:OrderService) {
    this.cartItems$ = this.cartService.cart$.pipe(map((cart) => cart.items));
    this.total$ = this.cartService.cart$.pipe(map((cart) => cart.total));
  }

  ngOnInit() {
    // Calculate subtotal dynamically when the cart changes
    this.cartItems$.subscribe((items) => {
      this.cartItems = items || [];
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

      if (this.subtotal < this.minOrderValue) {
        this.couponCode = '';
        this.discountAmount = 0;
        this.discountOfTotal = 0;
        this.couponSuccess = '';
        this.toastService.show(`Coupon removed! $${this.minOrderValue} Minimum Order Value`, "error")
      }
      this.totalOrder = Math.round(((this.subtotal * (1 - this.discountAmount / 100))) * 100) / 100;
    });
  }

  applyCoupon(event: Event) {
    event.preventDefault();
    if (!this.couponCode.trim()) return;

    this.isLoading = true;
    this.couponError = '';
    this.couponSuccess = '';

    this.total$.pipe(take(1)).subscribe(total => {
      this.couponService.verifyCoupon(this.couponCode.trim(), total).subscribe({
        next: (res) => {
          this.isLoading = false;
          this.discountAmount = res.coupon.discountAmount;
          this.couponSuccess = res.message;
          this.minOrderValue = res.coupon.minOrderValue;
          this.calculateTotalOrder(total);
          this.toastService.show("Coupon Applied!", "success")
        },
        error: (err) => {
          this.isLoading = false;
          this.discountAmount = 0;
          this.minOrderValue = 0;
          this.couponError = err.error?.message || 'Invalid coupon';
          (this.couponError === "Unauthorized" || this.couponError === "Token not found") ? this.couponError = "Please login" : this.couponError = this.couponError;
          this.toastService.show(this.couponError, "error");
          this.calculateTotalOrder(total);
        }
      });
    });
  }


  private calculateTotalOrder(total: number) {
    this.discountOfTotal = Math.round(((this.subtotal * (this.discountAmount / 100))) * 100) / 100
    this.totalOrder = Math.round(((this.subtotal * (1 - this.discountAmount / 100))) * 100) / 100;
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

  hasPhysicalBooks(): boolean {
    return this.cartItems.some(item => item.type === 'physical');
  }

  checkout() {
    const items = this.cartService.getCartItems();
    const formattedItems = items.map(item => ({
      book: item.bookId,
      quantity: item.quantity,
      type: item.type
    }));

    const orderPayload: any = {
      items: formattedItems,
      paymentMethod: "Stripe",
      isGift: this.isGift,
      coupon: this.couponCode || 'No Coupon'
    };

    if (this.isGift) {
      orderPayload.recipientEmail = this.giftEmail;
      orderPayload.personalizedMessage = this.giftMessage;
    }

    const hasPhysicalBook = formattedItems.some(item => item.type === 'physical');

    if (hasPhysicalBook) {
      if (!this.street || !this.city) {
        this.toastService.show("Need full address info!", "error")
        return
      } else { 
        orderPayload.shippingAddress = {
          street: this.street,
          city: this.city,
          phoneNumber: this.phoneNumber
        };
      }
    }

    console.log('🧾 Order payload:', orderPayload);
    this.orderService.createOrder(orderPayload).subscribe({
      next: (res) => {
        this.toastService.show('Order created successfully!', 'success');
        this.cartService.clearCart();
      },
      error: (err) => {
        this.toastService.show(err.error?.message || 'Order failed!', 'error');
      }
    })
  }


  trackById(_: number, item: CartItem) {
    return item.bookId;
  }
}
