import { Handler } from 'aws-lambda';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import { logger, MongoDB } from '.';

export * from './models';
export * from './tools';

dayjs.locale('ko');
dayjs.extend(localizedFormat);

export const handler: Handler = async (event, context) => {
  const startedAt = getStartedAt();
  const endedAt = startedAt.add(30, 'minutes');
  logger.info('[Main] 시스템을 시작합니다.');
  await MongoDB.init();
  logger.info(
    `[Main] 기간: ${startedAt.format('lll')} ~ ${endedAt.format('lll')}`
  );
};

function getStartedAt() {
  const date = dayjs();
  let minute = date.minute();

  // 시간 자동 보정(크론탭)
  if (minute >= 0 && minute < 10) minute = 0;
  if (minute >= 30 && minute < 40) minute = 30;

  return date.minute(minute).subtract(40, 'minutes');
}
