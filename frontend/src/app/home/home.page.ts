import { Component, ElementRef,ViewChild,} from '@angular/core';
import {
  ToastController,

} from '@ionic/angular';

import { IonicModule } from '@ionic/angular';


import { ActionSheetController } from '@ionic/angular/standalone';


import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { CommonModule } from '@angular/common';
import { ModalController } from '@ionic/angular/standalone';
import { CarCameraModalComponent } from '../car-camera-modal/car-camera-modal.component';
import { Router, ActivatedRoute } from '@angular/router';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';





@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [CommonModule],
  providers: [ModalController,IonicModule, ToastController],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]


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
    private actionSheetCtrl: ActionSheetController,
    private modalCtrl: ModalController,
    private router: Router,
  ) {}

  ngOnInit() {}

  // Open Action Sheet for each photo or Add Photo button
async openPhotoActionSheet(stage: 'pickup' | 'return', index: number) {
  console.log('ActionSheetController:', this.actionSheetCtrl);

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
    console.log("download pdf")
    // Replace '/report' with your actual route
    this.router.navigate(['/report']);
  }

  // Navigate to the Dashboard page
  goToDashboard() {
    console.log("go to dashboard")
    // Replace '/dashboard' with your actual route
    this.router.navigate(['/home']);
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



dataURLtoFile(dataurl: string, filename: string) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while(n--){
      u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, {type:mime});
}



async uploadPhotosToHF(files: File[]): Promise<string[]> {
  const formData = new FormData();
  files.forEach(file => formData.append("files", file));

  const res = await fetch("https://nouhal-damage-data-space.hf.space/upload", {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  return data.uploaded;  // contains URLs
}

async uploadAllPhotos() {
  const pickupFiles = this.pickupPhotos.map((p, i) => 
    this.dataURLtoFile(p, `pickup-${i}.jpg`)
  );
  const returnFiles = this.returnPhotos.map((p, i) => 
    this.dataURLtoFile(p, `return-${i}.jpg`)
  );

  const allFiles = [...pickupFiles, ...returnFiles];

  const urls = await this.uploadPhotosToHF(allFiles);
  console.log("Uploaded URLs:", urls);
}


async detectDamage(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("https://nouhal-damage-data-space.hf.space/compare", {
    method: "POST",
    body: form
  });
  return await res.json();
}



async compareDamage() {
  const pickupResults: any[] = [];
  const returnResults: any[] = [];

  for (let i = 0; i < this.pickupPhotos.length; i++) {
    const file = this.dataURLtoFile(this.pickupPhotos[i], `pickup-${i}.jpg`);
    pickupResults.push(await this.detectDamage(file));
  }

  for (let i = 0; i < this.returnPhotos.length; i++) {
    const file = this.dataURLtoFile(this.returnPhotos[i], `return-${i}.jpg`);
    returnResults.push(await this.detectDamage(file));
  }

  console.log("Pickup damage results:", pickupResults);
  console.log("Return damage results:", returnResults);

  // Return structured results for comparison
  return pickupResults.map((pickup, i) => {
    const ret = returnResults[i] || { prediction: [] };
    // Example: find new damages that are in return but not in pickup
    const newDamages = ret.prediction.filter((r: any) => 
      !pickup.prediction.some((p: any) =>
        p.x === r.x && p.y === r.y && p.width === r.width && p.height === r.height
      )
    );
    return {
      pickupDamage: pickup.prediction,
      returnDamage: ret.prediction,
      newDamages,
    };
  });
}


@ViewChild('damageCanvas', { static: false })
damageCanvas!: ElementRef<HTMLCanvasElement>;

// async compareDamagePhotos() {
//   if (!this.pickupPhotos[0] || !this.returnPhotos[0]) {
//     alert("Please add both pickup and return photos.");
//     return;
//   }

//   const pickupFile = this.dataURLtoFile(this.pickupPhotos[0], 'pickup.jpg');
//   const returnFile = this.dataURLtoFile(this.returnPhotos[0], 'return.jpg');

//   const formData = new FormData();
//   formData.append("pickup", pickupFile);
//   formData.append("return_", returnFile);

//   // Call FastAPI /compare
//   const res = await fetch("https://nouhal-damage-data-space.hf.space/compare", {
//     method: "POST",
//     body: formData
//   });

//   const data = await res.json();
//   console.log("Comparison result:", data);

//   // Draw return image and highlight new damages
//   const canvasEl = this.damageCanvas.nativeElement;
//   const ctx = canvasEl.getContext('2d')!;
//   const img = new Image();
//   img.src = this.returnPhotos[0];

//   img.onload = () => {
//     canvasEl.width = img.width;
//     canvasEl.height = img.height;
//     ctx.drawImage(img, 0, 0, img.width, img.height);

//     data.new_damages.forEach((box: any) => {
//       ctx.strokeStyle = 'red';
//       ctx.lineWidth = 3;
//       ctx.strokeRect(box.x, box.y, box.width, box.height);
//     });
//   };
// }

async compareDamagePhotos() {
  if (!this.pickupPhotos[0] || !this.returnPhotos[0]) {
    alert("Please add both pickup and return photos.");
    return;
  }

  const pickupFile = this.dataURLtoFile(this.pickupPhotos[0], 'pickup.jpg');
  const returnFile = this.dataURLtoFile(this.returnPhotos[0], 'return.jpg');

  const formData = new FormData();
  formData.append("pickup", pickupFile);
  formData.append("return_", returnFile);

  // Call FastAPI /compare endpoint
  const response = await fetch("https://nouhal-damage-data-space.hf.space/compare", {
    method: "POST",
    body: formData,
  });

  const result = await response.json();
  console.log("COMPARE RESULT:", result);

  if (result.error) {
    alert("Error: " + result.error);
    return;
  }

  const newDamages = result.new_damages || [];

  // ===== Draw the return image =====
  const canvas = this.damageCanvas.nativeElement;
  const ctx = canvas.getContext("2d")!;
  const img = new Image();
  img.src = this.returnPhotos[0];

  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;

    ctx.drawImage(img, 0, 0, img.width, img.height);

    // ===== Draw bounding boxes =====
    newDamages.forEach((boxObj: any) => {
      const box = boxObj.box;      // The backend gives: {box:{x,y,w,h}}

      ctx.strokeStyle = "red";
      ctx.lineWidth = 3;
      ctx.strokeRect(box.x, box.y, box.w, box.h);
    });
  };
}





}
