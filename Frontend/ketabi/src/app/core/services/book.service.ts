import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { Book, BookResponse, SingleBookResponse } from '../models/book.model';

@Injectable({
  providedIn: 'root',
})
export class BookService {
  private apiUrl = API_ENDPOINTS.books;

  constructor(private http: HttpClient) {}

  getBooksByCategory(category: string): Observable<SingleBookResponse> {
    return this.http.get<SingleBookResponse>(`${this.apiUrl}/${category}`);
  }

  getAllBooks(): Observable<BookResponse> {
    return this.http.get<BookResponse>(`${this.apiUrl}/List-Books`);
  }

  getBookById(id: string): Observable<Book> {
    return this.http.get<Book>(`${this.apiUrl}/Get-Book/${id}`);
  }
}
