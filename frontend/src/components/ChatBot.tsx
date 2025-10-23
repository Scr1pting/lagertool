"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from "lucide-react";

interface Message {
    message: string;
}

interface Reply {
    reply: string;
}


export default function ClippyChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const [loading, setLoading] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [unreadSinceScroll, setUnreadSinceScroll] = useState(0);

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage: Message = { message: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setLoading(true);
        try {
            const response = await fetch("http://localhost:8000/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: input }),
            });

            if (!response.ok) {
                console.error("API error:", response.status, response.statusText);
                setLoading(false);
                return;
            }

            const text = await response.text();
            if (!text) {
                console.error("Empty response from API");
                setLoading(false);
                return;
            }

            const data: Reply = JSON.parse(text); // expects { message: string }
            const clippyMessage: Message = { message: data.reply };
            setMessages((prev) => [...prev, clippyMessage]);
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        // Auto scroll when messages change or when loading toggles so the typing indicator is visible
        const el = scrollRef.current;
        if (!el) return;

        // If the user is at bottom, auto-scroll; otherwise increment unread counter
        if (isAtBottom) {
            el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
            setUnreadSinceScroll(0);
        } else {
            setUnreadSinceScroll((c) => c + 1);
        }
    }, [messages, loading, isAtBottom]);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const onScroll = () => {
            const threshold = 24; // px from bottom
            const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
            setIsAtBottom(atBottom);
            if (atBottom) setUnreadSinceScroll(0);
        };

        el.addEventListener('scroll', onScroll, { passive: true });
        // initialize
        onScroll();
        return () => el.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50">
            {/* Floating Clippy Button (shadcn style pill) */}
            {!open && (
                <Button
                    onClick={() => setOpen(true)}
                    className="flex items-center justify-center w-12 h-12 p-0 rounded-full shadow-md bg-primary text-primary-foreground hover:bg-primary/90"
                    aria-label="Open Clippy chat"
                    size="icon"
                >
                    <MessageSquare className="w-5 h-5" />
                </Button>
            )}

            {/* Chat Window */}
            {open && (
                <Card className="w-96 h-100 flex flex-col shadow-2xl ring-1 ring-slate-200 dark:ring-slate-800 relative overflow-hidden">
                    <CardHeader>
                        <CardTitle>Clippy</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 p-2">
                        <div ref={scrollRef} className="flex flex-col gap-2 overflow-y-auto max-h-[22rem] pr-2 pb-28 min-w-0 w-full">
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`p-2 rounded-lg max-w-full whitespace-pre-wrap break-words ${
                                        idx % 2 === 0
                                            ? "bg-blue-100 text-black self-end"
                                            : "bg-gray-100 text-black self-start"
                                    }`}
                                >
                                    {msg.message}
                                </div>
                            ))}

                            {loading && (
                                <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                                    <span>Clippy is typing…</span>
                                </div>
                            )}

                        </div>
                    </CardContent>

                    {/* Scroll to latest button (shows when user scrolled up and there are unread messages) */}
                    {!isAtBottom && unreadSinceScroll > 0 && (
                        <div className="absolute right-4 bottom-24 z-40">
                            <Button
                                size="sm"
                                onClick={() => {
                                    const el = scrollRef.current;
                                    if (!el) return;
                                    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
                                    setIsAtBottom(true);
                                    setUnreadSinceScroll(0);
                                }}
                                className="shadow-lg bg-primary text-primary-foreground"
                                aria-label="Scroll to latest messages"
                            >
                                New
                            </Button>
                        </div>
                    )}

                    {/* Input */}
                    <div className="sticky bottom-0 bg-card/80 backdrop-blur-sm p-2 flex gap-2 border-t border-slate-100/10">
                        <Input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type a message..."
                            onKeyDown={(e) => e.key === "Enter" && !loading && sendMessage()}
                            disabled={loading}
                        />
                        <Button onClick={sendMessage} disabled={loading} aria-label="Send message">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" onClick={() => setOpen(false)}>
                            ✕
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    );
}
