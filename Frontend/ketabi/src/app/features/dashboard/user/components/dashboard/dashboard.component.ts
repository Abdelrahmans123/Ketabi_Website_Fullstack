import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Hero } from '../../../../../shared/components/hero/hero';
import { CategoryCard } from '../../../../../shared/components/category-card/category-card';
import { BookCard } from '../../../../../shared/components/book-card/book-card';
import { ChatbotWidgetComponent } from '../../../../../shared/components/chatbot-widget/chatbot-widget.component';
import { BookService } from '../../../../../core/services/book.service';
import { Book } from '../../../../../core/models/book.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, Hero, CategoryCard, BookCard, ChatbotWidgetComponent, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  categories = [
    {
      icon: 'images/arabic-books.png',
      title: 'Arabic Books',
      category: 'Arabic',
    },
    {
      icon: 'images/english-books.png',
      title: 'English Books',
      category: 'English',
    },
    {
      icon: 'images/new-arrivals.png',
      title: 'New Arrivals',
      category: 'New',
    },
    {
      icon: 'images/kids-books.png',
      title: 'Kids Books',
      category: 'Kids',
    },
  ];

  books: Book[] = [];
  loading: boolean = false;
  error: string = '';

  currentCategoryTitle: string = 'Arabic Books';

  constructor(private bookService: BookService, private router: Router) {}

  ngOnInit(): void {
    // Load default category (Arabic) for dashboard
    this.loadBooksByCategory('arabic');
  }

  loadBooksByCategory(category: string): void {
    this.loading = true;
    this.error = '';

    this.bookService.getBooksByCategory(category).subscribe({
      next: (response) => {
        if (response.status === 'success') {
          const data = response.data;
          // Ensure this.books is always an array: wrap single Book into an array
          this.books = Array.isArray(data) ? data : [data];
          console.log('🚀 ~ DashboardComponent ~ loadBooksByCategory ~ response:', response);
        } else {
          this.error = response.message;
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load books';
        console.error('Error loading books:', err);
        this.loading = false;
      },
    });
  }

  onCategoryClick(category: string): void {
    this.router.navigate(['/books', category]);
  }

  ShowAll(): void {
    this.router.navigate(['/books']);
  }
}
