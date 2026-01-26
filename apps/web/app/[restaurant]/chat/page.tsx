"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import { Input } from "@qr-dine/ui";
import {
  Send,
  Users,
  MessageSquare,
  Search,
  Plus,
  Loader2,
  Check,
  CheckCheck,
  ChefHat,
  UserCircle,
  Crown,
  Utensils,
  X,
} from "lucide-react";

interface User {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
}

interface ChatGroup {
  id: string;
  name: string;
  type: string;
  members: string[];
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
}

interface Message {
  id: string;
  senderId: string;
  sender?: User;
  messageText: string;
  sentAt: string;
  readBy: string[];
}

const quickReplies = [
  "On my way!",
  "Got it!",
  "Need backup",
  "Table ready",
  "Order up!",
  "Be right there",
];

const systemGroups = [
  { id: "all-staff", name: "All Staff", type: "SYSTEM", icon: Users },
  { id: "kitchen", name: "Kitchen Team", type: "SYSTEM", icon: ChefHat },
  { id: "floor", name: "Floor Staff", type: "SYSTEM", icon: Utensils },
  { id: "management", name: "Management", type: "SYSTEM", icon: Crown },
];

export default function ChatPage() {
  const params = useParams();
  const restaurant = params.restaurant as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChat, setSelectedChat] = useState<{
    type: "direct" | "group";
    id: string;
    name: string;
  } | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    fetchData();
    // Poll for new messages every 5 seconds
    const interval = setInterval(() => {
      if (selectedChat) {
        fetchMessages(selectedChat.type, selectedChat.id, true);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch current user
      const userRes = await fetch("/api/auth/me");
      if (userRes.ok) {
        const userData = await userRes.json();
        setCurrentUserId(userData.user.id);
      }

      // Fetch staff
      const staffRes = await fetch("/api/staff");
      if (staffRes.ok) {
        const staffData = await staffRes.json();
        setUsers(staffData.staff);
      }

      // Fetch chat groups
      const groupsRes = await fetch("/api/chat/groups");
      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        setGroups(groupsData.groups);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (
    type: "direct" | "group",
    chatId: string,
    silent = false
  ) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/chat/messages?type=${type}&chatId=${chatId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const selectChat = (type: "direct" | "group", id: string, name: string) => {
    setSelectedChat({ type, id, name });
    fetchMessages(type, id);
  };

  const sendMessage = async (text?: string) => {
    const messageText = text || newMessage.trim();
    if (!messageText || !selectedChat) return;

    setSending(true);
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatType: selectedChat.type,
          chatId: selectedChat.id,
          messageText,
        }),
      });

      if (res.ok) {
        setNewMessage("");
        fetchMessages(selectedChat.type, selectedChat.id, true);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "OWNER":
      case "MANAGER":
        return <Crown className="h-3 w-3" />;
      case "KITCHEN":
        return <ChefHat className="h-3 w-3" />;
      default:
        return <UserCircle className="h-3 w-3" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "OWNER":
        return "bg-purple-100 text-purple-700";
      case "MANAGER":
        return "bg-blue-100 text-blue-700";
      case "KITCHEN":
        return "bg-orange-100 text-orange-700";
      case "WAITER":
        return "bg-green-100 text-green-700";
      case "HOST":
        return "bg-pink-100 text-pink-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.id !== currentUserId &&
      u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-120px)] flex gap-4">
      {/* Sidebar - Chats List */}
      <div className="w-80 flex flex-col bg-card rounded-lg border">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Messages</h2>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowNewChat(!showNewChat)}
            >
              {showNewChat ? (
                <X className="h-5 w-5" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* New Chat Selection */}
        {showNewChat && (
          <div className="p-2 border-b bg-muted/50">
            <p className="text-xs font-medium text-muted-foreground mb-2 px-2">
              Start a new chat
            </p>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    selectChat("direct", user.id, user.name);
                    setShowNewChat(false);
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.name}</p>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${getRoleColor(
                        user.role
                      )}`}
                    >
                      {user.role}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {/* System Groups */}
          <div className="p-2">
            <p className="text-xs font-medium text-muted-foreground mb-2 px-2">
              Groups
            </p>
            {systemGroups.map((group) => (
              <button
                key={group.id}
                onClick={() => selectChat("group", group.id, group.name)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  selectedChat?.id === group.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedChat?.id === group.id
                      ? "bg-primary-foreground/20"
                      : "bg-primary/10"
                  }`}
                >
                  <group.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">{group.name}</p>
                  <p
                    className={`text-xs ${
                      selectedChat?.id === group.id
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    {group.type} Group
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Custom Groups */}
          {groups.length > 0 && (
            <div className="p-2 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2 px-2">
                Custom Groups
              </p>
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => selectChat("group", group.id, group.name)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    selectedChat?.id === group.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{group.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {group.members?.length || 0} members
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Direct Messages */}
          <div className="p-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2 px-2">
              Direct Messages
            </p>
            {users
              .filter((u) => u.id !== currentUserId)
              .map((user) => (
                <button
                  key={user.id}
                  onClick={() => selectChat("direct", user.id, user.name)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    selectedChat?.id === user.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                      selectedChat?.id === user.id
                        ? "bg-primary-foreground/20"
                        : getRoleColor(user.role)
                    }`}
                  >
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-1">
                      <p className="font-medium">{user.name}</p>
                      {getRoleIcon(user.role)}
                    </div>
                    <p
                      className={`text-xs ${
                        selectedChat?.id === user.id
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {user.role}
                    </p>
                  </div>
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col bg-card rounded-lg border">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                {selectedChat.type === "group" ? (
                  <Users className="h-5 w-5" />
                ) : (
                  <span className="font-medium">
                    {selectedChat.name.charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-semibold">{selectedChat.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedChat.type === "group" ? "Group Chat" : "Direct Message"}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mb-2" />
                  <p>No messages yet</p>
                  <p className="text-sm">Send the first message!</p>
                </div>
              ) : (
                messages.map((message) => {
                  const isOwnMessage = message.senderId === currentUserId;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${
                        isOwnMessage ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          isOwnMessage
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {!isOwnMessage && selectedChat.type === "group" && (
                          <p className="text-xs font-medium mb-1 opacity-70">
                            {message.sender?.name}
                          </p>
                        )}
                        <p className="break-words">{message.messageText}</p>
                        <div
                          className={`flex items-center gap-1 justify-end mt-1 ${
                            isOwnMessage
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          }`}
                        >
                          <span className="text-xs">
                            {new Date(message.sentAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isOwnMessage && (
                            message.readBy?.length > 1 ? (
                              <CheckCheck className="h-3 w-3" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies */}
            <div className="px-4 py-2 border-t flex gap-2 flex-wrap">
              {quickReplies.map((reply) => (
                <Button
                  key={reply}
                  variant="outline"
                  size="sm"
                  onClick={() => sendMessage(reply)}
                  disabled={sending}
                >
                  {reply}
                </Button>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-2"
              >
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  disabled={sending}
                  className="flex-1"
                />
                <Button type="submit" disabled={sending || !newMessage.trim()}>
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="h-16 w-16 mb-4" />
            <h3 className="text-lg font-medium">Select a chat</h3>
            <p className="text-sm">
              Choose a conversation from the sidebar to start messaging
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
