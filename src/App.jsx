import { useState, useRef, useEffect } from "react";
import "./App.css";
import axios from "axios";
import ReactMarkdown from "react-markdown";

// Knowledge base for product information
const productDatabase = {
  smartphones: {
    "iPhone 15 Pro": {
      specs: "6.1-inch display, A17 Pro chip, 48MP camera, 256GB storage",
      price: "₹1,29,900",
      warranty: "1 year standard warranty"
    },
    "iPhone 15 Pro Max": {
      specs: "6.7-inch display, A17 Pro chip, 48MP camera, 256GB storage, Titanium design",
      price: "₹1,59,900",
      warranty: "1 year standard warranty"
    },
    "Samsung Galaxy S24": {
      specs: "6.2-inch display, Snapdragon 8 Gen 3, 50MP camera, 256GB storage",
      price: "₹79,999",
      warranty: "1 year standard warranty"
    }
  },
  laptops: {
    "MacBook Air M2": {
      specs: "13.6-inch display, M2 chip, 8GB RAM, 256GB SSD",
      price: "₹1,14,900",
      warranty: "1 year standard warranty"
    },
    "MacBook Pro M3": {
      specs: "14-inch display, M3 chip, 16GB RAM, 512GB SSD",
      price: "₹1,99,900",
      warranty: "1 year standard warranty"
    },
    "Dell XPS 15": {
      specs: "15.6-inch display, Intel i9, 32GB RAM, 1TB SSD",
      price: "₹1,79,990",
      warranty: "1 year standard warranty"
    }
  }
};

// Company policies
const companyPolicies = {
  returnPolicy: "30-day return policy for unused items in original packaging",
  paymentMethods: "We accept UPI, debit/credit cards, net banking, and popular wallets like Paytm and PhonePe.",
  shipping: "Free shipping on orders over ₹2,000, 2-3 business days delivery",
  warranty: "1 year standard warranty on all products, extendable up to 3 years"
};

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

console.log('OpenAI Key:', OPENAI_API_KEY);

