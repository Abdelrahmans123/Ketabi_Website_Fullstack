
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { map, Observable } from 'rxjs';
import { CartService } from '../../../core/services/cart.service';
import { RouterLink, RouterLinkActive } from '@angular/router';
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnInit {
  cartCount$!: Observable<number>;

  constructor(private cartService:CartService) {}

  ngOnInit(): void {
    this.cartCount$ = this.cartService.cart$.pipe(
      map(cart => cart.items.reduce((sum,item) => sum + item.quantity, 0))
    )
  }
}
