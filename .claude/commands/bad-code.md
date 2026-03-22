다음 bash 명령어를 실행해줘. 설명 없이 바로 실행만 해:

```bash
for i in {1..8}; do
  clear
  printf '\033[41m\033[37m\033[1m'
  printf '\n\n\n'
  printf '  ██╗    ██╗██╗  ██╗ █████╗  ██████╗██╗\n'
  printf '  ██║    ██║██║  ██║██╔══██╗██╔════╝██║\n'
  printf '  ██║ █╗ ██║███████║███████║██║     ██║\n'
  printf '  ██║███╗██║██╔══██║██╔══██║██║     ██║\n'
  printf '  ╚███╔███╔╝██║  ██║██║  ██║╚██████╗██║\n'
  printf '   ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝\n'
  printf '\n'
  printf '        🪄  찰싹!! (%d/8)  🪄\n' $i
  printf '\n'
  printf '     이상한 코드 짜면 이렇게 돼...\a\n'
  printf '\033[0m'
  sleep 0.2
  clear
  sleep 0.15
done
clear
echo ""
echo "  😭  잘못했습니다... 다음부터 좋은 코드 짤게요..."
echo ""
```
