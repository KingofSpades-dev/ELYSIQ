import { InputBox } from './InputBox';
import { MicButton } from './MicButton';
import { ChatClient } from '../ai/ChatClient';
import { STT } from '../voice/STT';
import { TTS } from '../voice/TTS';

export class ChatOverlay {
  private container: HTMLElement;
  private bubble: HTMLElement;
  private inputContainer: HTMLElement;
  private inputBox: InputBox;
  private micButton: MicButton;
  private isRecording: boolean = false;
  private chatClient: ChatClient;
  private loadingInterval: any = null;
  private stt: STT;
  private tts: TTS;

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    this.container.style.bottom = '20px';
    this.container.style.left = '20px';
    this.container.style.right = '20px';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.gap = '10px';
    this.container.style.zIndex = '10';

    // Inject Elysiq fonts
    if (!document.getElementById('elysiq-fonts')) {
      const link = document.createElement('link');
      link.id = 'elysiq-fonts';
      link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400;1,500;1,700&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    // Speech Bubble
    this.bubble = document.createElement('div');
    this.bubble.innerText = 'Hello! I am Elysiq. How can I help?';
    this.bubble.style.background = 'rgba(245, 240, 232, 0.85)'; // bone
    this.bubble.style.backdropFilter = 'blur(10px)';
    this.bubble.style.padding = '15px';
    this.bubble.style.borderRadius = '15px';
    this.bubble.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    this.bubble.style.color = '#1A1814'; // nearblk
    this.bubble.style.border = '1px solid rgba(212,99,58, 0.3)'; // terra outline
    this.bubble.style.fontSize = '14px';
    this.bubble.style.fontFamily = "'DM Sans', sans-serif";
    this.bubble.style.lineHeight = '1.6';
    this.bubble.style.transition = 'all 0.3s';

    // Input Container
    this.inputContainer = document.createElement('div');
    this.inputContainer.style.display = 'flex';
    this.inputContainer.style.gap = '10px';

    // Initialize Components
    this.inputBox = new InputBox();
    this.micButton = new MicButton(() => this.toggleRecording());
    this.chatClient = new ChatClient();
    this.stt = new STT();
    this.tts = new TTS();

    // Listen to Enter key in input box
    const inputEl = this.inputBox.getElement();
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.inputBox.getValue().trim() !== '') {
        this.handleUserMessage(this.inputBox.getValue());
      }
    });

    this.inputContainer.appendChild(this.inputBox.getElement());
    this.inputContainer.appendChild(this.micButton.getElement());

    this.container.appendChild(this.bubble);
    this.container.appendChild(this.inputContainer);

    parent.appendChild(this.container);
  }

  private toggleRecording() {
    if (this.isRecording) {
      this.stt.stop();
      this.isRecording = false;
      this.micButton.setRecording(false);
      return;
    }

    this.isRecording = true;
    this.micButton.setRecording(true);
    this.setBubbleText("Listening...");
    this.tts.stop(); // Stop any ongoing AI speech

    this.stt.start(
      (text) => {
        // On Result
        this.inputBox.getElement().value = text;
        this.handleUserMessage(text);
      },
      () => {
        // On End
        this.isRecording = false;
        this.micButton.setRecording(false);
      },
      (err) => {
        // On Error
        console.error('[STT Error]', err);
        this.setBubbleText("Sorry, I couldn't hear you clearly.");
        this.isRecording = false;
        this.micButton.setRecording(false);
      }
    );
  }

  private setLoading(isLoading: boolean) {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
      this.loadingInterval = null;
    }
    
    if (isLoading) {
      let count = 1;
      this.setBubbleText('.');
      this.loadingInterval = setInterval(() => {
        count = count >= 3 ? 1 : count + 1;
        this.bubble.innerText = '.'.repeat(count);
      }, 400);
    }
  }

  private async handleUserMessage(message: string) {
    this.inputBox.clear();
    this.setLoading(true);
    
    // Call the actual AI Backend using the wallet address as the userId if connected
    const userId = this.chatClient.getWalletAddress() || Math.random().toString(36).substring(7); 
    const response = await this.chatClient.sendMessage(userId, message);
    
    this.setLoading(false);
    this.setBubbleText(response.text);
    console.log(`[AI Emotion]: ${response.emotion}`);
    
    // Play audio via TTS
    this.tts.speak(response.text, response.voice);
  }

  public setWallet(address: string | null) {
    this.chatClient.setWallet(address);
    if (!address) {
      this.setBubbleText(`Wallet disconnected.`);
      return;
    }
    this.setBubbleText(`Wallet connected: ${address.substring(0, 6)}...${address.substring(address.length - 4)}`);
  }

  private setBubbleText(text: string) {
    this.bubble.innerText = text;
    // Tiny bounce animation
    this.bubble.style.transform = 'translateY(-5px)';
    setTimeout(() => {
      this.bubble.style.transform = 'translateY(0)';
    }, 150);
  }
}
