import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { Book, BookResponse } from '../models/book.model';

@Injectable({
  providedIn: 'root'
})
export class BookService {
  private apiUrl = API_ENDPOINTS.books;

  constructor(private http: HttpClient) {}

  getBooksByCategory(category: string): Observable<BookResponse> {
    return this.http.get<BookResponse>(`${this.apiUrl}/${category}`);
  }

  getAllBooks(): Observable<BookResponse> {
    return this.http.get<BookResponse>(this.apiUrl);
  }

  getBookById(id: string): Observable<Book> {
    return this.http.get<Book>(`${this.apiUrl}/${id}`);
  }
}
