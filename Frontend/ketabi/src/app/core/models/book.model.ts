export interface Genre {
  _id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  slug: string;
  __v: number;
}
export interface Book {
  _id: string;
  name: string;
  author: string;
  genre: Genre;      
  price: number;
  image: { url: string };
  description: string;
  stock: number;
  status: string;
  Edition?: string;
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


