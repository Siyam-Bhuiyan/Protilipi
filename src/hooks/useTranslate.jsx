import { useEffect, useState } from "react";

const useTranslate = (sourceText, selectedLanguage) => {
  const [targetText, setTargetText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleTranslate = async () => {
      if (!sourceText.trim()) {
        setTargetText("");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: sourceText, targetLanguage: selectedLanguage }),
        });

        if (!res.ok) throw new Error("Translation request failed");

        const data = await res.json();
        setTargetText(data.translated);
      } catch (err) {
        console.error("Error translating text:", err);
        setError("Translation failed. Please try again.");
        setTargetText("");
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(handleTranslate, 500);
    return () => clearTimeout(timeoutId);
  }, [sourceText, selectedLanguage]);

  return { targetText, isLoading, error };
};

export default useTranslate;
