import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppHeader } from './AppHeader';
import { NavigationPanel } from './NavigationPanel';
import { SearchPanel } from './SearchPanel';
import { ChatPanel } from './ChatPanel';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { HistoryPanel } from './panels/HistoryPanel';
import { LanguagePanel } from './panels/LanguagePanel';
import { ConsolePanel } from './panels/ConsolePanel';
import { ProxyPanel } from './panels/ProxyPanel';
import { AllPagesPanel } from './panels/AllPagesPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messageCount: number;
  messages: Message[];
}

interface LogEntry {
  id: string;
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: Date;
}

interface ProxySettings {
  enabled: boolean;
  address: string;
  port: string;
  username: string;
  password: string;
  requiresAuth: boolean;
}

interface AppState {
  theme: 'light' | 'dark';
  isNavOpen: boolean;
  isSearchVisible: boolean;
  activeView: string;
  selectedVersion: string;
  selectedLanguage: string;
  messages: Message[];
  chatSessions: ChatSession[];
  consoleLogs: LogEntry[];
  proxySettings: ProxySettings;
  isLoading: boolean;
  githubSearchQuery?: string;
}

const initialState: AppState = {
  theme: 'light',
  isNavOpen: false,
  isSearchVisible: false,
  activeView: 'chat',
  selectedVersion: 'v3',
  selectedLanguage: 'en',
  messages: [],
  chatSessions: [],
  consoleLogs: [],
  proxySettings: {
    enabled: false,
    address: '',
    port: '',
    username: '',
    password: '',
    requiresAuth: false,
  },
  isLoading: false,
  githubSearchQuery: undefined,
};