function App() {
  const [chatHistory, setChatHistory] = useState([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [generatingAnswer, setGeneratingAnswer] = useState(false);
  const [context, setContext] = useState({ lastTopic: null, productType: null });

  const chatContainerRef = useRef(null);

  // Predefined questions for quick buttons
  const quickQuestions = {
    specs: "What are the specifications of your latest products?",
    order: "How can I track my order?",
    return: "What is your return policy?",
    payment: "What payment methods do you accept?"
  };

  // FAQ answers for quick buttons
  const quickAnswers = {
    specs: null, // handled by generateResponse
    order: "You can track your order by logging into your account on our website and visiting the 'My Orders' section. You will find real-time updates and tracking links for your shipments. If you need further assistance, please provide your order number.",
    return: "Our return policy allows you to return unused items in their original packaging within 30 days of delivery. To initiate a return, go to your order history and select the item you wish to return, or contact our support team for help.",
    payment: "We accept UPI, debit/credit cards, net banking, and popular wallets like Paytm and PhonePe. All transactions are secured and encrypted for your safety. If you have questions about a specific payment method, please ask!"
  };

  // Home button handler
  const handleHome = () => {
    setChatHistory([]);
    setQuestion("");
    setAnswer("");
    setContext({ lastTopic: null, productType: null });
  };

  // Handler for quick question buttons
  const handleQuickQuestion = async (type) => {
    setQuestion(quickQuestions[type]);
    // Set context for multi-turn conversation
    setContext(prev => ({ ...prev, lastTopic: type }));
    // Simulate form submit with a direct answer if available
    if (quickAnswers[type]) {
      setChatHistory(prev => [...prev, { type: 'question', content: quickQuestions[type] }]);
      setGeneratingAnswer(true);
      setTimeout(() => {
        setChatHistory(prev => [...prev, { type: 'answer', content: quickAnswers[type] }]);
        setAnswer(quickAnswers[type]);
        setGeneratingAnswer(false);
      }, 600);
    } else {
      await generateAnswer({ preventDefault: () => {} }, quickQuestions[type]);
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, generatingAnswer]);

  // Function to process user input and maintain context
  const processUserInput = (input) => {
    const lowerInput = input.toLowerCase();
    
    // Check for product-related queries
    if (lowerInput.includes("iphone") || lowerInput.includes("samsung")) {
      setContext(prev => ({ ...prev, productType: "smartphones" }));
    } else if (lowerInput.includes("macbook") || lowerInput.includes("dell")) {
      setContext(prev => ({ ...prev, productType: "laptops" }));
    }

    // Check for policy-related queries
    if (lowerInput.includes("return") || lowerInput.includes("refund")) {
      setContext(prev => ({ ...prev, lastTopic: "returnPolicy" }));
    } else if (lowerInput.includes("payment") || lowerInput.includes("pay")) {
      setContext(prev => ({ ...prev, lastTopic: "paymentMethods" }));
    } else if (lowerInput.includes("warranty")) {
      setContext(prev => ({ ...prev, lastTopic: "warranty" }));
    }
  };

  // Function to generate a response based on context and knowledge base
  const generateResponse = (input) => {
    const lowerInput = input.toLowerCase();

    // If the user asks for latest or all products, show all
    if (
      lowerInput.includes("latest products") ||
      lowerInput.includes("all products") ||
      lowerInput.includes("all your products") ||
      lowerInput.includes("specifications of your products")
    ) {
      let response = "Here are the specifications for our latest products:\n";
      for (const [category, products] of Object.entries(productDatabase)) {
        for (const [product, details] of Object.entries(products)) {
          response += `\n**${product}**\n`;
          response += Object.entries(details)
            .map(([key, value]) => `${key}: ${value}`)
            .join("\n");
          response += "\n";
        }
      }
      return response;
    }

    // Check product specifications (single product, exact match)
    for (const [category, products] of Object.entries(productDatabase)) {
      for (const [product, details] of Object.entries(products)) {
        if (lowerInput.includes(product.toLowerCase())) {
          return `Here are the specifications for ${product}:\n${Object.entries(details)
            .map(([key, value]) => `${key}: ${value}`)
            .join("\n")}`;
        }
      }
    }

    // Check company policies
    for (const [policy, details] of Object.entries(companyPolicies)) {
      if (lowerInput.includes(policy.toLowerCase())) {
        return details;
      }
    }

    // If no specific match, use the fallback
    return null;
  };

  async function generateAnswer(e, customQuestion) {
    if (e && e.preventDefault) e.preventDefault();
    const q = customQuestion !== undefined ? customQuestion : question;
    if (!q.trim()) return;
    setGeneratingAnswer(true);
    setQuestion("");
    setChatHistory(prev => [...prev, { type: 'question', content: q }]);
    // Use local knowledge base first
    let answer = generateResponse(q);
    if (!answer) {
      // If OpenAI API key is set, use LLM for fallback
      if (OPENAI_API_KEY) {
        try {
          const response = await axios({
            url: "https://api.openai.com/v1/chat/completions",
            method: "post",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${OPENAI_API_KEY}`,
            },
            data: {
              model: "gpt-3.5-turbo",
              messages: [
                {
                  role: "system",
                  content: `You are a helpful customer support agent for an electronics company. Answer the user's question as best as you can.`
                },
                {
                  role: "user",
                  content: q
                }
              ],
              max_tokens: 256,
              temperature: 0.2
            }
          });
          answer = response.data.choices[0].message.content;
        } catch (error) {
          console.error('OpenAI API error:', error);
          if (error.response && error.response.status === 429) {
            answer = "We're getting a lot of questions right now! Please wait a moment and try again. (OpenAI rate limit reached)";
          } else {
            answer = "I'm sorry, I couldn't find an exact answer to your question and our AI assistant is currently unavailable. Please ask about our products, order tracking, payment methods, or return policy!";
          }
        }
      } else {
        answer = "I'm sorry, I couldn't find an exact answer to your question. Please ask about our products, order tracking, payment methods, or return policy!";
      }
    }
    setTimeout(() => {
      setChatHistory(prev => [...prev, { type: 'answer', content: answer }]);
      setAnswer(answer);
      setGeneratingAnswer(false);
    }, 600); // Simulate thinking
  }

  return (
    <div className="fixed inset-0 bg-blue-50 flex items-center justify-center min-h-screen">
      <div className="w-full max-w-6xl h-[90vh] bg-white rounded-2xl shadow-2xl flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-1/3 min-w-[300px] bg-blue-100 p-8 flex flex-col justify-between border-r border-blue-200">
          <div>
            <h2 className="text-2xl font-extrabold text-blue-700 mb-2">Need help with our products?</h2>
            <p className="text-blue-900 mb-6">Get instant answers about our smartphones, laptops, and accessories, or learn about our policies on returns, shipping, and warranties.<br/><br/>Our ProductAI assistant is available 24/7 to help you with any questions you might have.</p>
            <div className="mb-6">
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="font-bold text-blue-700 mb-2">Why use our chat assistant?</h3>
                <ul className="text-blue-900 text-sm space-y-2">
                  <li>✔️ Get instant answers to your questions</li>
                  <li>✔️ Available 24/7, no waiting time</li>
                  <li>✔️ Find specific product information and comparisons</li>
                  <li>✔️ Learn about our policies and procedures</li>
                </ul>
              </div>
            </div>
            <div className="space-y-3">
              <button className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg shadow hover:bg-blue-700 transition" onClick={() => handleQuickQuestion('specs')}>
                📱 Product Specifications
              </button>
              <button className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg shadow hover:bg-blue-700 transition" onClick={() => handleQuickQuestion('order')}>
                📦 Order Tracking
              </button>
              <button className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg shadow hover:bg-blue-700 transition" onClick={() => handleQuickQuestion('return')}>
                🔄 Return Policy
              </button>
              <button className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg shadow hover:bg-blue-700 transition" onClick={() => handleQuickQuestion('payment')}>
                💳 Payment Methods
              </button>
            </div>
          </div>
          <div className="text-center text-xs text-blue-400 mt-8">&copy; {new Date().getFullYear()} ProductAI</div>
        </aside>
        {/* Chat Area */}
        <main className="flex-1 flex flex-col h-full">
          {/* Chat Header */}
          <header className="flex items-center gap-3 px-6 py-4 border-b border-blue-100 bg-white shadow-sm">
            <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center text-2xl font-bold text-blue-700 shadow">
              <span role="img" aria-label="robot">🤖</span>
            </div>
            <div>
              <div className="font-bold text-blue-700 text-lg">ProductAI</div>
              <div className="text-xs text-blue-400">TechPro Customer Support</div>
            </div>
            <button
              onClick={handleHome}
              className="ml-auto px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 font-bold rounded-lg shadow hover:bg-blue-100 transition"
              title="Go Home"
            >
              Home
            </button>
          </header>
          {/* Chat History */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto px-6 py-4 bg-blue-50"
          >
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="bg-white rounded-xl p-8 max-w-2xl shadow-md">
                  <h2 className="text-2xl font-extrabold text-blue-700 mb-4">Welcome to ProductAI! <span className='inline-block'>🤖</span></h2>
                  <p className="text-blue-700 mb-4">
                    I can help you with:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    <button className="bg-blue-100 p-4 rounded-lg shadow-sm w-full text-left hover:bg-blue-200 transition font-semibold border border-blue-200" onClick={() => handleQuickQuestion('specs')}>
                      <span className="text-blue-500">📱</span> Product Specifications
                    </button>
                    <button className="bg-blue-100 p-4 rounded-lg shadow-sm w-full text-left hover:bg-blue-200 transition font-semibold border border-blue-200" onClick={() => handleQuickQuestion('order')}>
                      <span className="text-blue-500">📦</span> Order Tracking
                    </button>
                    <button className="bg-blue-100 p-4 rounded-lg shadow-sm w-full text-left hover:bg-blue-200 transition font-semibold border border-blue-200" onClick={() => handleQuickQuestion('return')}>
                      <span className="text-blue-500">🔄</span> Return Policy
                    </button>
                    <button className="bg-blue-100 p-4 rounded-lg shadow-sm w-full text-left hover:bg-blue-200 transition font-semibold border border-blue-200" onClick={() => handleQuickQuestion('payment')}>
                      <span className="text-blue-500">💳</span> Payment Methods
                    </button>
                  </div>
                  <p className="text-blue-500 mt-6 text-sm">
                    How can I assist you today?
                  </p>
                </div>
              </div>
            ) : (
              <>
                {chatHistory.map((chat, index) => (
                  <div key={index} className={`mb-4 flex ${chat.type === 'question' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`inline-block max-w-[70%] p-4 rounded-2xl font-medium shadow-md transition-all duration-200
                      ${chat.type === 'question' 
                        ? 'bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-br-none'
                        : 'bg-white text-blue-900 border border-blue-100 rounded-bl-none'}
                    `}>
                      <ReactMarkdown className="overflow-auto hide-scrollbar">{chat.content}</ReactMarkdown>
                    </div>
                  </div>
                ))}
              </>
            )}
            {generatingAnswer && (
              <div className="flex justify-start">
                <div className="inline-block bg-white p-3 rounded-lg animate-pulse text-blue-700 font-semibold">
                  ProductAI is thinking...
                </div>
              </div>
            )}
          </div>
          {/* Input Form */}
          <form onSubmit={generateAnswer} className="bg-white border-t border-blue-100 px-6 py-4 flex gap-2 items-center">
            <textarea
              required
              className="flex-1 border border-blue-200 rounded p-3 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 resize-none bg-white text-blue-900 font-medium"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask me anything about our products or services..."
              rows="2"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  generateAnswer(e);
                }
              }}
            ></textarea>
            <button
              type="submit"
              className={`px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-md font-bold shadow hover:from-blue-700 hover:to-blue-500 transition-colors ${
                generatingAnswer ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={generatingAnswer}
            >
              Send
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}

export default App;
