
export interface User {
  _id: string;
  fullname: string;
  username: string;
}

export interface Sector {
  _id: string;
  name: string;
}

export interface SubCriteria {
  _id: string;
  name: string;
  mainCriteria: string;
  userId: User;
}

export interface MainCriteria {
  _id?: string;
  name: string;
  sector?: string[];
  departmentUser?: string;
  sectorName?: string;
  departmentName?: string;
}

export interface AddMainCriteriaPayload {
  name: string;
  sector?: string[]; 
  departmentUser?: string; 
}

export interface AddSubCriteriaPayload {
  name: string;
  mainCriteria: string; 
}

export interface UpdateMainCriteriaRequest {
  id: string;
  name: string;
  sector?: string[];
  departmentUser?: string;
}