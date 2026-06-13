import { Component, output, viewChild, ElementRef } from '@angular/core';
import { LucideAngularModule, Plus } from 'lucide-angular';
import { SUPPORTED_FILE_EXTENSIONS } from '../../../../core/constants/storage.constants';

@Component({
  selector: 'app-import-fab',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './import-fab.component.html',
})
export class ImportFabComponent {
  /** Emits the File selected by the user. */
  readonly fileSelected = output<File>();

  protected readonly fileInputRef = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  /** Icon reference for lucide-angular. */
  protected readonly plusIcon = Plus;

  /** Accepted file type string for the hidden file input. */
  protected readonly acceptedFileTypes = SUPPORTED_FILE_EXTENSIONS.map((ext) => `.${ext.replace('.', '')}`).join(',');

  protected openFilePicker(): void {
    this.fileInputRef().nativeElement.click();
  }

  protected onFileChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const selectedFile = inputElement.files?.[0];
    if (selectedFile) {
      this.fileSelected.emit(selectedFile);
      inputElement.value = '';
    }
  }
}
