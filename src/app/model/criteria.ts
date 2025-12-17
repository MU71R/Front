export interface Sector {
  _id: string;
  sector: string;
  name?: string; // للتوافق مع ng-select
}

export interface MainCriteria {
  _id?: string;
  name: string;
  sector?: (Sector | string)[]; // يمكن أن يكون array من objects أو IDs
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface SubCriteria {
  _id: string;
  name: string;
  mainCriteria: MainCriteria | string; // يمكن أن يكون object أو ID
  sector?: (Sector | string)[]; // استخدم sector بدلاً من sectors
  userId?: any;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}