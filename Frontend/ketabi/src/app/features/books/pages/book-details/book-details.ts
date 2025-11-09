import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BookService } from '../../../../core/services/book.service';
import { Book } from '../../../../core/models/book.model';
import { CommonModule,CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-book-details',
  templateUrl: './book-details.html',
  styleUrls: ['./book-details.css'],
   standalone: true,
   imports: [CommonModule] 
})
export class BookDetailsComponent implements OnInit {
  book?: Book;
  isLoading = true;
  errorMessage = '';

  constructor(private route: ActivatedRoute, private bookService: BookService) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.bookService.getBookById(id).subscribe({
      next: (book) => {
        console.log('Loaded book:', book);
        this.book = book;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load book details:', error);
        this.errorMessage = 'Failed to load book details.';
        this.isLoading = false;
      }
    });
  }
}
