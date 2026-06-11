"use client";
import React, { useState, useRef, useEffect } from 'react';
import styles from './page.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrophone } from '@fortawesome/free-solid-svg-icons';

export default function VoiceChatbot() {
  const [chatHistory, setChatHistory] = useState([]);
  const [question, setQuestion] = useState('');
  const [generatingAnswer, setGeneratingAnswer] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'bn-BD';

      recognitionRef.current.onresult = (event) => {
        setQuestion(event.results[0][0].transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => setIsListening(false);
    }
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, generatingAnswer]);

  const startVoiceInput = () => {
    if (recognitionRef.current) {
      setIsListening(true);
      recognitionRef.current.start();
    } else {
      alert('Speech recognition not supported');
    }
  };

  async function generateAnswer(e) {
    e.preventDefault();
    if (!question.trim()) return;

    setGeneratingAnswer(true);
    const currentQuestion = question;
    setQuestion('');

    setChatHistory(prev => [...prev, { type: 'question', content: currentQuestion }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentQuestion }),
      });

      if (!res.ok) throw new Error('Request failed');

      const data = await res.json();
      setChatHistory(prev => [
        ...prev,
        { type: 'answer', content: data.response, sources: data.sources ?? [] },
      ]);
    } catch (error) {
      console.error(error);
      setChatHistory(prev => [...prev, {
        type: 'answer',
        content: "দুঃখিত, কিছু সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন!",
        sources: [],
      }]);
    }

    setGeneratingAnswer(false);
  }

  return (
    <div className={styles.chatbotContainer}>
      <div className={styles.chatbotWrapper}>
        <div className={styles.chatbotCard}>
          <div className={styles.chatbotHeader}>
            <h1>একুশে AI</h1>
            <p>আপনার কথোপকথন সঙ্গী</p>
          </div>

          <div ref={chatContainerRef} className={styles.chatContainer}>
            {chatHistory.map((chat, index) => (
              <div
                key={index}
                className={`${styles.chatMessage} ${chat.type === 'question' ? styles.questionMessage : styles.answerMessage}`}
              >
                <div className={styles.messageContent}>
                  <p className={styles.messageText}>{chat.content}</p>

                  {chat.type === 'answer' && chat.sources?.length > 0 && (
                    <div className={styles.sources}>
                      <span className={styles.sourcesLabel}>তথ্যসূত্র:</span>
                      <div className={styles.sourceChips}>
                        {chat.sources.map((src) => (
                          <a
                            key={src}
                            href={`https://bn.wikipedia.org/wiki/${encodeURIComponent(src)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.sourceChip}
                          >
                            {src}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {generatingAnswer && (
              <div className={styles.thinkingIndicator}>
                চিন্তা করছে...
              </div>
            )}
          </div>

          <form onSubmit={generateAnswer} className={styles.inputForm}>
            <div className={styles.inputWrapper}>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="আমাকে কিছু জিজ্ঞেস করুন..."
                rows={2}
                disabled={generatingAnswer}
                className={styles.inputTextarea}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    generateAnswer(e);
                  }
                }}
              />
              <div className={styles.buttonGroup}>
                <button
                  type="submit"
                  disabled={generatingAnswer}
                  className={styles.sendButton}
                >
                  পাঠান
                </button>
                <button
                  type="button"
                  onClick={startVoiceInput}
                  disabled={generatingAnswer || isListening}
                  className={`${styles.voiceButton} ${isListening ? styles.listeningButton : ''}`}
                >
                  <FontAwesomeIcon icon={faMicrophone} />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
