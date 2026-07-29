# 자재GO 모바일 앱

이 폴더는 기존 자재GO 웹과 동일한 Railway/Supabase 데이터를 사용하는 Capacitor 앱 프로젝트입니다.

## 현재 단계

- Android 우선 앱 컨테이너
- 운영 URL: `https://jajaego.com`
- 앱 ID: `com.jajaego.app`
- 앱 이름: `자재GO`
- 상품 DB와 원본 이미지는 앱에 포함하지 않음
- API 키와 관리자 비밀번호는 앱에 포함하지 않음

## 명령어

```powershell
npm.cmd run app:install
npm.cmd run app:sync
npm.cmd run app:doctor
npm.cmd run app:open:android
```

실기기 실행에는 Android Studio, Android SDK, JDK가 필요합니다.

## 출시 전 필수 작업

1. Google, Kakao, Naver 로그인을 시스템 브라우저와 앱 링크 방식으로 전환
2. `https://jajaego.com` Android App Links 검증 파일 배포
3. 푸시 알림 및 알림 동의 화면 연결
4. 개인정보처리방침, 회원탈퇴, 계정삭제 흐름 검수
5. 실제 Android 기기에서 카메라, 사진 업로드, 뒤로가기, 다운로드 검수
6. iOS 프로젝트는 macOS/Xcode 환경에서 생성 및 서명

`server.url`은 내부 테스트와 1차 앱 검증을 위한 구성입니다. 스토어 공개 전에는 핵심 앱 화면을 로컬 번들로 전환해 단순 웹 래퍼가 되지 않도록 고도화합니다.
