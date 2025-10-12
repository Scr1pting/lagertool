"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";

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

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage: Message = { message: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");

        try {
            const response = await fetch("https://05.hackathon.ethz.ch/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: input }),
            });

            if (!response.ok) {
                console.error("API error:", response.status, response.statusText);
                return;
            }

            const text = await response.text();
            if (!text) {
                console.error("Empty response from API");
                return;
            }

            const data: Reply = JSON.parse(text); // expects { message: string }
            const clippyMessage: Message = { message: data.reply };
            setMessages((prev) => [...prev, clippyMessage]);
        } catch (err) {
            console.error("Fetch error:", err);
        }
    };


    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages]);

    return (
        <div className="fixed bottom-4 right-4 z-50">
            {/* Floating Clippy Button */}
            {!open && (
                <Button onClick={() => setOpen(true)} className="bg-transparent w-16 h-16 p-0">
                    <img src="/classic-clippy-original.png" alt="Clippy" className="w-full h-full" />
                </Button>
            )}

            {/* Chat Window */}
            {open && (
                <Card className="w-80 h-96 flex flex-col shadow-lg">
                    <CardHeader>
                        <CardTitle>Clippy</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 p-2">
                        <ScrollArea ref={scrollRef} className="h-full">
                            <div className="flex flex-col gap-2">
                                {messages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-2 rounded-lg break-words ${
                                            idx % 2 === 0
                                                ? "bg-blue-100 text-black self-end"
                                                : "bg-gray-100 text-black self-start"
                                        }`}
                                    >
                                        {msg.message}
                                    </div>
                                ))}

                            </div>
                        </ScrollArea>
                    </CardContent>

                    {/* Input */}
                    <div className="flex p-2 gap-2">
                        <Input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type a message..."
                            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                        />
                        <Button onClick={sendMessage}>
                            <Send className="w-4 h-4" />
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
