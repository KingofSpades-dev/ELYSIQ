export class MicButton {
  private element: HTMLButtonElement;
  private isRecording: boolean = false;

  constructor(onClick: () => void) {
    this.element = document.createElement('button');
    this.element.innerText = '🎤';
    this.element.style.padding = '10px 15px';
    this.element.style.borderRadius = '50%';
    this.element.style.border = 'none'; // Removed outline
    this.element.style.background = '#1A1814'; // Nearblk background
    this.element.style.color = '#D4633A'; // Terra icon color
    this.element.style.cursor = 'pointer';
    this.element.style.transition = 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
    this.element.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.3)';

    this.element.onmouseenter = () => {
      if (!this.isRecording) this.element.style.transform = 'scale(1.1)';
    };
    this.element.onmouseleave = () => {
      if (!this.isRecording) this.element.style.transform = 'scale(1)';
    };

    this.element.onclick = () => {
      onClick();
    };
  }

  public getElement(): HTMLButtonElement {
    return this.element;
  }

  public setRecording(state: boolean): void {
    this.isRecording = state;
    if (state) {
      this.element.style.background = '#D4633A'; // Active: Terra background
      this.element.style.color = '#1A1814'; // Active: Black icon
      this.element.style.border = 'none'; // Removed outline
      this.element.style.boxShadow = '0 0 15px rgba(212,99,58, 0.6)';
      this.element.style.transform = 'scale(1.15)';
    } else {
      this.element.style.background = '#1A1814'; // Inactive: Nearblk
      this.element.style.color = '#D4633A'; // Inactive: Terra icon
      this.element.style.border = 'none'; // Removed outline
      this.element.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.3)';
      this.element.style.transform = 'scale(1)';
    }
  }
}
