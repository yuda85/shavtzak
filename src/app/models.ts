export interface Person {
  idNumber: string;
  fullName: string;
}

export interface Vehicle {
  vehicleId: string;
  designation: string;
}

export interface Assignment {
  vehicleId: string;
  personId: string; // idNumber
  stay: boolean;
}

export interface AppData {
  people: Person[];
  vehicles: Vehicle[];
  assignments: Assignment[];
}