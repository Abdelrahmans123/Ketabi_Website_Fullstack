import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { Book, BookResponse, SingleBookResponse } from '../models/book.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class BookService {
  private apiUrl = API_ENDPOINTS.books;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  getBooksByCategory(category: string): Observable<SingleBookResponse> {
    return this.http.get<SingleBookResponse>(`${this.apiUrl}/${category}`);
  }

  getAllBooks(): Observable<BookResponse> {
    return this.http.get<BookResponse>(`${this.apiUrl}/List-Books`);
  }

getBookById(id: string): Observable<SingleBookResponse> {
  return this.http.get<SingleBookResponse>(`${this.apiUrl}/Get-Book/${id}`);
}

  downloadBook(bookId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/Download-Book/${bookId}`);
  }

}