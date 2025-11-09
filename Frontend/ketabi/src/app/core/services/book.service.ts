import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { Book, BookResponse } from '../models/book.model';
import { map } from 'rxjs/operators';

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
  return this.http.get<BookResponse>(`${this.apiUrl}/List-Books`);  }
getBookById(id: string): Observable<Book> {
  return this.http
    .get<{ status: string; message: string; code: number; data: Book }>(
      `${this.apiUrl}/Get-Book/${id}`
    )
    .pipe(
      map(res => res.data) 
    );
}

}
