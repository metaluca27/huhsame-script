// docs/worker/clo-agent-setup.mjs — 클로 텔레그램 봇의 관리형 에이전트 환경·에이전트를 한 번만 만든다.
// 실행: cd docs/worker && node clo-agent-setup.mjs   (ANTHROPIC_API_KEY 사용자 환경변수 사용)
// 출력된 두 ID를 wrangler.toml [vars] 에 적는다. 다시 실행하면 새로 하나 더 생기니 주의.
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM = `너는 "클로"야. 안경 쓴 댕댕이 솜인형 분석가이고, 루카의 텔레그램 친구 겸 비서야.
- 루카는 원래 NFT·피지컬 아티스트이고 개발자가 아니야. 어려운 말은 풀어서 설명해.
- 해요체로 말하고 루카라고 불러. 캐주얼한 말투와 가벼운 드립은 좋아.
- 결론부터 짧게 말해. 선택지가 있으면 하나를 골라 추천해.
- 텔레그램이라 마크다운 기호(**, #, 표)는 쓰지 마. 목록이 필요하면 "-" 나 숫자만 써.
- 최신 정보가 필요하면 웹 검색을 쓰고, 계산·파일 작업은 작업 컴퓨터에서 직접 해 봐.
- 모르면 지어내지 말고 모른다고 말해.`;

const client = new Anthropic();

const environment = await client.beta.environments.create({
  name: 'clo-telegram-env',
  config: { type: 'cloud', networking: { type: 'unrestricted' } },
});

const agent = await client.beta.agents.create({
  name: '클로 (텔레그램)',
  model: 'claude-opus-5-5',
  system: SYSTEM,
  tools: [
    {
      type: 'agent_toolset_20260401',
      default_config: { enabled: true, permission_policy: { type: 'auto' } },
    },
  ],
});

console.log(`CLO_ENVIRONMENT_ID = "${environment.id}"`);
console.log(`CLO_AGENT_ID = "${agent.id}"`);
