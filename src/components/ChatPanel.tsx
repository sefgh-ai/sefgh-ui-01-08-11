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
  ChevronDown,
  BookOpen,
  Image,
  Brain,
  Search,
  Globe,
  Layout,
  ChevronRight,
  Cloud
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
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [toolsMenuPosition, setToolsMenuPosition] = useState({ x: 0, y: 0 });
  const [addMenuPosition, setAddMenuPosition] = useState({ x: 0, y: 0 });
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isClosing, setIsClosing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toolsButtonRef = useRef<HTMLButtonElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Define tools and add menu items
  const toolsItems = [
    { id: 'study', icon: BookOpen, label: 'Study and Learn', action: () => handleToolAction('study') },
    { id: 'image', icon: Image, label: 'Create Image', action: () => handleToolAction('image') },
    { id: 'think', icon: Brain, label: 'Think Longer', action: () => handleToolAction('think') },
    { id: 'research', icon: Search, label: 'Deep Research', action: () => handleToolAction('research') },
    { id: 'web', icon: Globe, label: 'Web Search', action: () => handleToolAction('web') },
    { id: 'canvas', icon: Layout, label: 'Canvas', action: () => handleToolAction('canvas') }
  ];

  const addItems = [
    { id: 'files', label: 'Add Photos & Files', action: () => handleFileUpload() },
    { id: 'apps', label: 'Add from Apps', hasSubmenu: true }
  ];

  const subMenuItems = [
    { id: 'gdrive', icon: Cloud, label: 'Google Drive', action: () => handleCloudService('gdrive') },
    { id: 'onedrive-personal', icon: Cloud, label: 'OneDrive (Personal)', action: () => handleCloudService('onedrive-personal') },
    { id: 'onedrive-work', icon: Cloud, label: 'OneDrive (Work)', action: () => handleCloudService('onedrive-work') }
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      if (showAttachMenu && !target.closest('.attach-menu-container')) {
        setShowAttachMenu(false);
      }
      if (showToolsMenu && !target.closest('.tools-menu-container')) {
        closeToolsMenu();
      }
      if (showAddMenu && !target.closest('.add-menu-container')) {
        closeAddMenu();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!showToolsMenu && !showAddMenu) return;

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          closeAllMenus();
          break;
        case 'ArrowDown':
          event.preventDefault();
          if (showToolsMenu) {
            setFocusedIndex(prev => (prev + 1) % toolsItems.length);
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (showToolsMenu) {
            setFocusedIndex(prev => prev <= 0 ? toolsItems.length - 1 : prev - 1);
          }
          break;
        case 'Enter':
          event.preventDefault();
          if (showToolsMenu && focusedIndex >= 0) {
            handleToolItemClick(toolsItems[focusedIndex], focusedIndex);
          }
          break;
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showAttachMenu, showToolsMenu, showAddMenu, focusedIndex, toolsItems]);

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

  // Enhanced Tools Menu Functions
  const handleToolsClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (showToolsMenu) {
      closeToolsMenu();
      return;
    }

    const rect = toolsButtonRef.current?.getBoundingClientRect();
    if (rect) {
      setToolsMenuPosition({
        x: isMobile ? 0 : rect.left,
        y: isMobile ? 0 : rect.top - 8
      });
    }
    
    setShowToolsMenu(true);
    setFocusedIndex(-1);
    closeAddMenu();
  };

  const closeToolsMenu = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowToolsMenu(false);
      setIsClosing(false);
      setFocusedIndex(-1);
    }, 150);
  };

  const handleToolAction = (tool: string) => {
    toast({
      title: `${tool.charAt(0).toUpperCase() + tool.slice(1)} Tool`,
      description: `Launching ${tool} functionality...`,
      duration: 2000,
    });
    
    closeToolsMenu();
    
    // Here you would implement the actual tool functionality
    switch (tool) {
      case 'image':
        // Launch image creation modal
        break;
      case 'study':
        // Launch study mode
        break;
      // Add other tool cases
    }
  };

  const handleToolItemClick = (item: typeof toolsItems[0], index: number, event?: React.MouseEvent) => {
    if (event) {
      // Create ripple effect
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      
      const element = event.currentTarget as HTMLElement;
      element.style.setProperty('--ripple-x', `${x}%`);
      element.style.setProperty('--ripple-y', `${y}%`);
      element.classList.add('ripple');
      
      setTimeout(() => {
        element.classList.remove('ripple');
      }, 200);
    }
    
    setTimeout(() => {
      item.action();
    }, 200);
  };

  // Enhanced Add Menu Functions
  const handleAddClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (showAddMenu) {
      closeAddMenu();
      return;
    }

    const rect = addButtonRef.current?.getBoundingClientRect();
    if (rect) {
      setAddMenuPosition({
        x: isMobile ? 0 : rect.left,
        y: isMobile ? 0 : rect.top - 8
      });
    }
    
    setShowAddMenu(true);
    closeToolsMenu();
  };

  const closeAddMenu = () => {
    setShowSubMenu(false);
    setIsClosing(true);
    setTimeout(() => {
      setShowAddMenu(false);
      setIsClosing(false);
    }, 150);
  };

  const closeAllMenus = () => {
    closeToolsMenu();
    closeAddMenu();
    setShowAttachMenu(false);
  };

  const handleCloudService = (service: string) => {
    toast({
      title: `Connecting to ${service}`,
      description: `Opening OAuth flow for ${service}...`,
      duration: 2000,
    });
    
    closeAddMenu();
    // Implement OAuth flow here
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
            {/* Enhanced Tools Button */}
            <div className="relative tools-menu-container">
              <button
                ref={toolsButtonRef}
                type="button"
                onClick={handleToolsClick}
                className="tools-button"
                aria-label="Open tools menu"
                aria-expanded={showToolsMenu}
              >
                <Settings className="h-4 w-4" />
                <span>Tools</span>
              </button>
            </div>

            {/* Enhanced Add Button */}
            <div className="relative add-menu-container">
              <button
                ref={addButtonRef}
                type="button"
                onClick={handleAddClick}
                className="tools-button"
                aria-label="Add files or connect apps"
                aria-expanded={showAddMenu}
              >
                <Plus className="h-4 w-4" />
                <span>Add</span>
              </button>
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

        {/* Enhanced Tools Menu */}
        {showToolsMenu && (
          <>
            {isMobile && <div className="mobile-backdrop" />}
            <div
              ref={toolsMenuRef}
              className={`tools-menu ${isClosing ? 'closing' : ''}`}
              style={!isMobile ? {
                left: toolsMenuPosition.x,
                top: toolsMenuPosition.y
              } : {}}
              role="menu"
              aria-label="Tools menu"
            >
              {toolsItems.map((item, index) => (
                <div
                  key={item.id}
                  className={`tools-menu-item ${focusedIndex === index ? 'menu-item-focused' : ''}`}
                  role="menuitem"
                  tabIndex={0}
                  onClick={(e) => handleToolItemClick(item, index, e)}
                  onMouseEnter={() => setFocusedIndex(index)}
                  aria-label={item.label}
                >
                  <item.icon className="icon" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Enhanced Add Menu */}
        {showAddMenu && (
          <>
            {isMobile && <div className="mobile-backdrop" />}
            <div
              ref={addMenuRef}
              className={`add-menu ${isClosing ? 'closing' : ''}`}
              style={!isMobile ? {
                left: addMenuPosition.x,
                top: addMenuPosition.y
              } : {}}
              role="menu"
              aria-label="Add menu"
            >
              {addItems.map((item) => (
                <div
                  key={item.id}
                  className="add-menu-item"
                  role="menuitem"
                  tabIndex={0}
                  onClick={item.action}
                  onMouseEnter={() => {
                    if (item.hasSubmenu) {
                      setShowSubMenu(true);
                    }
                  }}
                  onMouseLeave={() => {
                    if (item.hasSubmenu) {
                      setTimeout(() => setShowSubMenu(false), 100);
                    }
                  }}
                  aria-label={item.label}
                >
                  <span>{item.label}</span>
                  {item.hasSubmenu && <ChevronRight className="h-4 w-4 ml-1" />}
                </div>
              ))}

              {/* Sub-menu */}
              {showSubMenu && (
                <div className="submenu-panel">
                  {subMenuItems.map((item) => (
                    <div
                      key={item.id}
                      className="submenu-item"
                      role="menuitem"
                      tabIndex={0}
                      onClick={item.action}
                      aria-label={item.label}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};