export class TTS {
  private synth: SpeechSynthesis;

  constructor() {
    this.synth = window.speechSynthesis;
    if (!this.synth) {
      console.warn('[TTS] Speech Synthesis API is not supported in this browser.');
    }
  }

  public speak(text: string, voiceName: string = 'elysiq_default') {
    if (!this.synth) return;

    // Optional: map your backend 'voice' property to a specific browser voice if available
    // For now, this acts as the "Mock ELYSIQ TTS" using the browser's built-in voices.

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Attempt to pick a nice English male voice to simulate a deep male Elysiq
    const voices = this.synth.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Male') || v.name.toLowerCase().includes('guy') || v.name.includes('Google UK English Male') || v.name.includes('Daniel')));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.rate = 0.95; // Slightly slower, more grounded pace
    utterance.pitch = 0.8; // Lower pitch for a deep male voice
    utterance.volume = 0.6; // Slightly quieter volume as requested

    this.synth.cancel(); // Stop any currently playing audio
    this.synth.speak(utterance);
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }
}
