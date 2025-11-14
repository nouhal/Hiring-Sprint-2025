import { Component, ElementRef,ViewChild,} from '@angular/core';
import {
  IonicModule,
  ToastController,
  ActionSheetController,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
} from '@ionic/angular';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { CommonModule } from '@angular/common';
import { ModalController } from '@ionic/angular';
import { CarCameraModalComponent } from '../car-camera-modal/car-camera-modal.component';
import { Router, ActivatedRoute } from '@angular/router';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class HomePage {
  // Arrays to hold photos for each stage
  pickupPhotos: string[] = [];
  returnPhotos: string[] = [];

  activePhotoIndex: number | null = null;
  @ViewChild('carsFileInput')
  carsFileInput!: ElementRef<HTMLInputElement>;
  activeStageForGallery: 'pickup' | 'return' | null = null; // <-- add this line


  constructor(
    private toastCtrl: ToastController,
    private sanitizer: DomSanitizer,
    private actionSheetCtrl: ActionSheetController,
    private modalCtrl: ModalController,
    private router: Router,

  ) {}

  ngOnInit() {}

  // Open Action Sheet for each photo or Add Photo button
async openPhotoActionSheet(stage: 'pickup' | 'return', index: number) {
  const actionSheet = await this.actionSheetCtrl.create({
    header: 'Photo Actions',
    buttons: [
      { text: 'Take Photo', icon: 'camera-outline', handler: () => this.openCameraModal(stage) },
      { text: 'Choose from Gallery', icon: 'image-outline', handler: () => this.pickFromGallery(stage) },
      ...(index >= 0
        ? [{ text: 'Delete', icon: 'trash-outline', role: 'destructive', handler: () => this.deletePhoto(stage, index) }]
        : []),
      { text: 'Cancel', icon: 'close-outline', role: 'cancel' },
    ],
  });

  await actionSheet.present();
}

// Open camera modal
async openCameraModal(stage: 'pickup' | 'return') {
  const modal = await this.modalCtrl.create({
    component: CarCameraModalComponent,
    componentProps: { photoType: stage },
  });

  modal.onDidDismiss().then((res) => {
    if (res.role === 'saved' && res.data) {
      const targetArray = stage === 'pickup' ? this.pickupPhotos : this.returnPhotos;
      targetArray.push(res.data.preview); // store DataURL
    }
  });

  await modal.present();
}

// Pick from gallery
pickFromGallery(stage: 'pickup' | 'return') {
  this.carsFileInput.nativeElement.click();
  this.activeStageForGallery = stage; // store which stage the photo is for
}

// Handle gallery file input
onPhotoSelected(event: Event) {
  const stage = this.activeStageForGallery;
  if (!stage) return;

  const files = (event.target as HTMLInputElement).files;
  if (!files || files.length === 0) return;

  const reader = new FileReader();
  reader.onload = () => {
    const targetArray = stage === 'pickup' ? this.pickupPhotos : this.returnPhotos;
    targetArray.push(reader.result as string);
  };
  reader.readAsDataURL(files[0]);

  this.activeStageForGallery = null; // reset
}

// Delete photo
deletePhoto(stage: 'pickup' | 'return', index: number) {
  const targetArray = stage === 'pickup' ? this.pickupPhotos : this.returnPhotos;
  targetArray.splice(index, 1);
}

// Navigate to the Report page
  goToReport() {
    // Replace '/report' with your actual route
    this.router.navigate(['/report']);
  }

  // Navigate to the Dashboard page
  goToDashboard() {
    // Replace '/dashboard' with your actual route
    this.router.navigate(['/dashboard']);
  }

  // Generate a PDF report
  downloadReport() {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('Vehicle Condition Report', 10, 10);

    // Example: add text
    doc.setFontSize(12);
    doc.text(`Pickup Photos: ${this.pickupPhotos.length}`, 10, 20);
    doc.text(`Return Photos: ${this.returnPhotos.length}`, 10, 30);

    // Example: add images (if base64)
    this.pickupPhotos.forEach((photo, i) => {
      doc.addImage(photo, 'JPEG', 10, 40 + i * 50, 50, 50);
    });

    this.returnPhotos.forEach((photo, i) => {
      doc.addImage(photo, 'JPEG', 70, 40 + i * 50, 50, 50);
    });

    doc.save('vehicle-report.pdf');
  }
}
