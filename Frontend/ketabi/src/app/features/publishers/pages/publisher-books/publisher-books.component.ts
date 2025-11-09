import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PublisherService } from '../../../../core/services/publisher.service';
import { PublisherBook, PublisherBooksResponse } from '../../models/book.model';

@Component({
    selector: 'app-publisher-books',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './publisher-books.component.html',
    styleUrl: './publisher-books.component.css'
})
export class PublisherBooksComponent implements OnInit {
    @Input() publisherId?: string; // If not provided, use current user's ID

    books: PublisherBook[] = [];
    loading = false;
    error: string | null = null;
    currentPage = 1;
    limit = 10;
    totalPages = 0;
    totalBooks = 0;
    deletingBookId: string | null = null;

    constructor(
        private publisherService: PublisherService,
    ) { }

    ngOnInit(): void {
        const id = this.publisherId || this.getCurrentUserId();
        if (id) {
            this.loadBooks(id);
        } else {
            this.error = 'Publisher ID is required';
        }
    }

    private getCurrentUserId(): string | null {
        // In a real app, you'd get this from a user service or JWT payload
        // For now, we'll need the publisherId to be passed in
        return null;
    }

    loadBooks(publisherId: string, page: number = 1): void {
        this.loading = true;
        this.error = null;
        this.currentPage = page;

        this.publisherService.getPublishedBooks(publisherId, page, this.limit).subscribe({
            next: (response: PublisherBooksResponse) => {
                console.log('Backend:', response);
                this.books = response.data.books || [];
                this.totalPages = response.data.totalPages || 0;
                this.totalBooks = response.data.totalBooks || 0;
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading books:', err);
                this.error = err.error?.message || 'Failed to load books. Please try again.';
                this.loading = false;
            }
        });
    }

    deleteBook(bookId: string, bookName: string): void {
        if (!confirm(`Are you sure you want to delete "${bookName}"? This action cannot be undone.`)) {
            return;
        }

        this.deletingBookId = bookId;
        this.publisherService.deleteBook(bookId).subscribe({
            next: (response) => {
                console.log('Backend:', response);
                this.deletingBookId = null;
                // Reload books
                const id = this.publisherId || this.getCurrentUserId();
                if (id) {
                    this.loadBooks(id, this.currentPage);
                }
            },
            error: (err) => {
                console.error('Error deleting book:', err);
                this.error = err.error?.message || 'Failed to delete book. Please try again.';
                this.deletingBookId = null;
            }
        });
    }

    editBook(bookId: string): void {
        // Navigate to edit page or open edit modal
        // For now, just log - you can implement navigation later
        console.log('Edit book:', bookId);
        // Example: this.router.navigate(['/publishers/books/edit', bookId]);
    }

    addNewBook(): void {
        // Navigate to add book page or open form modal
        console.log('Add new book');
        // Example: this.router.navigate(['/publishers/books/new']);
    }

    goToPage(page: number): void {
        if (page >= 1 && page <= this.totalPages) {
            const id = this.publisherId || this.getCurrentUserId();
            if (id) {
                this.loadBooks(id, page);
            }
        }
    }

    getGenreName(genre: any): string {
        if (typeof genre === 'string') return genre;
        return genre?.name || 'Unknown';
    }
}

