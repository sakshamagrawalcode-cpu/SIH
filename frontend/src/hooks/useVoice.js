import { useCallback, useRef, useState } from "react";

const LANG_CODES = {
  Hindi: "hi-IN",
  English: "en-IN",
  Gujarati: "gu-IN",
  Marathi: "mr-IN",
  Tamil: "ta-IN",
  Telugu: "te-IN",
  Bengali: "bn-IN",
};

export function useVoice(language = "Hindi") {
  const [listening, setListening] = useState(false);
  const [supported] = useState(
    () => typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
  );
  const recognitionRef = useRef(null);

  const listen = useCallback(
    ({ onResult, onEnd }) => {
      if (!supported) {
        onEnd?.();
        return;
      }
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = LANG_CODES[language] || "hi-IN";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        onResult?.(text);
      };
      recognition.onerror = () => {
        setListening(false);
        onEnd?.();
      };
      recognition.onend = () => {
        setListening(false);
        onEnd?.();
      };

      recognitionRef.current = recognition;
      setListening(true);
      recognition.start();
    },
    [language, supported]
  );

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const speak = useCallback(
    (text) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = LANG_CODES[language] || "hi-IN";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    },
    [language]
  );

  return { listen, stopListening, speak, listening, supported };
}
