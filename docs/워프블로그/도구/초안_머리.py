import re, sys, os
sys.stdout.reconfigure(encoding='utf-8')
os.chdir(r"C:\Users\atlia\Desktop\huhsame-script\docs\워프블로그")
src = open('초안_31_캔바_명함만들기.md', encoding='utf-8').read()
cta = src[src.index('<p>캔바와 AI로 직접 만들어보고'):src.index('```\n\n**이제 편집기에서')]
title = "제목"
first = "첫 문장"
print(len(title), len(first))


def g(term, df, easy):
    return f'''  <div class="hc-glossary-item">
    <div class="hc-glossary-term">{term}</div>
    <div class="hc-glossary-row">
      <span class="hc-glossary-row-label">정의</span>
      <span class="hc-glossary-row-text">{df}</span>
    </div>
    <div class="hc-glossary-row hc-glossary-easy-row">
      <span class="hc-glossary-row-label">쉽게 말하면</span>
      <span class="hc-glossary-row-text">{easy}</span>
    </div>
  </div>
'''


def q(s, a):
    return f'''  <details>
    <summary>{s}</summary>
    <div class="tc-faq__answer">{a}</div>
  </details>
'''

