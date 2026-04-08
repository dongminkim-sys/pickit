// 핔잇 브랜드 카피 모음

const GREETING_TEMPLATES = [
  "{name}님, 오늘도 좋은 소재 핔해봐요.",
  "{name}님, 경쟁사가 뭘 하는지 볼까요?",
  "{name}님, 피드에서 뭐 건졌어요?",
  "{name}님, 오늘의 핔을 기대할게요.",
];

export const TOAST_MESSAGES = [
  "핔 완료! 팀이 좋아할 거예요.",
  "좋은 눈이네요. 핔 완료!",
  "이 소재, 잘 건졌어요.",
  "경쟁사가 울고 갈 소재네요.",
  "레퍼런스 +1. 기획서가 풍성해졌어요.",
  "핔 완료! 다음 소재도 기대할게요.",
];

export const EMPTY_PLATFORM_MESSAGES: Record<string, string> = {
  meta: "아직 Meta 소재가 없네요.\n첫 번째로 핔해보세요.",
  youtube: "아직 YouTube 소재가 없네요.\n첫 번째로 핔해보세요.",
  tiktok: "아직 TikTok 소재가 없네요.\n첫 번째로 핔해보세요.",
  gfa: "아직 GFA 소재가 없네요.\n첫 번째로 핔해보세요.",
};

export function getGreeting(userName: string): string {
  const template = GREETING_TEMPLATES[Math.floor(Math.random() * GREETING_TEMPLATES.length)];
  return template.replace("{name}", userName);
}

export function getToastMessage(): string {
  return TOAST_MESSAGES[Math.floor(Math.random() * TOAST_MESSAGES.length)];
}

export function getEmptyMessage(platform: string): string {
  if (platform && EMPTY_PLATFORM_MESSAGES[platform]) {
    return EMPTY_PLATFORM_MESSAGES[platform];
  }
  return "아직 핔한 소재가 없어요.\n첫 소재를 핔해보세요.";
}
