"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Sparkles, Loader2, Bot, User } from "lucide-react";
import { useChatContext } from "../context/chat-context";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: "user" | "model";
  content: string;
  citations?: string[];
}

export function ChatWidget() {
  const { isChatOpen, setIsChatOpen, problemContext } = useChatContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string>(
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : ""
  );

  useEffect(() => {
    if (!sessionIdRef.current && typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      sessionIdRef.current = crypto.randomUUID();
    }
  }, []);

  // Initial greeting logic
  useEffect(() => {
    if (isChatOpen && messages.length === 0) {
      if (problemContext) {
        setMessages([
          {
            role: "model",
            content: `Hi! I see you are working on **${problemContext.title}**. How can I help you? You can ask me to explain a step, or ask why we did a specific calculation.`,
          },
        ]);
      } else {
        setMessages([
          {
            role: "model",
            content: "Hello! I'm your **Maths Qwen3-4B Tutor** 🤖 powered by your locally fine-tuned AI model with textbook RAG. Ask me any Class 10 maths question!",
          },
        ]);
      }
    }
  }, [isChatOpen, problemContext, messages.length]);

  // MathJax Loader & Typesetter
  useEffect(() => {
    let script: HTMLScriptElement;
    if (typeof window !== "undefined" && !(window as any).MathJax) {
      (window as any).MathJax = {
        tex: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
        svg: { fontCache: 'global' },
        startup: {
          typeset: false // we will typeset manually
        }
      };
      script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // Typeset math when messages change
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).MathJax && (window as any).MathJax.typesetPromise) {
      try {
        (window as any).MathJax.typesetPromise();
      } catch (e) {
        console.error("MathJax typesetting failed", e);
      }
    }
    // Scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isChatOpen]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const newMessages = [...messages, { role: "user", content: text } as Message];
    setMessages(newMessages);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          problemContext: problemContext,
          sessionId: sessionIdRef.current,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          content: data.reply,
          citations: data.citations || [],
        },
      ]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        { role: "model", content: `**Error**: ${error.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  const suggestions = problemContext
    ? [
        "Explain this solution step-by-step",
        "Why did we use this specific formula?",
        "Can you simplify the final answer?",
      ]
    : ["What is a Cartesian product?", "Explain the types of functions.", "What is a relation?"];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Button */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="group flex items-center justify-center w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
        >
          <Sparkles className="w-7 h-7 group-hover:animate-pulse" />
        </button>
      )}

      {/* Chat Panel */}
      {isChatOpen && (
        <div className="w-[90vw] sm:w-[420px] h-[600px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight">Maths Qwen3-4B Tutor</h3>
                <p className="text-blue-100 text-xs font-medium">
                  {problemContext ? "Context Active ✨" : "Local Model + RAG ✨"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 max-w-[85%] ${
                  msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
                    msg.role === "user" ? "bg-blue-100 text-blue-700" : "bg-indigo-100 text-indigo-700"
                  }`}
                >
                  {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>
                <div className="flex flex-col gap-1 max-w-full">
                  <div
                    className={`p-3 rounded-2xl text-sm ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-tr-sm"
                        : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm markdown-body"
                    }`}
                    style={{ wordBreak: "break-word" }}
                  >
                    {msg.role === "user" ? (
                      msg.content
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({node, ...props}) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-lg font-bold mt-3 mb-1.5" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-md font-bold mt-2 mb-1" {...props} />,
                          h4: ({node, ...props}) => <h4 className="text-sm font-bold mt-2 mb-1" {...props} />,
                          p: ({node, ...props}) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2" {...props} />,
                          li: ({node, ...props}) => <li className="mb-1" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />
                        }}
                      >
                        {msg.content.replace(/^\\?#{1,6}\s+(.*)$/gm, '**$1**')}
                      </ReactMarkdown>
                    )}
                  </div>
                  {/* Citation pills for bot messages */}
                  {msg.role === "model" && msg.citations && msg.citations.length > 0 && (
                    <div className="flex flex-col gap-1 mt-1 max-w-full">
                      {msg.citations.slice(0, 2).map((cite, cidx) => (
                        <span
                          key={cidx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-medium rounded-full truncate max-w-[260px]"
                          title={cite}
                        >
                          📖 {cite.length > 50 ? cite.substring(0, 50) + '...' : cite}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 mr-auto max-w-[85%]">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-sm">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="p-4 bg-white border border-gray-200 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span className="text-sm text-gray-500 font-medium">Generating answer...</span>
                </div>
              </div>
            )}
            
            {/* Suggestions */}
            {messages.length === 1 && !isLoading && (
              <div className="flex flex-col gap-2 mt-2">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(suggestion)}
                    className="text-left px-4 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-sm font-medium rounded-xl transition-colors self-start max-w-[90%]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-100 shrink-0">
            <div className="relative flex items-center">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask your math doubt..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-12 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none max-h-[120px]"
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={() => handleSendMessage(inputValue)}
                disabled={isLoading || !inputValue.trim()}
                className="absolute right-2 p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
