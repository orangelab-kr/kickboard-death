import 'dayjs/locale/ko';
import { Handler } from 'aws-lambda';
import dayjs, { Dayjs } from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import {
  KickboardDoc,
  KickboardModel,
  KickboardQueryDisconnected,
  KickboardQueryLookupStatus,
  KickboardQueryReconnected,
  logger,
  MongoDB,
  Webhook,
} from '.';

export * from './models';
export * from './queries';
export * from './tools';

dayjs.locale('ko');
dayjs.extend(localizedFormat);

export const handler: Handler = async (event, context) => {
  const deadlineDate = dayjs().subtract(30, 'minutes');
  logger.info('[Main] 시스템을 시작합니다.');
  await MongoDB.init();

  const reconnectedKickboards = await getReconnectedKickboard(deadlineDate);
  await setKickboardDisconnectStatus(reconnectedKickboards, null);
  for (const { kickboardCode, kickboardId, status } of reconnectedKickboards) {
    const { createdAt, gps }: any = status;
    const formatDate = dayjs(createdAt).format('LLL');
    logger.info(`[Main] ${kickboardCode} 킥보드가 살아났습니다. ${formatDate}`);
    const params = `${kickboardCode},${gps.latitude},${gps.longitude}`;
    await Webhook.send(`😎 킥보드가 살아나따!
    
  · 킥보드 코드: ${kickboardCode}
  · 킥보드 IMEI: ${kickboardId}
  · 마지막 업데이트: ${formatDate}
  · 킥보드 좌표: https://map.kakao.com/link/map/${params}
  · 관리자 URL: https://console.firebase.google.com/u/0/project/hikick-dfcb5/firestore/data/~2Fkick~2F${kickboardId}`);
  }

  const disconnectedKickboard = await getDisconnectedKickboard(deadlineDate);
  await setKickboardDisconnectStatus(disconnectedKickboard, new Date());
  for (const { kickboardCode, kickboardId, status } of disconnectedKickboard) {
    const { createdAt, gps }: any = status;
    const formatDate = dayjs(createdAt).format('LLL');
    const params = `${kickboardCode},${gps.latitude},${gps.longitude}`;
    logger.info(`[Main] ${kickboardCode} 킥보드가 죽었습니다. ${formatDate}`);
    await Webhook.send(`🩸 킥보드가 주거따!
    
  · 킥보드 코드: ${kickboardCode}
  · 킥보드 IMEI: ${kickboardId}
  · 마지막 업데이트: ${formatDate}
  · 사용자 좌표: https://map.kakao.com/link/map/${params}
  · 관리자 URL: https://console.firebase.google.com/u/0/project/hikick-dfcb5/firestore/data/~2Fkick~2F${kickboardId}`);
  }
};

async function getDisconnectedKickboard(
  deadlineDate: Dayjs
): Promise<KickboardDoc[]> {
  return KickboardModel.aggregate([
    ...KickboardQueryLookupStatus(),
    ...KickboardQueryDisconnected(deadlineDate.toDate()),
  ]);
}

async function getReconnectedKickboard(
  deadlineDate: Dayjs
): Promise<KickboardDoc[]> {
  return KickboardModel.aggregate([
    ...KickboardQueryLookupStatus(),
    ...KickboardQueryReconnected(deadlineDate.toDate()),
  ]);
}

async function setKickboardDisconnectStatus(
  kickboards: KickboardDoc[],
  disconnectedAt: Date | null
): Promise<void> {
  const $in = kickboards.map(({ _id }) => _id);
  await KickboardModel.updateMany({ _id: { $in } }, { disconnectedAt });
}
