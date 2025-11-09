import { environment } from '../../../environments/environment';
export const API_ENDPOINTS = {
  books: `${environment.apiBaseUrl}/books`,
  chatbot: `${environment.apiBaseUrl}/chatbot`,
  reviews: `${environment.apiBaseUrl}/reviews`,
  publishers: `${environment.apiBaseUrl}/publishers`,
};
