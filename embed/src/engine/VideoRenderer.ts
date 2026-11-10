export class VideoRenderer {
  private videoElement: HTMLVideoElement;
  private container: HTMLElement;

  constructor(container: HTMLElement, videoSrc: string) {
    this.container = container;
    
    // Create the video element
    this.videoElement = document.createElement('video');
    this.videoElement.src = videoSrc;
    this.videoElement.loop = true;
    this.videoElement.muted = true; // Auto-play requires muted
    this.videoElement.autoplay = true;
    this.videoElement.playsInline = true;
    
    // Style the video to cover the container (like a portrait avatar)
    this.videoElement.style.width = '100%';
    this.videoElement.style.height = '100%';
    this.videoElement.style.objectFit = 'cover';
    this.videoElement.style.position = 'absolute';
    this.videoElement.style.top = '0';
    this.videoElement.style.left = '0';
    this.videoElement.style.zIndex = '1';

    // Append to container
    this.container.style.position = 'relative';
    this.container.appendChild(this.videoElement);
  }

  public play() {
    this.videoElement.play().catch(e => {
      console.warn("Autoplay was prevented by the browser:", e);
    });
  }

  public pause() {
    this.videoElement.pause();
  }
}
