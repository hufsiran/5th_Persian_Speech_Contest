# 제5회 페르시아어 말하기대회 자료집 뷰어

원본 PDF를 브라우저에서 선명하게 렌더링하는 정적 웹 뷰어입니다. 별도 서버나 데이터베이스 없이 GitHub Pages에 바로 배포할 수 있습니다.

원본의 가로 펼침면은 왼쪽·오른쪽 한 바닥으로 나누어 표시합니다. 표지와 뒤표지는 그대로 유지하며 PC와 모바일 모두 한 바닥씩 이동합니다. 페이지 입력란은 원본 PDF 장 번호가 아닌 분할된 뷰어 순서입니다. 좌측 상단에는 제공된 학과 50주년 로고를 사용합니다.

## 포함 기능

- 앞/뒤, 처음/마지막 페이지 이동
- 페이지 번호 직접 입력
- 책장을 넘기는 듯한 전환 효과
- 60%~240% 확대/축소 및 화면 맞춤
- 키보드(방향키, Page Up/Down, Home/End, `+`/`-`/`0`) 조작
- 모바일 스와이프와 반응형 화면

## 로컬에서 확인하기

프로젝트 폴더에서 아래 명령을 실행한 뒤 표시된 주소를 브라우저에서 엽니다.

```bash
python3 -m http.server 8080 --directory dist
```

`http://localhost:8080`

Python 실행 환경이 없다면 macOS 기본 Ruby로도 확인할 수 있습니다.

```bash
ruby -run -e httpd dist -p 8080 -b 127.0.0.1
```

> `index.html`을 파일로 직접 열지 말고 로컬 서버를 사용하세요. 브라우저 보안 정책 때문에 PDF 모듈 로딩이 막힐 수 있습니다.

## 자료집 교체하기

1. 새 PDF를 `dist/assets/persian-speech-contest-booklet.pdf`에 덮어씁니다.
2. 파일명을 바꾸려면 `dist/viewer.js`의 `PDF_URL`도 같은 경로로 수정합니다.
3. 로컬에서 첫 페이지, 중간 페이지, 마지막 페이지와 확대/축소를 확인합니다.

## GitHub에 올리기

```bash
git init
git add .
git commit -m "Add Persian speech contest booklet viewer"
git branch -M main
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

이미 Git 저장소라면 `git init`과 `git remote add` 단계는 생략합니다.

## GitHub Pages 배포하기

이 저장소는 GitHub Actions로 `dist/` 폴더를 자동 배포하도록 준비되어 있습니다.

1. GitHub 저장소의 **Settings → Pages**로 이동합니다.
2. **Build and deployment → Source**를 **GitHub Actions**로 선택합니다.
3. `main` 브랜치에 push하면 배포가 시작됩니다.
4. 저장소의 **Actions** 탭에서 완료 여부를 확인합니다.

일반적인 주소는 `https://USERNAME.github.io/REPOSITORY/`입니다.

## 파일 구성

```text
dist/
  assets/persian-speech-contest-booklet.pdf  원본 자료집
  index.html                                  화면 구조
  styles.css                                  표지 기반 색상과 반응형 스타일
  viewer.js                                   PDF 렌더링 및 뷰어 기능
  .nojekyll                                   GitHub Pages 정적 파일 설정
.github/workflows/pages.yml                   GitHub Pages 자동 배포
```

## 기술 메모

- PDF 렌더링은 고정 버전의 Mozilla PDF.js를 jsDelivr CDN에서 불러옵니다.
- 완전한 오프라인 배포가 필요하면 PDF.js 배포 파일을 `dist/vendor/`에 내려받고 `viewer.js`의 import 및 worker 경로를 로컬 파일로 바꾸면 됩니다.
- PDF에 저작권·개인정보가 포함되어 있다면 공개 저장소와 공개 Pages 사용 전에 배포 권한을 확인하세요.
