import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { CarCameraModalComponent } from './car-camera-modal.component';

describe('CarCameraModalComponent', () => {
  let component: CarCameraModalComponent;
  let fixture: ComponentFixture<CarCameraModalComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [CarCameraModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CarCameraModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
