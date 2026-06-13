import { Component, inject } from '@angular/core';
import { LucideAngularModule, CheckCircle, XCircle, Info, X } from 'lucide-angular';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './toast.component.html',
})
export class ToastComponent {
  protected readonly toastService = inject(ToastService);

  protected readonly checkIcon = CheckCircle;
  protected readonly errorIcon = XCircle;
  protected readonly infoIcon = Info;
  protected readonly closeIcon = X;
}
