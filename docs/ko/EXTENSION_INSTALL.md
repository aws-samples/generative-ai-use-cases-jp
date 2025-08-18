# 브라우저 확장 프로그램 설치 방법

브라우저 확장 프로그램은 브라우저에 설치한 후 사용할 수 있습니다. 여기서는 브라우저에서의 설치 절차를 설명합니다.

## 설치 대상

- 직접 빌드한 경우
  - 빌드 출력인 `browser-extension/dist/` 폴더 아래의 모든 내용이 설치 대상입니다.
- 배포된 zip 파일이나 기타 압축 파일을 사용하는 경우
  - 압축 파일을 압축 해제하고 임의의 위치에 저장합니다.
  - 압축 해제된 폴더 아래의 모든 내용이 설치 대상입니다.

## 설치 방법

### Google Chrome의 경우

우측 상단의 브라우저 메뉴를 열고 "확장 프로그램 관리" 화면을 엽니다.
![Chrome 메뉴](../assets/images/extension/chrome_menu.png)
![Chrome 확장 프로그램 메뉴](../assets/images/extension/chrome_extension_menu.png)

"확장 프로그램" 관리 화면을 연 후 "개발자 모드"를 `ON`으로 설정합니다.
![Chrome 개발자 모드](../assets/images/extension/chrome_dev_mode.png)

"개발자 모드"가 `ON`으로 설정되면 "압축해제된 확장 프로그램을 로드합니다"라는 버튼이 나타나므로 클릭합니다.
![Chrome 설치](../assets/images/extension/chrome_install.png)

폴더 선택 창이 나타나므로 이 절차 문서에서 표시한 "설치 대상" 폴더를 선택합니다.
![파일 선택](../assets/images/extension/file_choose.png)

설치가 완료되면 확장 프로그램 목록에 나타납니다.
![Chrome 설치 완료](../assets/images/extension/chrome_installed.png)

### Microsoft Edge의 경우

화면 상단의 확장 프로그램 버튼으로 메뉴를 열고 "확장 관리" 화면을 엽니다.
![Edge 메뉴](../assets/images/extension/edge_menu.png)

"확장 프로그램" 관리 화면을 연 후 "개발자 모드"를 `ON`으로 설정합니다.
![Edge 개발자 모드](../assets/images/extension/edge_dev_mode.png)

"개발자 모드"가 `ON`으로 설정되면 "압축을 푼 항목 로드"라는 버튼이 나타나므로 클릭합니다.
![Edge 설치](../assets/images/extension/edge_install.png)

폴더 선택 창이 나타나므로 이 절차 문서에서 표시한 "설치 대상" 폴더를 선택합니다.
![파일 선택](../assets/images/extension/file_choose.png)

설치가 완료되면 확장 프로그램 목록에 나타납니다.
![Edge 설치 완료](../assets/images/extension/edge_installed.png)

## 사용 방법

설치가 성공하면 임의의 웹사이트에서 텍스트를 선택할 때 아래와 같이 "GenU Extension"을 표시하는 팝업이 나타납니다. 이를 클릭하면 선택한 텍스트가 자동으로 복사되고 확장 프로그램이 실행됩니다.
![팝업 표시](../assets/images/extension/extension_popup.png)

웹사이트의 구조에 따라 팝업이 나타나지 않을 수 있습니다. 그런 경우 우클릭하여 메뉴를 표시하고 "GenU Extension"을 클릭하여 실행합니다. 이 작업도 선택한 텍스트를 자동으로 복사합니다.
![컨텍스트 메뉴](../assets/images/extension/extension_context_menu.png)

텍스트를 선택하지 않고 우클릭하면 "GenU Extension 열기"를 표시하는 메뉴가 나타납니다. 이 경우 텍스트를 복사하지 않고 확장 프로그램이 열립니다.
![컨텍스트 메뉴](../assets/images/extension/extension_context_menu_default.png)

첫 실행 시 로그인 화면이 표시됩니다. GenU 웹 앱과 동일한 인증을 사용하므로 동일한 로그인 정보로 로그인하세요.
![로그인 화면](../assets/images/extension/extension_login.png)

## 제거 방법

### Google Chrome의 경우

설치 방법과 동일한 절차로 "확장 프로그램" 관리 화면을 엽니다. 제거하려는 확장 프로그램의 "제거" 버튼을 클릭합니다.

![Chrome 제거](../assets/images/extension/chrome_delete.png)

### Microsoft Edge의 경우

설치 방법과 동일한 절차로 "확장 프로그램" 관리 화면을 엽니다. 제거하려는 확장 프로그램의 "제거" 버튼을 클릭합니다.
![Edge 제거](../assets/images/extension/edge_delete.png)
