export class STT {
  private recognition: any = null;
  private isListening: boolean = false;

  constructor() {
    // Initialize Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US'; // Adjust based on target audience
    } else {
      console.warn('[STT] Speech Recognition API is not supported in this browser.');
    }
  }

  public start(onResult: (text: string) => void, onEnd: () => void, onError: (err: any) => void) {
    if (!this.recognition) {
      onError(new Error('Speech recognition not supported'));
      return;
    }

    if (this.isListening) return;

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };

    this.recognition.onerror = (event: any) => {
      onError(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      onEnd();
    };

    this.recognition.start();
    this.isListening = true;
  }

  public stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }
}
