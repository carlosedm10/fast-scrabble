import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Globe, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSocket } from "@/lib/socket";
import { saveSession } from "@/lib/storage";
import type { Language } from "@/types/game";

type MaxPlayers = 2 | 3 | 4;

export function HomePage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [language, setLanguage] = useState<Language>((i18n.language as Language) || "es");
  const [maxPlayers, setMaxPlayers] = useState<MaxPlayers>(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    void i18n.changeLanguage(lang);
  };

  const handleCreate = () => {
    if (!nickname.trim()) {
      setError(t("errorNickname"));
      return;
    }
    setLoading(true);
    setError("");
    const socket = getSocket();
    socket.emit(
      "room:create",
      { nickname: nickname.trim(), language, maxPlayers },
      (res: { ok: boolean; token?: string; room?: { code: string }; error?: string }) => {
        setLoading(false);
        if (!res.ok || !res.token || !res.room) {
          setError(res.error ?? t("errorCreate"));
          return;
        }
        saveSession(res.token, nickname.trim(), res.room.code);
        navigate(`/p/${res.room.code}`);
      },
    );
  };

  const handleJoin = () => {
    if (!nickname.trim() || !roomCode.trim()) {
      setError(t("errorNicknameAndCode"));
      return;
    }
    setLoading(true);
    setError("");
    const socket = getSocket();
    socket.emit(
      "room:join",
      { code: roomCode.trim().toUpperCase(), nickname: nickname.trim() },
      (res: { ok: boolean; token?: string; room?: { code: string; language?: Language }; error?: string }) => {
        setLoading(false);
        if (!res.ok || !res.token || !res.room) {
          const msg = res.error === "expired" ? t("expired") : (res.error ?? t("errorJoin"));
          setError(msg);
          return;
        }
        if (res.room.language) void i18n.changeLanguage(res.room.language);
        saveSession(res.token, nickname.trim(), res.room.code);
        navigate(`/p/${res.room.code}`);
      },
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="pointer-events-none absolute left-[8%] top-[18%] h-px w-32 bg-linear-to-r from-transparent to-brand-cyan/70 sm:w-64" />
      <div className="pointer-events-none absolute bottom-[16%] right-[6%] h-px w-40 bg-linear-to-l from-transparent to-[#c22030]/70 sm:w-72" />

      <div className="relative mb-8 text-center">
        <div aria-hidden="true" className="mx-auto mb-4 flex w-fit gap-1.5 rounded-full border border-brand-cyan/25 bg-brand-cyan/10 px-3 py-2 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan-light" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#c22030]" />
        </div>
        <div className="flex items-center justify-center gap-3 mb-2">
          <img
            src={`${import.meta.env.BASE_URL}icon-192.png`}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 rounded-xl border border-brand-cyan/25 shadow-[0_0_28px_rgba(4,158,226,0.18)]"
          />
          <h1 className="text-4xl font-extrabold tracking-tight bg-linear-to-r from-white via-brand-cyan-light to-brand-cyan bg-clip-text text-transparent sm:text-5xl">
            Fast Scrabble
          </h1>
        </div>
        <p className="mx-auto max-w-sm text-white/60">{t("tagline")}</p>
      </div>

      <Card className="relative w-full max-w-md overflow-hidden">
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-brand-cyan-light/80 to-transparent" />
        <CardHeader>
          <CardTitle>{t("playNow")}</CardTitle>
          <CardDescription>{t("playNowHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-white/70 mb-1 block" htmlFor="nickname">
              {t("nickname")}
            </label>
            <Input
              id="nickname"
              placeholder={t("nicknamePlaceholder")}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              autoComplete="nickname"
              enterKeyHint="go"
              onKeyDown={(event) => {
                if (event.key === "Enter") handleCreate();
              }}
            />
          </div>

          <div>
            <label className="text-sm text-white/70 mb-2 flex items-center gap-1">
              <Globe className="h-4 w-4" /> {t("languageLabel")}
            </label>
            <div className="flex gap-2">
              <Button
                variant={language === "es" ? "default" : "outline"}
                onClick={() => changeLanguage("es")}
                className="flex-1"
              >
                {t("languageEs")}
              </Button>
              <Button
                variant={language === "en" ? "default" : "outline"}
                onClick={() => changeLanguage("en")}
                className="flex-1"
              >
                {t("languageEn")}
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm text-white/70 mb-2 flex items-center gap-1">
              <Users className="h-4 w-4" /> {t("playersLabel")}
            </label>
            <div className="flex gap-2">
              {([2, 3, 4] as const).map((n) => (
                <Button
                  key={n}
                  variant={maxPlayers === n ? "default" : "outline"}
                  onClick={() => setMaxPlayers(n)}
                  className="flex-1"
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <Button onClick={handleCreate} disabled={loading} className="w-full" size="lg">
            <Users className="h-4 w-4" />
            {t("createGame")}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-brand-cyan/20" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-brand-surface px-2 text-white/40">{t("orJoin")}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder={t("roomCode")}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="uppercase sm:flex-1"
              autoCapitalize="characters"
              enterKeyHint="go"
              aria-label={t("roomCode")}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleJoin();
              }}
            />
            <Button variant="outline" onClick={handleJoin} disabled={loading} className="h-11 sm:h-10">
              {t("join")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
