# 자재GO iOS 빌드 및 배포

## 준비된 항목

- Xcode 프로젝트: `mobile/ios/App/App.xcodeproj`
- 앱 이름: `자재GO`
- Bundle ID: `com.jajaego.app`
- 최소 iOS 버전: 15.0
- iPhone 및 iPad 지원
- 운영 웹 주소: `https://jajaego.com`
- 앱 복귀 URL: `jajaego://app`
- 카메라 및 사진 보관함 권한 안내
- `jajaego.com` Universal Links 및 Web Credentials entitlement
- Android와 공통으로 사용하는 Google, Kakao, Naver 로그인 복귀 처리
- 1024x1024 App Store 아이콘과 시작 화면

## Mac에서 처음 실행

저장소를 Mac으로 받은 뒤 프로젝트 루트에서 실행합니다.

```bash
npm install
npm --prefix mobile install
npm run app:assets:icon
npm run app:assets:splash
npm run app:sync:ios
npm run app:open:ios
```

Xcode가 열리면 다음 순서로 설정합니다.

1. 왼쪽 프로젝트에서 `App`을 선택합니다.
2. `TARGETS > App > Signing & Capabilities`를 엽니다.
3. `Automatically manage signing`을 켭니다.
4. 대표님 Apple Developer `Team`을 선택합니다.
5. Bundle Identifier가 `com.jajaego.app`인지 확인합니다.
6. 연결한 iPhone을 실행 대상으로 선택하고 Run을 누릅니다.

## Apple Developer와 Railway 설정

Apple Developer에서 App ID `com.jajaego.app`을 등록하고 Associated Domains
기능을 켭니다. Apple Team ID를 확인한 뒤 Railway 운영 서비스 Variables에
다음을 추가합니다.

```text
APPLE_TEAM_ID=대표님_Apple_Team_ID
IOS_APP_BUNDLE_ID=com.jajaego.app
```

저장 후 Railway를 재배포하면 아래 주소가 실제 앱 식별자를 반환합니다.

```text
https://jajaego.com/.well-known/apple-app-site-association
```

Team ID를 넣기 전에도 `jajaego://app` 방식의 로그인 복귀는 동작하지만,
Universal Links 검증은 완료되지 않습니다.

## 실기기 검수

1. Google, Kakao, Naver 가입과 로그인 후 앱으로 복귀
2. 로그인 상태에서 홈, 마이페이지, 상품, 장바구니 이동
3. 타일 사진 촬영 및 사진 보관함 업로드
4. 현장 사진 업로드와 시공 미리보기
5. 사업자등록증 및 명함 업로드
6. 외부 링크가 시스템 브라우저에서 열리는지 확인
7. 앱 종료 상태에서 `jajaego://app` 콜백으로 재실행되는지 확인
8. iPhone과 iPad 세로·가로 화면 확인

## App Store 제출

1. App Store Connect에서 새 앱을 만들고 Bundle ID를 연결합니다.
2. Xcode에서 `Product > Archive`를 실행합니다.
3. Organizer에서 `Distribute App > App Store Connect`를 선택합니다.
4. TestFlight 내부 테스트를 먼저 진행합니다.
5. 개인정보처리방침 URL, 계정삭제 경로, 심사용 테스트 계정을 입력합니다.
6. 카메라·사진·회원정보 사용 목적이 앱 설명과 심사 정보에서 일치하는지 확인합니다.

인증서, 프로비저닝 프로파일, Apple 계정 비밀번호와 App Store Connect API
키는 Git이나 앱 코드에 저장하지 않습니다.
