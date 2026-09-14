# 초안 5. 캔바 인쇄용 PDF 저장 설정, 명함·전단 인쇄소 맡길 때

작성일: 2026-09-14 (챌린지 13일차) / 카테고리: 캔바 실무 / 표준 v2 / 공식 출처 3개(캔바 고객센터 여백·재단 물림·재단선, 인쇄 색상, 다운로드 파일 형식)

---

**제목** (32자, 키워드 그대로)

```text
캔바 인쇄용 PDF 저장 설정 3가지, 명함 전단 인쇄소 맡기기 전에
```

**포커스 키워드**

```text
캔바 인쇄용 PDF
```

**슬러그**

```text
canva-print-pdf-settings
```

**본문 HTML — ZOOPZOOP `</> 코드` 모드에 붙여넣기** (전자책 박스·중간 링크·CTA 포함, 이모지 없음)

```html
<p><strong>캔바 인쇄용 PDF는 PDF 인쇄 형식·재단선·CMYK를 켜서 받은 파일입니다.</strong> 화면에서 예쁘게 보이던 명함이 인쇄소에서 오면 가장자리가 잘리거나 색이 탁해지는 일은 디자인 잘못이 아니라 저장 설정을 안 건드려서 생깁니다. 캔바는 "공유 → 다운로드"에서 형식만 바꾸면 인쇄소가 원하는 파일이 그대로 나오는데, 기본값이 화면용 PDF라 모르고 넘어가기 쉽습니다. 이 글은 수업에서 명함과 전단을 만든 수강생이 인쇄소에 맡기기 전에 확인하는 순서를 캔바 공식 도움말 기준으로 정리한 것입니다.</p>

<h2>핵심 요약</h2>
<ul>
  <li>다운로드 형식은 "PDF 표준"이 아니라 "PDF 인쇄"를 고릅니다. 표준은 96dpi 화면용이고, 인쇄는 300dpi에 재단선·색상 프로필 선택이 붙습니다.</li>
  <li>재단선과 재단 물림을 켜면 캔바가 사방 3.175mm를 더해 내보내므로, 배경은 끝까지 채우고 글자는 여백 안쪽에 둬야 잘리지 않습니다.</li>
  <li>CMYK 색상 프로필은 Pro 이상에서 고를 수 있고, 무료는 RGB로 내려받되 형광색·전기 파랑 같은 화면용 색을 처음부터 피하는 게 답입니다.</li>
</ul>

<h2>캔바 인쇄용 PDF와 그냥 PDF는 뭐가 다른가요?</h2>
<p>해상도와 인쇄 옵션입니다. <a href="https://www.canva.com/help/download-file-types/" target="_blank" rel="noopener">캔바 고객센터의 다운로드 파일 형식 안내</a>에 따르면 PDF 표준은 96dpi로 화면 보기용이고, PDF 인쇄는 300dpi에 재단 물림, 재단선, 색상 프로필(RGB 또는 CMYK) 선택 옵션이 함께 제공됩니다.</p>
<p>수업에서 제일 자주 보는 실수가 이것입니다. 명함을 다 만들고 "PDF"라고 쓰인 첫 번째 항목을 눌러 내려받으면 96dpi 파일이 나옵니다. 화면에서는 멀쩡한데 인쇄소는 300dpi를 요구하니 "해상도가 낮다"는 연락이 옵니다. 다시 캔바에 들어가 형식만 바꾸면 되는데, 그 사이 하루가 갑니다.</p>
<p>순서는 이렇습니다.</p>
<ol>
  <li>디자인 오른쪽 위 "공유"를 누릅니다.</li>
  <li>"다운로드"를 누르고 파일 형식 목록을 엽니다.</li>
  <li>"PDF 표준" 아래에 있는 "PDF 인쇄"를 고릅니다.</li>
  <li>아래에 나타나는 "재단선 및 여백" 체크, "색상 프로필" 선택을 확인한 뒤 다운로드합니다.</li>
</ol>
<p><strong>인쇄소에 보낼 파일은 언제나 "PDF 인쇄"입니다. 첫 번째 PDF가 아닙니다.</strong></p>
<blockquote>
  <p><a href="https://kmong.com/self-marketing/803533/YNgTd87HX2" target="_blank" rel="noopener"><strong>전자책 「비개발자의 역습」 보러 가기</strong></a><br>코딩 없이 AI 도구를 이어 붙여 앱 11개를 만든 과정을 51쪽에 담았습니다. 설정 하나 몰라서 하루를 날리는 일은 앱 만들 때도 똑같이 겪었습니다. 그 삽질 기록이 궁금하다면 이 책부터 보세요.</p>
</blockquote>

<h2>재단선과 재단 물림은 왜 켜야 하나요?</h2>
<p>종이를 자를 때 생기는 오차 때문입니다. 인쇄소는 큰 종이에 여러 장을 찍고 칼로 자르는데, 자르는 선이 조금씩 흔들립니다. 배경을 딱 끝까지만 채우면 그 오차만큼 흰 테두리가 생기고, 글자를 끝에 붙이면 잘려 나갑니다.</p>
<p><a href="https://www.canva.com/help/margins-bleed-crop-marks/" target="_blank" rel="noopener">캔바 고객센터의 여백·재단 물림·재단선 안내</a>에 따르면 캔바는 잘라내는 제품에 사방 0.125인치(3.175mm)의 재단 물림을 자동으로 더하고, 이 크기는 바꿀 수 없습니다. 재단선은 캔바 편집 화면에서는 보이지 않고 내려받은 PDF에만 표시됩니다.</p>
<p>디자인할 때 켜 둘 것은 두 가지입니다.</p>
<ul>
  <li>파일 → 설정 → "여백 표시": 점선 안쪽이 안전 구역입니다. 글자, 로고, 얼굴은 이 안에 둡니다.</li>
  <li>파일 → 설정 → "인쇄 재단 물림 표시": 가장자리 근처에 점선이 생깁니다. 배경색, 사진, 무늬는 이 점선을 넘겨 끝까지 늘립니다.</li>
</ul>
<p>재단선을 켜고 내려받으면 PDF 크기가 원래보다 커집니다. 캔바 설명대로 A4 디자인은 216×303mm가 아니라 약 222×309mm로 나옵니다. 이건 잘못된 게 아니라 잘라낼 여유를 붙인 것이니 그대로 인쇄소에 보내면 됩니다. 인쇄소가 캔바 인쇄가 아니라 동네 업체라면 재단 물림 크기를 먼저 물어보는 게 안전합니다.</p>
<p>명함처럼 한 장에 여러 개를 찍는 디자인은 <a href="https://atlia079318.zoopzoop.shop/blog/canva-bulk-create/"><strong>캔바 일괄 제작 글</strong></a>에서 만든 뒤 이 설정으로 내려받으면 100장이 한 번에 인쇄용 파일로 나옵니다.</p>
<p><strong>배경은 점선 밖까지, 글자는 점선 안쪽에. 이 한 줄이 재단 설정의 전부입니다.</strong></p>

<h2>CMYK는 꼭 골라야 하나요?</h2>
<p>인쇄소가 요구하면 골라야 하고, 무료 계정이라 못 고르면 색 선택으로 대신할 수 있습니다.</p>
<p><a href="https://www.canva.com/help/cmyk-for-print/" target="_blank" rel="noopener">캔바 고객센터의 인쇄 색상 안내</a>는 화면(RGB)과 잉크(CMYK)가 낼 수 있는 색 범위가 다르다고 설명합니다. 인쇄로 넘어갈 때 RGB 색은 가장 가까운 CMYK로 자동 변환되는데, 전기 파랑이나 형광 분홍처럼 아주 밝은 색은 인쇄로 못 내는 색이라 탁하고 흐리게 나옵니다.</p>
<p>다운로드 파일 형식 안내에 따르면 CMYK 색상 프로필 선택은 캔바 Pro, 팀, 교육, 비영리 계정에서 제공됩니다. 무료 계정은 RGB로만 내려받을 수 있습니다.</p>
<table>
  <thead>
    <tr>
      <th>계정</th>
      <th>할 수 있는 것</th>
      <th>실무 요령</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>무료</td>
      <td>PDF 인쇄, 재단선, RGB</td>
      <td>형광·네온 색을 피하고 살짝 어두운 색을 쓰면 인쇄와 화면 차이가 줄어듭니다</td>
    </tr>
    <tr>
      <td>Pro 이상</td>
      <td>위 전부 + CMYK 프로필, PDF 압축</td>
      <td>인쇄소가 CMYK를 요구하면 다운로드 창에서 색상 프로필을 CMYK로 바꿉니다</td>
    </tr>
  </tbody>
</table>
<p>캔바 자체도 CMYK 안전색을 처음부터 쓰라고 권합니다. 온라인 변환 사이트에서 CMYK 값을 HEX 코드로 바꿔 캔바 팔레트에 넣어 두면 무료 계정에서도 인쇄에 가까운 색으로 작업할 수 있습니다. 무료와 Pro의 다른 차이는 <a href="https://atlia079318.zoopzoop.shop/blog/canva-free-vs-pro/"><strong>캔바 무료 프로 차이 글</strong></a>에 정리했습니다.</p>
<p><strong>색이 탁하게 나오는 건 인쇄소 잘못이 아니라 화면용 색을 고른 탓입니다.</strong></p>

<h2>인쇄소에 보내기 전 마지막 확인은 뭘 보나요?</h2>
<p>내려받은 PDF를 열어 재단선, 여백, 글자, 색 네 가지를 눈으로 확인하고, 가능하면 한 장만 먼저 뽑아 보는 것입니다.</p>
<ol>
  <li>PDF를 열었을 때 네 모서리에 짧은 선(재단선)이 보이는지 봅니다. 없으면 "재단선 및 여백"을 안 켠 것입니다.</li>
  <li>배경이 재단선 바깥까지 채워져 있고 흰 틈이 없는지 봅니다.</li>
  <li>글자와 로고가 재단선에서 충분히 떨어져 있는지 봅니다. 캔바 인쇄 미리보기에서 빨간 구역으로 표시되면 잘릴 수 있는 자리입니다.</li>
  <li>글자가 흐리면 사진을 글자로 넣은 것입니다. 캔바 텍스트 상자로 다시 쓰면 300dpi에서 선명하게 나옵니다.</li>
  <li>캔바는 주문 전 디자인을 검수해 주지 않는다고 명시하고 있으니, 대량 인쇄 전 한 장 시험 인쇄를 권합니다.</li>
</ol>
<p>사진 위에 글자를 얹은 전단이라면 인쇄에서는 화면보다 대비가 약해집니다. 글자 뒤에 반투명 상자를 까는 요령은 <a href="https://atlia079318.zoopzoop.shop/blog/canva-text-on-photo/"><strong>캔바 사진 위 글자 글</strong></a>에 있습니다.</p>
<p><strong>대량 인쇄 전 한 장. 이게 가장 싼 보험입니다.</strong></p>

<div class="tc-faq">
  <div class="tc-faq__label">자주 묻는 질문</div>

  <details>
    <summary>무료 계정인데 인쇄소가 CMYK 파일을 달라고 해요.</summary>
    <div class="tc-faq__answer">캔바 무료는 RGB PDF만 나옵니다. 인쇄소에 "RGB PDF 인쇄 파일이고 재단선은 넣었다"고 말하면 대부분 변환해서 받아 줍니다. 꼭 CMYK 파일이 필요하면 Pro 한 달만 결제해서 내려받는 방법도 있습니다.</div>
  </details>

  <details>
    <summary>재단선을 켰더니 PDF 크기가 커졌어요. 잘못된 건가요?</summary>
    <div class="tc-faq__answer">정상입니다. 캔바가 사방 3.175mm 재단 물림을 더한 것입니다. 인쇄소가 그 여유를 잘라내니 그대로 보내면 됩니다.</div>
  </details>

  <details>
    <summary>편집 화면에서는 재단선이 안 보여요.</summary>
    <div class="tc-faq__answer">재단선은 내려받은 PDF에만 표시됩니다. 편집 중에는 파일 → 설정에서 "여백 표시"와 "인쇄 재단 물림 표시"를 켜서 점선으로 확인합니다.</div>
  </details>

  <details>
    <summary>집 프린터로 뽑을 때도 PDF 인쇄로 저장해야 하나요?</summary>
    <div class="tc-faq__answer">집 프린터는 가장자리까지 인쇄하지 않아 재단선이 필요 없습니다. PDF 표준으로도 충분하지만, 글자가 흐리게 나오면 PDF 인쇄로 다시 내려받으면 됩니다.</div>
  </details>

  <details>
    <summary>명함 100장을 이름만 바꿔 인쇄용으로 뽑을 수 있나요?</summary>
    <div class="tc-faq__answer">됩니다. 캔바 일괄 제작으로 페이지를 만든 뒤 PDF 인쇄로 한 번에 내려받으면 모든 페이지에 재단선이 붙습니다. 일괄 제작은 Pro 기능입니다.</div>
  </details>
</div>

<div class="hc-glossary">
  <div class="hc-glossary-label">핵심 용어 정리</div>

  <div class="hc-glossary-item">
    <div class="hc-glossary-term">재단 물림 (Bleed)</div>
    <div class="hc-glossary-row">
      <span class="hc-glossary-row-label">정의</span>
      <span class="hc-glossary-row-text">잘라내는 선 바깥으로 배경을 더 채워 두는 여유 영역으로, 캔바는 사방 3.175mm를 고정으로 더합니다.</span>
    </div>
    <div class="hc-glossary-row hc-glossary-easy-row">
      <span class="hc-glossary-row-label">쉽게 말하면</span>
      <span class="hc-glossary-row-text">칼이 흔들려도 흰 테두리가 안 생기게 배경을 넉넉히 깔아 두는 거예요.</span>
    </div>
  </div>

  <div class="hc-glossary-item">
    <div class="hc-glossary-term">재단선 (Crop marks)</div>
    <div class="hc-glossary-row">
      <span class="hc-glossary-row-label">정의</span>
      <span class="hc-glossary-row-text">인쇄물 네 모서리에 찍히는 짧은 선으로, 인쇄소가 어디를 자를지 알려 주며 캔바에서는 PDF 인쇄로 내려받을 때만 표시됩니다.</span>
    </div>
    <div class="hc-glossary-row hc-glossary-easy-row">
      <span class="hc-glossary-row-label">쉽게 말하면</span>
      <span class="hc-glossary-row-text">"여기서 잘라 주세요" 표시예요.</span>
    </div>
  </div>

  <div class="hc-glossary-item">
    <div class="hc-glossary-term">CMYK</div>
    <div class="hc-glossary-row">
      <span class="hc-glossary-row-label">정의</span>
      <span class="hc-glossary-row-text">청록·자홍·노랑·검정 잉크를 겹쳐 색을 만드는 인쇄용 색 체계로, 화면용 RGB보다 낼 수 있는 색 범위가 좁습니다.</span>
    </div>
    <div class="hc-glossary-row hc-glossary-easy-row">
      <span class="hc-glossary-row-label">쉽게 말하면</span>
      <span class="hc-glossary-row-text">잉크로 낼 수 있는 색이에요. 화면의 형광색은 잉크로 못 만들어요.</span>
    </div>
  </div>

  <div class="hc-glossary-item">
    <div class="hc-glossary-term">300dpi</div>
    <div class="hc-glossary-row">
      <span class="hc-glossary-row-label">정의</span>
      <span class="hc-glossary-row-text">1인치 안에 점이 300개 들어가는 인쇄 해상도로, 인쇄소가 요구하는 기준이며 캔바 PDF 인쇄 형식이 이 값으로 내보냅니다.</span>
    </div>
    <div class="hc-glossary-row hc-glossary-easy-row">
      <span class="hc-glossary-row-label">쉽게 말하면</span>
      <span class="hc-glossary-row-text">종이에 찍었을 때 안 흐릿한 정도예요. 화면용 96은 종이에서 뭉개져요.</span>
    </div>
  </div>
</div>

<p>캔바와 AI로 직접 만들어보고 싶다면 캔바×AI 클래스 문의는 <a href="http://pf.kakao.com/_MRAGX/chat" target="_blank" rel="noopener"><strong>카카오 채널</strong></a>에서 받고 있습니다. 매일 실습 팁은 <a href="https://blog.naver.com/atlia0709" target="_blank" rel="noopener"><strong>네이버 블로그 디지털다락방</strong></a>에 올리고 있고, <a href="https://atlia079318.zoopzoop.shop/blog/canva-image-size-2-3/"><strong>캔바 2:3 사이즈 공식 글</strong></a>도 함께 보시면 이해가 빠릅니다.</p>
<p>코딩 없이 AI로 앱을 만든 과정은 <a href="https://kmong.com/self-marketing/803533/YNgTd87HX2" target="_blank" rel="noopener"><strong>전자책 「비개발자의 역습」</strong></a>에 정리해 두었습니다.</p>
```

