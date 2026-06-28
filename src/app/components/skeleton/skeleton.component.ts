import {Component, input} from '@angular/core';
import {NgStyle} from "@angular/common";

@Component({
  selector: 'app-skeleton',
  imports: [
    NgStyle
  ],
  standalone: true,
  templateUrl: './skeleton.component.html',
  styleUrl: './skeleton.component.scss'
})
export class SkeletonComponent {
  width = input<number | string>();
  height = input<number | string>();
  borderRadius = input<number>();
}