export const SEFGHApp = () => {
  const [state, setState] = useState<AppState>(initialState);
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('sefgh-app-state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setState(prev => ({
          ...prev,
          ...parsed,
          // Parse dates
          messages: parsed.messages?.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })) || [],
          chatSessions: parsed.chatSessions?.map((session: any) => ({
            ...session,
            timestamp: new Date(session.timestamp),
            messages: session.messages?.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            })) || [],
          })) || [],
          consoleLogs: parsed.consoleLogs?.map((log: any) => ({
            ...log,
            timestamp: new Date(log.timestamp),
          })) || [],
        }));
      } catch (error) {
        console.error('Failed to load saved state:', error);
      }
    }

    // Apply saved theme
    const savedTheme = localStorage.getItem('sefgh-theme') || 'light';
    setState(prev => ({ ...prev, theme: savedTheme as 'light' | 'dark' }));
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sefgh-app-state', JSON.stringify(state));
    localStorage.setItem('sefgh-theme', state.theme);
  }, [state]);

  // Override console functions to capture logs
  useEffect(() => {
    const originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
    };

    const createLogCapture = (type: LogEntry['type'], originalFn: Function) => {
      return (...args: any[]) => {
        originalFn.apply(console, args);
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        
        const logEntry: LogEntry = {
          id: Math.random().toString(36).substr(2, 9),
          type,
          message,
          timestamp: new Date(),
        };

        setState(prev => ({
          ...prev,
          consoleLogs: [logEntry, ...prev.consoleLogs].slice(0, 100), // Keep last 100 logs
        }));
      };
    };

    console.log = createLogCapture('log', originalConsole.log);
    console.error = createLogCapture('error', originalConsole.error);
    console.warn = createLogCapture('warn', originalConsole.warn);
    console.info = createLogCapture('info', originalConsole.info);

    return () => {
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      console.warn = originalConsole.warn;
      console.info = originalConsole.info;
    };
  }, []);

  const updateState = useCallback((updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    updateState({ theme: newTheme });
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    
    toast({
      title: `Switched to ${newTheme} mode`,
      duration: 2000,
    });
  }, [state.theme, updateState, toast]);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'user',
      content,
      timestamp: new Date(),
    };

    updateState({ 
      messages: [...state.messages, userMessage],
      isLoading: true,
    });

    try {
      const response = await fetch('https://api.sefgh.org', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: content }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      
      // Extract message and query from API response
      let messageContent = '';
      let shouldOpenGithubSearch = false;
      let githubQuery = '';

      if (data && typeof data === 'object') {
        // Type 1: Has both message and query
        if (data.message && data.query) {
          messageContent = data.message;
          shouldOpenGithubSearch = true;
          githubQuery = data.query;
        }
        // Type 2: Has only message
        else if (data.message) {
          messageContent = data.message;
        }
        // Fallback: stringify the whole response
        else {
          messageContent = JSON.stringify(data, null, 2);
        }
      } else {
        messageContent = String(data);
      }
      
      const assistantMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'assistant',
        content: messageContent,
        timestamp: new Date(),
      };

      updateState({ 
        messages: [...state.messages, userMessage, assistantMessage],
        isLoading: false,
        // If there's a query, open the GitHub search panel
        ...(shouldOpenGithubSearch && { 
          isSearchVisible: true,
          githubSearchQuery: githubQuery
        })
      });

    } catch (error) {
      console.error('API Error:', error);
      
      const errorMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again later.',
        timestamp: new Date(),
      };

      updateState({ 
        messages: [...state.messages, userMessage, errorMessage],
        isLoading: false,
      });
    }
  }, [state.messages, updateState]);

  const editMessage = useCallback((messageId: string, newContent: string) => {
    const messageIndex = state.messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return;

    // Remove all messages after the edited message and update the edited message
    const updatedMessages = state.messages.slice(0, messageIndex + 1);
    updatedMessages[messageIndex].content = newContent;

    updateState({ messages: updatedMessages });

    // If it's a user message, resend it
    if (updatedMessages[messageIndex].type === 'user') {
      sendMessage(newContent);
    }
  }, [state.messages, updateState, sendMessage]);

  const deleteMessage = useCallback((messageId: string) => {
    const updatedMessages = state.messages.filter(msg => msg.id !== messageId);
    updateState({ messages: updatedMessages });
  }, [state.messages, updateState]);

  const regenerateResponse = useCallback((messageId: string) => {
    const messageIndex = state.messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return;

    // Find the user message before this assistant message
    const userMessageIndex = messageIndex - 1;
    if (userMessageIndex >= 0 && state.messages[userMessageIndex].type === 'user') {
      // Remove the assistant message and regenerate
      const updatedMessages = state.messages.slice(0, messageIndex);
      updateState({ messages: updatedMessages });
      sendMessage(state.messages[userMessageIndex].content);
    }
  }, [state.messages, updateState, sendMessage]);

  const setActiveView = useCallback((view: string) => {
    updateState({ activeView: view });
  }, [updateState]);

  const focusSearchInput = useCallback(() => {
    updateState({ isSearchVisible: true });
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  }, [updateState]);

  const focusChatInput = useCallback(() => {
    setActiveView('chat');
    setTimeout(() => {
      chatInputRef.current?.focus();
    }, 100);
  }, [setActiveView]);

  const handleNewChat = useCallback(() => {
    updateState({ messages: [], activeView: 'chat' });
    setTimeout(() => {
      chatInputRef.current?.focus();
    }, 100);
  }, [updateState]);

  const renderActivePanel = () => {
    switch (state.activeView) {
      case 'chat':
        return (
          <ChatPanel
            messages={state.messages}
            onSendMessage={sendMessage}
            onEditMessage={editMessage}
            onDeleteMessage={deleteMessage}
            onRegenerateResponse={regenerateResponse}
            onToggleGithubSearch={() => updateState({ isSearchVisible: !state.isSearchVisible })}
            isLoading={state.isLoading}
            inputRef={chatInputRef}
          />
        );
      case 'history':
        return (
          <HistoryPanel
            sessions={state.chatSessions}
            onLoadSession={(sessionId) => {
              const session = state.chatSessions.find(s => s.id === sessionId);
              if (session) {
                updateState({ 
                  messages: session.messages,
                  activeView: 'chat',
                });
              }
            }}
            onDeleteSession={(sessionId) => {
              const updatedSessions = state.chatSessions.filter(s => s.id !== sessionId);
              updateState({ chatSessions: updatedSessions });
            }}
          />
        );
      case 'language':
        return (
          <LanguagePanel
            selectedLanguage={state.selectedLanguage}
            onLanguageChange={(language) => {
              updateState({ selectedLanguage: language });
              toast({
                title: "Language Changed",
                description: `Interface language changed to ${language.toUpperCase()}`,
                duration: 2000,
              });
            }}
          />
        );
      case 'console':
        return (
          <ConsolePanel
            logs={state.consoleLogs}
            onClearLogs={() => updateState({ consoleLogs: [] })}
          />
        );
      case 'proxy':
        return (
          <ProxyPanel
            settings={state.proxySettings}
            onSettingsChange={(settings) => updateState({ proxySettings: settings })}
          />
        );
      case 'all-pages':
        return <AllPagesPanel onNavigate={setActiveView} />;
      case 'docs':
      case 'playground':
      case 'settings':
        return (
          <Card className="m-6">
            <CardHeader>
              <CardTitle className="capitalize">{state.activeView}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This section is under development. Check back soon for updates!
              </p>
            </CardContent>
          </Card>
        );
      default:
        return <AllPagesPanel onNavigate={setActiveView} />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <AppHeader
        theme={state.theme}
        selectedVersion={state.selectedVersion}
        onThemeToggle={toggleTheme}
        onNavToggle={() => updateState({ isNavOpen: !state.isNavOpen })}
        onSearchToggle={() => updateState({ isSearchVisible: !state.isSearchVisible })}
        onVersionChange={(version) => {
          updateState({ selectedVersion: version });
          toast({
            title: `Switched to ${version.toUpperCase()}`,
            description: "AI model version updated",
            duration: 2000,
          });
        }}
      />

      <main className="flex-1 flex pt-14 overflow-hidden">
        <NavigationPanel
          isOpen={state.isNavOpen}
          activeView={state.activeView}
          theme={state.theme}
          onViewChange={setActiveView}
          onThemeToggle={toggleTheme}
          onClose={() => updateState({ isNavOpen: false })}
        />

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-hidden">
            {renderActivePanel()}
          </div>

          <SearchPanel
            isVisible={state.isSearchVisible}
            onClose={() => updateState({ isSearchVisible: false, githubSearchQuery: undefined })}
            inputRef={searchInputRef}
            autoSearchQuery={state.githubSearchQuery}
            onQueryProcessed={() => updateState({ githubSearchQuery: undefined })}
          />
        </div>
      </main>

      <KeyboardShortcuts
        onFocusSearchInput={focusSearchInput}
        onFocusChatInput={focusChatInput}
        onToggleNav={() => updateState({ isNavOpen: !state.isNavOpen })}
        onToggleSearch={() => updateState({ isSearchVisible: !state.isSearchVisible })}
        onNewChat={handleNewChat}
        onToggleTheme={toggleTheme}
      />
    </div>
  );
};