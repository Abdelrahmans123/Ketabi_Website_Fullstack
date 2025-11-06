export interface Book {
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
}

export interface BookResponse {
  status: string;
  message: string;
  data: Book[];
}
