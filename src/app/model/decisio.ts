import { User } from "./user";

export interface MainCriteria {
    _id: string;
    name: string;
    sector: Sector;
}

export interface SubCriteria {
    _id: string;
    name: string;
    mainCriteria: MainCriteria;
}

export interface Sector {
    _id: string;
    sector: string;
    name?: string; // للتوافق مع ng-select
}

export interface ReviewerAssignment {
    _id?: string;

  sector: Sector;            
  mainCriteria: MainCriteria; 
  subCriteria: SubCriteria;   

  supervisor: User;   
}
