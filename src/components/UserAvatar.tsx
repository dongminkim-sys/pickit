"use client";

import { useAuth } from "@/lib/auth";

interface Props {
  userId: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  xs: { container: "w-4 h-4", text: "text-[7px]" },
  sm: { container: "w-5 h-5", text: "text-[9px]" },
  md: { container: "w-6 h-6", text: "text-[10px]" },
  lg: { container: "w-10 h-10", text: "text-sm" },
};

export default function UserAvatar({ userId, size = "md", className = "" }: Props) {
  const { avatarUrls, getUserAvatar, getUserColor } = useAuth();
  const s = sizes[size];
  const url = avatarUrls[userId];

  if (url) {
    return <img src={url} alt="" className={`${s.container} rounded-full object-cover shrink-0 ${className}`} />;
  }

  return (
    <div className={`${s.container} ${getUserColor(userId)} rounded-full flex items-center justify-center text-white ${s.text} font-bold shrink-0 ${className}`}>
      {getUserAvatar(userId)}
    </div>
  );
}
