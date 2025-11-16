import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LetterDetail } from 'src/app/model/letter-detail';
import { LetterService } from 'src/app/service/letter.service';
import { User } from 'src/app/model/user';

@Component({
  selector: 'app-rejected-letter-details',
  templateUrl: './rejected-letter-details.component.html',
  styleUrls: ['./rejected-letter-details.component.css']
})
export class RejectedLetterDetailsComponent {

  letter: LetterDetail | null = null;
  loading = true;
  rejectedBy: User | null = null;
  

  constructor(
    private letterService: LetterService, 
    private route: ActivatedRoute,   
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];  
    this.loadLetter(id);
  }

  loadLetter(id: string) {
    this.letterService.getLetterById(id).subscribe({
      next: (res: any) => {
        this.letter = res.letter;
        this.rejectedBy = res.rejectedBy;   
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  goBack() {
    this.router.navigate(['/rejected-letters']);
  }
}
