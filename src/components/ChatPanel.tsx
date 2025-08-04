import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Send, 
  Copy, 
  RotateCcw, 
  Edit3, 
  Trash2, 
  User, 
  Bot,
  Loader2,
  Plus,
  Paperclip,
  HardDrive,
  Code,
  Mic,
  Settings,
  Github,
  ImageIcon,
  Lightbulb,
  Wifi,
  PaintBucket,
  ChevronDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isEditing?: boolean;
}

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  onEditMessage: (id: string, newContent: string) => void;
  onDeleteMessage: (id: string) => void;
  onRegenerateResponse: (id: string) => void;
  onToggleGithubSearch?: () => void;
  isLoading: boolean;
  inputRef?: React.RefObject<HTMLTextAreaElement>;
}

export const ChatPanel = ({
  messages,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onRegenerateResponse,
  onToggleGithubSearch,
  isLoading,
  inputRef,
}: ChatPanelProps) => {
  const [input, setInput] = useState('');
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showAttachMenu && !(event.target as Element).closest('.attach-menu-container')) {
        setShowAttachMenu(false);
      }
      if (showToolsMenu && !(event.target as Element).closest('.tools-menu-container')) {
        setShowToolsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAttachMenu, showToolsMenu]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleEdit = (messageId: string, content: string) => {
    setEditingMessage(messageId);
    setEditContent(content);
  };

  const handleSaveEdit = (messageId: string) => {
    if (editContent.trim()) {
      onEditMessage(messageId, editContent.trim());
      setEditingMessage(null);
      setEditContent('');
    }
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditContent('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Message copied to clipboard",
      duration: 2000,
    });
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      console.log('Selected files:', Array.from(files).map(file => file.name));
      toast({
        title: "Files selected",
        description: `${files.length} file(s) selected: ${Array.from(files).map(f => f.name).join(', ')}`,
        duration: 3000,
      });
    }
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Voice search is not supported by your browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast({
        title: "Voice recognition error",
        description: "Failed to recognize speech. Please try again.",
        duration: 3000,
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Welcome to SEFGH-AI</h3>
            <p className="text-muted-foreground">
              Start a conversation by typing a message below. I can help you search GitHub repositories and answer questions.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`message-bubble flex gap-3 group ${
              message.type === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
              ${message.type === 'user' ? 'bg-brand' : 'bg-muted'}
            `}>
              {message.type === 'user' ? (
                <User className="h-4 w-4 text-brand-foreground" />
              ) : (
                <Bot className="h-4 w-4 text-muted-foreground" />
              )}
            </div>

            <Card className={`
              flex-1 max-w-[80%]
              ${message.type === 'user' ? 'bg-brand text-brand-foreground' : ''}
            `}>
              <CardContent className="p-4">
                {editingMessage === message.id ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[80px] bg-gray-100 dark:bg-gray-800"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(message.id)}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Save & Submit
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleCancelEdit}
                        className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 px-3 py-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="whitespace-pre-wrap break-words">
                      {message.content}
                    </div>
                    <div className={`flex items-center mt-3 pt-3 ${
                      message.type === 'user' ? 'justify-end' : 'justify-between'
                    }`}>
                      {message.type === 'assistant' && (
                        <span className="text-xs opacity-70">
                          {formatTimestamp(message.timestamp)}
                        </span>
                      )}
                      {message.type === 'user' && (
                        <span className="text-xs opacity-70 mr-2">
                          {formatTimestamp(message.timestamp)}
                        </span>
                      )}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(message.content)}
                          className="h-7 w-7 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        {message.type === 'user' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(message.id, message.content)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                        )}
                        {message.type === 'assistant' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onRegenerateResponse(message.id)}
                            className="h-7 w-7 p-0"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDeleteMessage(message.id)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <Bot className="h-4 w-4 text-muted-foreground" />
            </div>
            <Card className="flex-1 max-w-[80%]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-muted-foreground">AI is thinking...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        className="hidden"
      />

      {/* Input area */}
      <div className="p-4">
        <form onSubmit={handleSubmit} className="relative">
          {/* Main pill-shaped container - made thinner */}
          <div className="bg-surface rounded-full px-4 py-1.5 flex items-center gap-3 shadow-sm border border-border">
            {/* Attach button with dropdown */}
            <div className="relative attach-menu-container">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Attach files</p>
                </TooltipContent>
              </Tooltip>
              
              {/* Attach dropdown menu */}
              {showAttachMenu && (
                <div className="absolute bottom-full left-0 mb-2 bg-popover border border-border rounded-lg shadow-lg p-1 w-48 z-50">
                  <button 
                    className="flex items-center gap-3 w-full p-2 hover:bg-accent hover:text-accent-foreground rounded text-sm cursor-pointer"
                    onClick={() => {
                      handleFileUpload();
                      setShowAttachMenu(false);
                    }}
                  >
                    <Paperclip className="h-4 w-4" />
                    <span>Upload files</span>
                  </button>
                  <button className="flex items-center gap-3 w-full p-2 hover:bg-accent hover:text-accent-foreground rounded text-sm cursor-pointer">
                    <ImageIcon className="h-4 w-4" />
                    <span>Upload image</span>
                  </button>
                  <button className="flex items-center gap-3 w-full p-2 hover:bg-accent hover:text-accent-foreground rounded text-sm cursor-pointer">
                    <Code className="h-4 w-4" />
                    <span>Upload code</span>
                  </button>
                </div>
              )}
            </div>

            {/* Input field - smaller and streamlined */}
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message SEFGH-AI..."
              className="flex-1 min-h-[24px] max-h-32 bg-transparent border-none focus:ring-0 focus:outline-none resize-none placeholder:text-muted-foreground text-sm py-0 leading-6"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />

            {/* Right side buttons */}
            <div className="flex items-center gap-1">
              {/* Voice input button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 rounded-full ${
                      isListening 
                        ? 'text-primary animate-pulse-fast bg-accent' 
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                    onClick={handleVoiceSearch}
                    disabled={isListening}
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isListening ? 'Listening...' : 'Voice input'}</p>
                </TooltipContent>
              </Tooltip>

              {/* Send button - only visible when there's text */}
              {input.trim() && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="h-7 w-7 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 p-0 ml-1"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Send message</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
          
          {/* Helper text - smaller and lighter */}
          <div className="flex justify-center mt-2">
            <p className="text-xs text-muted-foreground">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};