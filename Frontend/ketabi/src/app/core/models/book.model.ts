export interface Book {
  data: Book | undefined;
  _id: string;
  name: string;
  author: string;
  category: string;
  price: number;
  discount: number;
  image: { url: string };
  description: string;
  stock: number;
  status: string;
  genre?: { name: string };
}
export interface BookResponse {
  status: string;
  message: string;
  code: number;
  data: {
    books: Book[];
    pagination: any;
  };
}
export interface SingleBookResponse {
  status: string;
  message: string;
  code: number;
  data: Book;
}
