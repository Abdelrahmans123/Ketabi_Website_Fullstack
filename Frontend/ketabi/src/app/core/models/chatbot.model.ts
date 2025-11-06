export interface ChatbotRequest {
  query: string;
  language?: string;
  age?: string;
  limit?: number;
}

export interface ChatbotResponse {
  success: boolean;
  data: {
    response: string;
    books: any[];
    metadata: {
      booksFound: number;
      query: string;
      language: string;
      timestamp: string;
    };
  };
}
