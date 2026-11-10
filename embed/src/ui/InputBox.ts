export class InputBox {
  private element: HTMLInputElement;

  constructor(placeholder: string = 'Type a message...') {
    this.element = document.createElement('input');
    this.element.type = 'text';
    this.element.placeholder = placeholder;
    this.element.style.flex = '1';
    this.element.style.padding = '10px 15px';
    this.element.style.borderRadius = '20px';
    this.element.style.border = '1px solid #E3DDD2'; // bone3
    this.element.style.background = 'rgba(245, 240, 232, 0.8)'; // bone with opacity
    this.element.style.outline = 'none';
    this.element.style.backdropFilter = 'blur(10px)';
    this.element.style.transition = 'all 0.2s';
    this.element.style.color = '#1A1814'; // nearblk
    this.element.style.fontFamily = "'DM Sans', sans-serif";
    this.element.style.fontSize = '14px';
    this.element.onfocus = () => {
      this.element.style.background = 'rgba(245, 240, 232, 1)';
      this.element.style.border = '1px solid #D4633A'; // terra
    };

    this.element.onblur = () => {
      this.element.style.background = 'rgba(245, 240, 232, 0.8)';
      this.element.style.border = '1px solid #E3DDD2';
    };
  }

  public getElement(): HTMLInputElement {
    return this.element;
  }

  public getValue(): string {
    return this.element.value;
  }

  public clear(): void {
    this.element.value = '';
  }
}
