import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { PublisherBooksResponse, UpdateBookRequest } from '../../features/publishers/models/book.model';
import { PublisherOrdersResponse, UpdatePublisherOrderRequest, UpdatePublisherOrderResponse } from '../../features/publishers/models/order.model';

@Injectable({
    providedIn: 'root'
})
export class PublisherService {
    private publishersUrl = API_ENDPOINTS.publishers;
    private booksUrl = API_ENDPOINTS.books;
    constructor(private http: HttpClient) { }




    // Get published books
    getPublishedBooks(publisherId: string, page: number = 1, limit: number = 10): Observable<PublisherBooksResponse> {

        const params: any = { page, limit };
        return this.http.get<PublisherBooksResponse>(`${this.publishersUrl}/${publisherId}/books`, { params });
    }

    // Add book (uses FormData for file upload)
    addBook(formData: FormData): Observable<any> {
        return this.http.post(`${this.booksUrl}/Create-Book`, formData, {});
    }

    // Update book
    updateBook(bookId: string, data: UpdateBookRequest): Observable<any> {
        return this.http.put(`${this.booksUrl}/Update-Book/${bookId}`, data, {
        });
    }

    // Delete book
    deleteBook(bookId: string): Observable<any> {
        console.log('Deleting book:', bookId);
        return this.http.delete(`${this.booksUrl}/Delete/${bookId}`, {
        });
    }

    // Get publisher orders
    getPublisherOrders(publisherId: string, page: number = 1, limit: number = 10): Observable<PublisherOrdersResponse> {
        console.log('Getting publisher orders:', publisherId, page, limit);
        const params: any = { page, limit };
        return this.http.get<PublisherOrdersResponse>(`${this.publishersUrl}/${publisherId}/orders`, {
            params,
        });
    }

    // Update publisher order
    updatePublisherOrder(publisherOrderId: string, data: UpdatePublisherOrderRequest): Observable<UpdatePublisherOrderResponse> {
        console.log('Updating publisher order:', publisherOrderId, data);
        return this.http.patch<UpdatePublisherOrderResponse>(`${this.publishersUrl}/${publisherOrderId}`, data);
    }
}

