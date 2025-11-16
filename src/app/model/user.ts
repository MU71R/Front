export interface LoginCredentials {
  username: string;
  password: string;
}

export interface User {
  _id?: string;
  username: string;
  fullname: string;
  role: 'preparer' | 'UniversityPresident' | 'supervisor' | 'admin' |  string;
  sector: string[];
  status?: 'active' | 'inactive';
  sectorName?: string; 
  department?: string;
  password?: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
}

export interface DecodedToken {
  userId: string;
  name?: string;
  email?: string;
  role?: string;
  exp?: number;
  iat?: number;
}

export interface Department {
  _id?: string;
  username: string;
  fullname: string;
  password: string;
  role: 'preparer' | 'UniversityPresident' | 'supervisor' | 'admin' |  string;
  sector: string[];
}


export interface Sector {
  _id?: string;
  sector: string;
}

export interface addSector{
  sector : string
}