**이제 편집기에서 이것만 설정하세요**

```text
□ 포커스 키워드: 캔바 인쇄용 PDF
□ 슬러그: canva-print-pdf-settings
□ 본문 HTML 붙여넣기
□ 본문 이미지 1: 줍줍_대표이미지\본문_캔바_인쇄PDF_3설정.jpg → 첫 문단 바로 아래(핵심 요약 위)
   대체 텍스트: 캔바 인쇄용 PDF 저장 설정 3가지, PDF 인쇄 형식·재단선·CMYK
□ 본문 이미지 2: 줍줍_대표이미지\본문_캔바_인쇄PDF_재단구역.jpg → "재단선과 재단 물림은 왜 켜야 하나요?" 안 "디자인할 때 켜 둘 것" 목록 아래
   대체 텍스트: 캔바 인쇄용 PDF 재단 물림·재단선·안전 구역 위치를 명함 예시로 그린 도식
□ 대표 이미지: 이미지 1
□ 카테고리: 캔바 실무
□ 발행 한 번만 클릭
```

---

## 메모
- 제목 32자·키워드 그대로, 첫 문장 "~파일입니다"(명사 끝, 43자).
- 근거: 캔바 고객센터 3개 페이지 09-14 직접 확인(WebFetch 403 → 브라우저로 읽음). PDF 표준 96dpi / PDF 인쇄 300dpi·재단 물림·재단선·색상 프로필; 재단 물림 사방 0.125인치(3.175mm) 고정, A4 216×303 → 약 222×309mm; 재단선은 PDF에서만 표시; CMYK 프로필·PDF 압축은 Pro·팀·교육·비영리; 캔바는 주문 전 검수 안 함, 한 장 시험 인쇄 권장.
- 한국어 메뉴 명칭("재단선 및 여백", "인쇄 재단 물림 표시")은 캔바 한국어 UI 기준 표기이며 버전에 따라 다를 수 있음 → 본문에 경로를 "파일 → 설정"으로 적어 둠.
- 경험담은 "수업에서 자주 보는 실수"로만 서술(구체 수치 없음).
- 내부 링크 4개: 일괄 제작, 무료 vs 프로, 사진 위 글자, 2:3 사이즈. 글감 번호는 원래 5번(일괄 제작)이 4번 슬롯으로 발행되어 남은 5번 자리를 "인쇄용 PDF"로 채움.

- 발행 2026-09-14: https://atlia079318.zoopzoop.shop/blog/canva-print-pdf-settings/ SEO 92 / GEO 88. 이미지 2장·전자책 박스·캔바 링크 3·CTA 확인 완료.
