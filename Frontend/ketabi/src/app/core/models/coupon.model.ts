export interface couponResponse {
  status: string;
  message: string;
  code: number;
  coupon: {
    code:string;
    discountAmount:number;
    minOrderValue:number
  };
}