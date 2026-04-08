export const PLATFORMS = [
  { value: "meta", label: "Meta", icon: "M", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "youtube", label: "YouTube", icon: "Y", color: "bg-red-100 text-red-700 border-red-200" },
  { value: "tiktok", label: "TikTok", icon: "T", color: "bg-gray-100 text-gray-800 border-gray-300" },
  { value: "gfa", label: "GFA", icon: "N", color: "bg-green-100 text-green-700 border-green-200" },
] as const;

export const CATEGORIES = [
  "뷰티",
  "패션",
  "건강기능식품",
  "식품",
  "생활용품",
  "전자기기",
  "교육",
  "금융",
  "앱/서비스",
  "기타",
] as const;

export const PLATFORM_HAS_DATA = {
  meta: true,
  youtube: true,
  tiktok: true,
  gfa: false,
} as const;

export const AVATAR_COLOR_OPTIONS = [
  { value: "bg-blue-500", label: "파랑" },
  { value: "bg-emerald-500", label: "초록" },
  { value: "bg-purple-500", label: "보라" },
  { value: "bg-orange-500", label: "주황" },
  { value: "bg-pink-500", label: "분홍" },
  { value: "bg-cyan-500", label: "하늘" },
  { value: "bg-rose-500", label: "장미" },
  { value: "bg-amber-500", label: "호박" },
  { value: "bg-teal-500", label: "청록" },
  { value: "bg-indigo-500", label: "남색" },
];

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "-";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function platformLabel(value: string): string {
  return PLATFORMS.find((p) => p.value === value)?.label || value;
}

export function platformColor(value: string): string {
  return PLATFORMS.find((p) => p.value === value)?.color || "bg-gray-100 text-gray-600";
}

const CATEGORY_COLORS: Record<string, string> = {
  "뷰티": "bg-pink-100 text-pink-700",
  "패션": "bg-violet-100 text-violet-700",
  "건강기능식품": "bg-emerald-100 text-emerald-700",
  "식품": "bg-orange-100 text-orange-700",
  "생활용품": "bg-cyan-100 text-cyan-700",
  "전자기기": "bg-slate-100 text-slate-700",
  "교육": "bg-blue-100 text-blue-700",
  "금융": "bg-yellow-100 text-yellow-700",
  "앱/서비스": "bg-indigo-100 text-indigo-700",
  "기타": "bg-gray-100 text-gray-600",
};

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] || "bg-gray-100 text-gray-600";
}
