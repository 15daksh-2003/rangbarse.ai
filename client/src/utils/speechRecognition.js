export class SpeechRecognitionWrapper {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.onTrigger = null;
  }

  init(onTrigger) {
    this.onTrigger = onTrigger;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Web Speech API not supported');
      return false;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-IN';

    this.recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        if (this.matchesPhrase(transcript)) {
          this.onTrigger();
          this.stop();
          return;
        }
      }
    };

    this.recognition.onerror = () => {};

    return true;
  }

  matchesPhrase(transcript) {
    const targets = ['holi hai', 'holy hai', 'holi hi', 'holy hi', 'holihai', 'holyhai'];
    return targets.some(t => transcript.includes(t));
  }

  start() {
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
        this.isListening = true;
      } catch {}
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {}
      this.isListening = false;
    }
  }
}
