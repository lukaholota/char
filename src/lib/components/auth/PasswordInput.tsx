"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-rules";

type Props = Omit<ComponentProps<typeof Input>, "type" | "className"> & { autoComplete: "current-password" | "new-password" };

export function PasswordInput(props: Props) {
  const [isVisible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={isVisible ? "text" : "password"} minLength={PASSWORD_MIN_LENGTH} required className="h-11 border-slate-700 bg-slate-900/70 pr-11 text-white" data-ph-mask />
      <button
        type="button"
        onClick={() => setVisible((visible) => !visible)}
        aria-label={isVisible ? "Сховати пароль" : "Показати пароль"}
        aria-pressed={isVisible}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-white"
      >
        {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
