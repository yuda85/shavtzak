import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Person, Vehicle, Assignment, AppData, ConvoyInfo } from './models';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private readonly STORAGE_KEY = 'shavtzak-data';

  private peopleSubject = new BehaviorSubject<Person[]>([]);
  private vehiclesSubject = new BehaviorSubject<Vehicle[]>([]);
  private assignmentsSubject = new BehaviorSubject<Assignment[]>([]);
  private convoyInfoSubject = new BehaviorSubject<ConvoyInfo | null>(null);

  people$ = this.peopleSubject.asObservable();
  vehicles$ = this.vehiclesSubject.asObservable();
  assignments$ = this.assignmentsSubject.asObservable();
  convoyInfo$ = this.convoyInfoSubject.asObservable();

  get people() { return this.peopleSubject.value; }
  get vehicles() { return this.vehiclesSubject.value; }
  get assignments() { return this.assignmentsSubject.value; }
  get convoyInfo() { return this.convoyInfoSubject.value; }

  constructor() {
    this.loadData();
  }

  private loadData(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const data: AppData = JSON.parse(stored);
        this.peopleSubject.next(data.people || []);
        this.vehiclesSubject.next(data.vehicles || []);
        this.assignmentsSubject.next(data.assignments || []);
        this.convoyInfoSubject.next(data.convoyInfo || null);
      } catch (e) {
        console.error('Error loading data from localStorage:', e);
      }
    }
  }

  private saveData(): void {
    const data: AppData = {
      people: this.peopleSubject.value,
      vehicles: this.vehiclesSubject.value,
      assignments: this.assignmentsSubject.value,
      convoyInfo: this.convoyInfoSubject.value || undefined
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }

  addPerson(person: Person): void {
    const people = [...this.peopleSubject.value, person];
    this.peopleSubject.next(people);
    this.saveData();
  }

  removePerson(idNumber: string): void {
    const people = this.peopleSubject.value.filter(p => p.idNumber !== idNumber);
    this.peopleSubject.next(people);
    const assignments = this.assignmentsSubject.value.filter(a => a.personId !== idNumber);
    this.assignmentsSubject.next(assignments);
    this.saveData();
  }

  addVehicle(vehicle: Vehicle): void {
    const vehicles = [...this.vehiclesSubject.value, vehicle];
    this.vehiclesSubject.next(vehicles);
    this.saveData();
  }

  removeVehicle(vehicleId: string): void {
    const vehicles = this.vehiclesSubject.value.filter(v => v.vehicleId !== vehicleId);
    this.vehiclesSubject.next(vehicles);
    const assignments = this.assignmentsSubject.value.filter(a => a.vehicleId !== vehicleId);
    this.assignmentsSubject.next(assignments);
    this.saveData();
  }

  addAssignment(assignment: Assignment): void {
    const assignments = [...this.assignmentsSubject.value];
    const existingIndex = assignments.findIndex(
      a => a.vehicleId === assignment.vehicleId && a.personId === assignment.personId
    );
    
    if (existingIndex >= 0) {
      assignments[existingIndex] = { ...assignments[existingIndex], stay: assignment.stay };
    } else {
      assignments.push(assignment);
    }
    
    this.assignmentsSubject.next(assignments);
    this.saveData();
  }

  removeAssignment(vehicleId: string, personId: string): void {
    const assignments = this.assignmentsSubject.value.filter(
      a => !(a.vehicleId === vehicleId && a.personId === personId)
    );
    this.assignmentsSubject.next(assignments);
    this.saveData();
  }

  clearAll(): void {
    this.peopleSubject.next([]);
    this.vehiclesSubject.next([]);
    this.assignmentsSubject.next([]);
    this.saveData();
  }

  clearAssignments(): void {
    this.assignmentsSubject.next([]);
    this.convoyInfoSubject.next(null);
    this.saveData();
  }

  setConvoyInfo(convoyInfo: ConvoyInfo): void {
    this.convoyInfoSubject.next(convoyInfo);
    this.saveData();
  }

  exportData(): AppData {
    return {
      people: this.peopleSubject.value,
      vehicles: this.vehiclesSubject.value,
      assignments: this.assignmentsSubject.value,
      convoyInfo: this.convoyInfoSubject.value || undefined
    };
  }

  importData(data: AppData): void {
    this.peopleSubject.next(data.people || []);
    this.vehiclesSubject.next(data.vehicles || []);
    this.assignmentsSubject.next(data.assignments || []);
    this.convoyInfoSubject.next(data.convoyInfo || null);
    this.saveData();
  }

  generateOutput(): string {
    const vehicles = this.vehiclesSubject.value;
    const people = this.peopleSubject.value;
    const assignments = this.assignmentsSubject.value;
    const convoyInfo = this.convoyInfoSubject.value;

    let output = '';

    // Add convoy information header if available
    if (convoyInfo) {
      output += `מטרת השיירה: ${convoyInfo.goal}\n`;
      output += `תאריך: ${convoyInfo.date}\n`;
      output += `שעה: ${convoyInfo.time}\n\n`;
    }

    const vehicleGroups = vehicles.map(vehicle => {
      const vehicleAssignments = assignments.filter(a => a.vehicleId === vehicle.vehicleId);
      const assignedPeople = vehicleAssignments.map(assignment => {
        const person = people.find(p => p.idNumber === assignment.personId);
        return {
          person,
          stay: assignment.stay
        };
      }).filter(item => item.person);

      return {
        vehicle,
        people: assignedPeople
      };
    }).filter(group => group.people.length > 0);

    const vehicleOutput = vehicleGroups.map(group => {
      const header = `${group.vehicle.designation} ${group.vehicle.vehicleId}`;
      const peopleLines = group.people.map(item => 
        `${item.person!.fullName} ${item.person!.idNumber} - ${item.stay ? 'שהיה' : 'ללא שהיה'}`
      );
      return [header, ...peopleLines].join('\n');
    }).join('\n\n');

    return output + vehicleOutput;
  }
}