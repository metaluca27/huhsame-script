// 워커 주소. 로컬에서 켰을 때는 로컬 워커를, 배포된 화면에서는 배포된 워커를 부른다.
// 여기에 키는 없다. 키는 워커 안에만 있다.

const LOCAL_WORKER = 'http://localhost:8798';
const DEPLOYED_WORKER = 'https://lecture-freshness-checker.atlia0318.workers.dev';

const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);

export const API_BASE = isLocal ? LOCAL_WORKER : DEPLOYED_WORKER;
export const MAX_FILE_BYTES = 80 * 1024 * 1024;
