import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gamepad2, Globe, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSocket } from "@/lib/socket";
import { saveSession } from "@/lib/storage";
import type { Language } from "@/types/game";

export function HomePage() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [language, setLanguage] = useState<Language>("es");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = () => {
    if (!nickname.trim()) {
      setError("Enter a nickname");
      return;
    }
    setLoading(true);
    setError("");
    const socket = getSocket();
    socket.emit("room:create", { nickname: nickname.trim(), language }, (res: { ok: boolean; token?: string; room?: { code: string }; error?: string }) => {
      setLoading(false);
      if (!res.ok || !res.token || !res.room) {
        setError(res.error ?? "Failed to create room");
        return;
      }
      saveSession(res.token, nickname.trim(), res.room.code);
      navigate(`/p/${res.room.code}`);
    });
  };

  const handleJoin = () => {
    if (!nickname.trim() || !roomCode.trim()) {
      setError("Enter nickname and room code");
      return;
    }
    setLoading(true);
    setError("");
    const socket = getSocket();
    socket.emit("room:join", { code: roomCode.trim().toUpperCase(), nickname: nickname.trim() }, (res: { ok: boolean; token?: string; room?: { code: string }; error?: string }) => {
      setLoading(false);
      if (!res.ok || !res.token || !res.room) {
        setError(res.error ?? "Failed to join room");
        return;
      }
      saveSession(res.token, nickname.trim(), res.room.code);
      navigate(`/p/${res.room.code}`);
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Gamepad2 className="h-10 w-10 text-brand-cyan" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-cyan to-brand-cyan-light bg-clip-text text-transparent">
            Fast Scrabble
          </h1>
        </div>
        <p className="text-white/60">Multiplayer Scrabble — Spanish & English</p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Play Now</CardTitle>
          <CardDescription>No account needed — pick a nickname and go</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-white/70 mb-1 block">Nickname</label>
            <Input
              placeholder="Your nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
            />
          </div>

          <div>
            <label className="text-sm text-white/70 mb-2 block flex items-center gap-1">
              <Globe className="h-4 w-4" /> Language (for new games)
            </label>
            <div className="flex gap-2">
              <Button
                variant={language === "es" ? "default" : "outline"}
                onClick={() => setLanguage("es")}
                className="flex-1"
              >
                Español (FISE)
              </Button>
              <Button
                variant={language === "en" ? "default" : "outline"}
                onClick={() => setLanguage("en")}
                className="flex-1"
              >
                English
              </Button>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <Button onClick={handleCreate} disabled={loading} className="w-full" size="lg">
            <Users className="h-4 w-4" />
            Create Game
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-brand-cyan/20" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-brand-surface px-2 text-white/40">or join</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="uppercase"
            />
            <Button variant="outline" onClick={handleJoin} disabled={loading}>
              Join
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
