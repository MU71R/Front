import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LetterDetail } from 'src/app/model/letter-detail';
import { LetterService } from 'src/app/service/letter.service';

@Component({
  selector: 'app-rejected-letters-list',
  templateUrl: './rejected-letters-list.component.html',
  styleUrls: ['./rejected-letters-list.component.css']
})
export class RejectedLettersListComponent implements OnInit {

  rejectedLetters: LetterDetail[] = [];
  loading = true;

  constructor(private letterService: LetterService, private router: Router) {}

  ngOnInit(): void {
    this.letterService.getRejectedLetters().subscribe({
      next: (res) => {
        if (res.success) {
          this.rejectedLetters = res.letters;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  goToDetails(id: string) {
    this.router.navigate(['/rejected-letter-details', id]);
  }
}
