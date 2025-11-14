import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy,Input } from '@angular/core';
import { IonicModule, ModalController, IonButton, IonIcon } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-car-camera-modal',
  imports: [IonicModule, CommonModule],
  template: `
    <ion-content class="bg-black relative">
      <!-- Live camera -->
      <ng-container *ngIf="!capturedPhoto; else previewTemplate">
        <video #video autoplay muted playsinline class="w-full h-full object-cover"></video>

        <!-- Controls -->
        <div class="absolute bottom-6 w-full flex justify-center gap-6 items-center">
          <!-- Flip camera -->
          <ion-button shape="round" fill="outline" color="strong" (click)="flipCamera()">
            <ion-icon name="camera-reverse"></ion-icon>
          </ion-button>

          <!-- Capture -->
          <ion-button shape="round" size="large" fill="solid" color="primary" (click)="takePhoto()">
            <ion-icon name="camera"></ion-icon>
          </ion-button>

          <!-- Close -->
          <ion-button shape="round" fill="outline" color="medium" (click)="dismiss()">
            <ion-icon name="close"></ion-icon>
          </ion-button>
        </div>
      </ng-container>

      <!-- Captured photo preview -->
      <ng-template #previewTemplate>
        <img [src]="capturedPhoto" class="w-full h-full object-cover" />

        <!-- Preview controls -->
        <div class="absolute bottom-6 w-full flex justify-center gap-6 items-center">
          <ion-button shape="round" fill="outline" color="medium" (click)="retake()">
            <ion-icon name="refresh"></ion-icon>
          </ion-button>
          <ion-button shape="round" fill="solid" color="primary" (click)="save()">
            <ion-icon name="checkmark"></ion-icon>
          </ion-button>
          <ion-button shape="round" fill="outline" color="danger" (click)="dismiss()">
            <ion-icon name="close"></ion-icon>
          </ion-button>
        </div>
      </ng-template>
    </ion-content>
  `,
})
export class CarCameraModalComponent implements AfterViewInit, OnDestroy {
  @ViewChild('video') video!: ElementRef<HTMLVideoElement>;
  capturedPhoto: string | null = null;
  private stream: MediaStream | null = null;
  private facingMode: 'user' | 'environment' = 'environment'; // default: back camera
    @Input() photoType: 'car' | 'license' = 'car'; // default is 'car'


  constructor(private modalCtrl: ModalController) {}

  ngAfterViewInit() {
    this.startCamera();
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  private async startCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: this.facingMode } }
      });
      this.video.nativeElement.srcObject = this.stream;
      await this.video.nativeElement.play();
    } catch (err) {
      console.warn('Exact facingMode failed, retrying without exact', err);
      // fallback (some devices don't support exact)
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: this.facingMode }
      });
      this.video.nativeElement.srcObject = this.stream;
      await this.video.nativeElement.play();
    }
  }

  private stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  takePhoto() {
    const videoEl = this.video?.nativeElement;
    if (!videoEl) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    this.capturedPhoto = canvas.toDataURL('image/jpeg');

    this.stopCamera();
  }

  retake() {
    this.capturedPhoto = null;
    this.startCamera();
  }

  
  save() {
  if (this.capturedPhoto) {
    const file = this.dataURLtoFile(this.capturedPhoto, 'car_photo.jpg');
    this.modalCtrl.dismiss(
      { file, preview: this.capturedPhoto }, // send both
      'saved'
    );
  }
}

private dataURLtoFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

  dismiss() {
    this.stopCamera();
    this.modalCtrl.dismiss(null, 'dismissed');
  }

  async flipCamera() {
    this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
    this.stopCamera();
    await this.startCamera();
  }


  
}
