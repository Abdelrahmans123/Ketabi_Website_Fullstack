export interface CartItem {
  bookId: string;
  name: string;
  price: number;
  discount: number;
  image: { url: string };
  stock: number;
  type: 'physical'|'ebook',
  quantity:number               
}

export interface Cart {
    items: CartItem[],
    total: number
}