import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BookService } from '../../../../core/services/book.service';
import { Book } from '../../../../core/models/book.model';
import { CartService } from '../../../../core/services/cart.service';
import { WishlistService } from '../../../../core/services/wishlist.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Subscription, EMPTY } from 'rxjs';
import { switchMap, filter, distinctUntilChanged, map, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-book-details',
  templateUrl: './book-details.html',
  styleUrls: ['./book-details.css'],
  imports: [CommonModule]
})
export class BookDetailsComponent implements OnInit, OnDestroy {
  book?: Book;
  isLoading = true;
  errorMessage = '';
  isInWishlist = false;
  Math = Math; // Expose Math to template
  private subscriptions: Subscription = new Subscription();
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookService: BookService,
    private cartService: CartService,
    private wishlistService: WishlistService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    // Load initial book
    const initialId = this.route.snapshot.params['id'];
    if (initialId) {
      this.loadBook(initialId);
    }

    // Listen to route parameter changes - this should fire when route params change
    const paramsSub = this.route.params.pipe(
      map(params => params['id']),
      distinctUntilChanged()
    ).subscribe(id => {
      console.log('Route params changed, new book ID:', id);
      if (id) {
        this.loadBook(id);
      }
    });

    // Also listen to router navigation events as a fallback
    // This ensures we catch navigation even if params observable doesn't fire
    const routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.route.snapshot.params['id']),
      filter(id => !!id),
      distinctUntilChanged()
    ).subscribe(id => {
      console.log('Navigation end detected, book ID:', id);
      // Only load if it's different from current book
      if (!this.book || this.book._id !== id) {
        this.loadBook(id);
      }
    });

    this.subscriptions.add(paramsSub);
    this.subscriptions.add(routerSub);

    // Subscribe to wishlist changes
    this.wishlistService.wishlist$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this.book) {
        this.isInWishlist = this.wishlistService.isInWishList(this.book._id);
      }
    });
  }

  addToCart(): void {
    if (!this.book) return;
    this.cartService.addItem(this.book, 1, 'physical');
    this.toast.show('Added to cart!', 'success');
  }

  toggleWishlist(): void {
    if (!this.book) return;
    this.wishlistService.toggleWishlist(this.book._id).subscribe({
      next: () => {
        const message = !this.isInWishlist ? 'Added to wishlist!' : 'Removed from wishlist!';
        this.toast.show(message, 'success');
      },
      error: (error) => {
        this.toast.show(`Error: ${error.message}`, 'error');
      },
    });
  }

  private loadBook(id: string): void {
    if (!id) {
      this.errorMessage = 'Invalid book ID.';
      this.isLoading = false;
      return;
    }

    // Don't reload if we already have this book loaded
    if (this.book && this.book._id === id && !this.isLoading) {
      console.log('Book already loaded, skipping:', id);
      return;
    }

    console.log('Loading book with ID:', id);

    // Reset state
    this.book = undefined;
    this.errorMessage = '';
    this.isLoading = true;

    // Fetch book data
    this.bookService.getBookById(id).subscribe({
      next: (res) => {
        console.log('Book loaded successfully:', res.data?._id);
        this.book = res.data;
        this.isLoading = false;
        // Check wishlist status
        if (this.book) {
          this.isInWishlist = this.wishlistService.isInWishList(this.book._id);
        }
      },
      error: (err) => {
        this.errorMessage = 'Failed to load book details.';
        console.error('Failed to load book details:', err);
        this.isLoading = false;
      },
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
