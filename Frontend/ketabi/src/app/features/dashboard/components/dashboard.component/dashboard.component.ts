import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Hero } from '../../../../shared/components/hero/hero';
import { CategoryCard } from '../../../../shared/components/category-card/category-card';
import { BookCard } from '../../../../shared/components/book-card/book-card';
import { BookService} from '../../../../core/services/book.service';
import { Book } from '../../../../core/models/book.model';
import { ChatbotWidgetComponent } from '../../../../shared/components/chatbot-widget/chatbot-widget.component'; // ← Add this

import { RouterLink, ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    Hero,
    CategoryCard,
    BookCard,
    ChatbotWidgetComponent,
    RouterLink
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
categories = [
  {
    icon: 'arabic-books.png',
    title: 'Arabic Books',
    category: 'Arabic'
  },
  {
    icon: 'english-books.png',
    title: 'English Books',
    category: 'English'
  },
  {
    icon: 'new-arrivals.png',
    title: 'New Arrivals',
    category: 'New'
  },
  {
    icon: 'kids-books.png',
    title: 'Kids Books',
    category: 'Kids'
  }
];


  books: Book[] = [];
  loading: boolean = false;
  error: string = '';



  currentCategoryTitle: string = 'Arabic Books';

  constructor(
    private bookService: BookService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const category = params['category'] || 'Arabic';


      const catObj = this.categories.find(c => c.category === category);
      this.currentCategoryTitle = catObj ? catObj.title : 'Arabic Books';
      this.loadBooksByCategory(category);
    });
  }

  loadBooksByCategory(category: string): void {
    this.loading = true;
    this.error = '';

    this.bookService.getBooksByCategory(category).subscribe({
      next: (response) => {
        if (response.status === 'success') {
          this.books = response.data;
        } else {
          this.error = response.message;
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load books';
        console.error('Error loading books:', err);
        this.loading = false;
      }
    });
  }

  onCategoryClick(category: string): void {
    this.router.navigate(['/books', category]);
  }


  ShowAll(): void {
   //
  }
}
