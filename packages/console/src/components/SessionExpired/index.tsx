import { useLogto } from '@logto/react';
import { useTranslation } from 'react-i18next';

import { getCallbackUrl } from '@/consts';
import Button from '@/ds-components/Button';

import AppError from '../AppError';

import * as styles from './index.module.scss';

type Props = {
  error: Error;
};

function SessionExpired({ error }: Props) {
  const { signIn } = useLogto();
  const { t } = useTranslation(undefined, { keyPrefix: 'admin_console' });

  return (
    <AppError
      title={t('session_expired.title')}
      errorMessage={t('session_expired.subtitle')}
      callStack={error.stack}
    >
      <Button
        className={styles.retryButton}
        size="large"
        type="outline"
        title="session_expired.button"
        onClick={() => {
          void signIn(getCallbackUrl().href);
        }}
      />
    </AppError>
  );
}

export default SessionExpired;
