#!/bin/bash

# 핔잇 크롬 확장프로그램 설치 스크립트
set -e

INSTALL_DIR="$HOME/pickit-extension"

echo ""
echo "  =============================="
echo "    핔잇 크롬 확장프로그램 설치"
echo "  =============================="
echo ""

# 기존 폴더가 있으면 업데이트
if [ -d "$INSTALL_DIR" ]; then
  echo "  기존 설치를 업데이트합니다..."
  cd "$INSTALL_DIR"
  git pull --quiet
else
  echo "  다운로드 중..."
  git clone --quiet --depth 1 --filter=blob:none --sparse https://github.com/dongminkim-sys/pickit.git "$INSTALL_DIR"
  cd "$INSTALL_DIR"
  git sparse-checkout set chrome-extension
fi

EXTENSION_PATH="$INSTALL_DIR/chrome-extension"

echo ""
echo "  다운로드 완료!"
echo ""
echo "  ──────────────────────────────"
echo "  이제 크롬에서 아래 단계를 따라주세요:"
echo ""
echo "  1. 열리는 크롬 페이지에서 '개발자 모드' 켜기 (우측 상단 토글)"
echo "  2. '압축 해제된 확장 프로그램을 로드합니다' 클릭"
echo "  3. 아래 폴더를 선택:"
echo ""
echo "     $EXTENSION_PATH"
echo ""
echo "  4. 확장프로그램 팝업에서 서버 URL을 https://pickit.to 로 설정"
echo "  ──────────────────────────────"
echo ""

# 폴더 경로를 클립보드에 복사
if command -v pbcopy &> /dev/null; then
  echo "$EXTENSION_PATH" | pbcopy
  echo "  * 폴더 경로가 클립보드에 복사되었습니다!"
elif command -v xclip &> /dev/null; then
  echo "$EXTENSION_PATH" | xclip -selection clipboard
  echo "  * 폴더 경로가 클립보드에 복사되었습니다!"
fi

echo ""

# 크롬 확장프로그램 페이지 열기
if [[ "$OSTYPE" == "darwin"* ]]; then
  open -a "Google Chrome" "chrome://extensions" 2>/dev/null || open -a "Chromium" "chrome://extensions" 2>/dev/null || echo "  * 크롬에서 chrome://extensions 를 직접 열어주세요."
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  google-chrome "chrome://extensions" 2>/dev/null || chromium-browser "chrome://extensions" 2>/dev/null || xdg-open "chrome://extensions" 2>/dev/null || echo "  * 크롬에서 chrome://extensions 를 직접 열어주세요."
fi
