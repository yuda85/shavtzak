import { Component, signal, computed } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { map, startWith } from 'rxjs/operators';
import { Observable, combineLatest } from 'rxjs';

import { DataService } from './data.service';
import { Person, Vehicle, Assignment } from './models';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatAutocompleteModule,
    MatListModule,
    MatIconModule,
    MatDividerModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  vehicleDesignationControl = new FormControl('', [Validators.required]);
  vehicleIdControl = new FormControl('', [Validators.required, App.vehicleNumberValidator]);
  
  personNameControl = new FormControl('', [Validators.required, App.nameValidator]);
  personIdControl = new FormControl('', [Validators.required, App.personIdValidator]);
  
  assignmentVehicleControl = new FormControl('');
  assignmentPersonControl = new FormControl('');
  assignmentStayControl = new FormControl(false);

  people$!: Observable<Person[]>;
  vehicles$!: Observable<Vehicle[]>;
  assignments$!: Observable<Assignment[]>;
  
  filteredVehicles$!: Observable<Vehicle[]>;
  filteredPeople$!: Observable<Person[]>;
  output$!: Observable<string>;

  constructor(private dataService: DataService) {
    this.people$ = this.dataService.people$;
    this.vehicles$ = this.dataService.vehicles$;
    this.assignments$ = this.dataService.assignments$;
    
    this.filteredVehicles$ = combineLatest([
      this.assignmentVehicleControl.valueChanges.pipe(startWith('')),
      this.vehicles$
    ]).pipe(
      map(([value]) => this._filterVehicles(value || ''))
    );

    this.filteredPeople$ = combineLatest([
      this.assignmentPersonControl.valueChanges.pipe(startWith('')),
      this.people$
    ]).pipe(
      map(([value]) => this._filterPeople(value || ''))
    );

    this.output$ = combineLatest([
      this.people$,
      this.vehicles$,
      this.assignments$
    ]).pipe(
      map(() => this.dataService.generateOutput())
    );
  }

  static nameValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const words = control.value.trim().split(/\s+/);
    if (words.length < 2) {
      return { minWords: { required: 2, actual: words.length } };
    }
    return null;
  }

  static personIdValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const value = control.value.toString();
    if (!/^\d{7}$/.test(value)) {
      return { invalidPersonId: { message: 'מספר אישי חייב להיות 7 ספרות בדיוק' } };
    }
    return null;
  }

  static vehicleNumberValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const value = control.value.toString();
    if (!/^\d{5,9}$/.test(value)) {
      return { invalidVehicleNumber: { message: 'מספר רכב חייב להיות בין 5-9 ספרות' } };
    }
    return null;
  }

  private _filterVehicles(value: string): Vehicle[] {
    const filterValue = value.toLowerCase();
    return this.dataService.vehicles.filter(vehicle =>
      vehicle.designation.toLowerCase().includes(filterValue) ||
      vehicle.vehicleId.toLowerCase().includes(filterValue)
    );
  }

  private _filterPeople(value: string): Person[] {
    const filterValue = value.toLowerCase();
    return this.dataService.people.filter(person =>
      person.fullName.toLowerCase().includes(filterValue) ||
      person.idNumber.includes(filterValue)
    );
  }

  addVehicle(): void {
    if (this.vehicleDesignationControl.valid && this.vehicleIdControl.valid) {
      const designation = this.vehicleDesignationControl.value?.trim();
      const vehicleId = this.vehicleIdControl.value?.trim();
      
      if (designation && vehicleId) {
        this.dataService.addVehicle({ designation, vehicleId });
        this.vehicleDesignationControl.setValue('');
        this.vehicleIdControl.setValue('');
      }
    } else {
      this.vehicleDesignationControl.markAsTouched();
      this.vehicleIdControl.markAsTouched();
    }
  }

  removeVehicle(vehicleId: string): void {
    this.dataService.removeVehicle(vehicleId);
  }

  addPerson(): void {
    if (this.personNameControl.valid && this.personIdControl.valid) {
      const fullName = this.personNameControl.value?.trim();
      const idNumber = this.personIdControl.value?.trim();
      
      if (fullName && idNumber) {
        this.dataService.addPerson({ fullName, idNumber });
        this.personNameControl.setValue('');
        this.personIdControl.setValue('');
      }
    } else {
      this.personNameControl.markAsTouched();
      this.personIdControl.markAsTouched();
    }
  }

  removePerson(idNumber: string): void {
    this.dataService.removePerson(idNumber);
  }

  addAssignment(): void {
    const vehicleValue = this.assignmentVehicleControl.value;
    const personValue = this.assignmentPersonControl.value;
    const stay = this.assignmentStayControl.value || false;

    let vehicleId = '';
    let personId = '';

    if (typeof vehicleValue === 'string') {
      const vehicle = this.dataService.vehicles.find(v => 
        `${v.designation} ${v.vehicleId}` === vehicleValue
      );
      vehicleId = vehicle?.vehicleId || '';
    } else if (vehicleValue && typeof vehicleValue === 'object') {
      vehicleId = (vehicleValue as Vehicle).vehicleId;
    }

    if (typeof personValue === 'string') {
      const person = this.dataService.people.find(p => 
        `${p.fullName} ${p.idNumber}` === personValue
      );
      personId = person?.idNumber || '';
    } else if (personValue && typeof personValue === 'object') {
      personId = (personValue as Person).idNumber;
    }

    if (vehicleId && personId) {
      this.dataService.addAssignment({ vehicleId, personId, stay });
      this.assignmentVehicleControl.setValue('');
      this.assignmentPersonControl.setValue('');
      this.assignmentStayControl.setValue(false);
    }
  }

  displayVehicle(vehicle: Vehicle): string {
    return vehicle ? `${vehicle.designation} ${vehicle.vehicleId}` : '';
  }

  displayPerson(person: Person): string {
    return person ? `${person.fullName} ${person.idNumber}` : '';
  }

  copyOutput(): void {
    navigator.clipboard.writeText(this.dataService.generateOutput());
  }

  clearAll(): void {
    if (confirm('האם אתה בטוח שברצונך למחוק את כל הנתונים?')) {
      this.dataService.clearAll();
    }
  }

  exportData(): void {
    const data = this.dataService.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shavtzak-data.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  importData(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          this.dataService.importData(data);
        } catch (error) {
          alert('שגיאה בקריאת הקובץ');
        }
      };
      reader.readAsText(file);
    }
  }

  shareOutput(): void {
    if (navigator.share) {
      navigator.share({
        title: 'שבצק - פלט',
        text: this.dataService.generateOutput()
      });
    }
  }

  canShare(): boolean {
    return !!navigator.share;
  }
}
