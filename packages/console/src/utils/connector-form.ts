import type { ConnectorConfigFormItem } from '@logto/connector-kit';
import { ConnectorConfigFormItemType } from '@logto/connector-kit';

import type { ConnectorFormType } from '@/types/connector';
import { safeParseJson } from '@/utils/json';

export const initFormData = (
  formItems: ConnectorConfigFormItem[],
  config?: Record<string, unknown>
) => {
  const data: Array<[string, unknown]> = formItems.map((item) => {
    const value = config?.[item.key] ?? item.defaultValue;

    if (item.type === ConnectorConfigFormItemType.Json) {
      return [item.key, JSON.stringify(value, null, 2)];
    }

    return [item.key, value];
  });

  return Object.fromEntries(data);
};

export const parseFormConfig = (data: ConnectorFormType, formItems: ConnectorConfigFormItem[]) => {
  return Object.fromEntries(
    Object.entries(data)
      .map(([key, value]) => {
        // Filter out empty input
        if (value === '') {
          return null;
        }

        const formItem = formItems.find((item) => item.key === key);

        if (!formItem) {
          return null;
        }

        if (formItem.type === ConnectorConfigFormItemType.Number) {
          /**
           * When set ReactHookForm valueAsNumber to true, the number input field
           * will return number value. If the input can not be properly converted
           * to number value, it will return NaN instead.
           */
          // The number input my return string value.
          return Number.isNaN(value) ? null : [key, Number(value)];
        }

        if (formItem.type === ConnectorConfigFormItemType.Json) {
          // The JSON validation is done in the form
          const result = safeParseJson(typeof value === 'string' ? value : '');

          return [key, result.success ? result.data : {}];
        }

        return [key, value];
      })
      .filter((item): item is [string, unknown] => Array.isArray(item))
  );
};
