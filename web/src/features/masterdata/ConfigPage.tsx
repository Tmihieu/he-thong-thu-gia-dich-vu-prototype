import { Tabs, Typography } from 'antd';

import { PeriodsPage } from './PeriodsPage/PeriodsPage';
import { TariffsPage } from './TariffsPage/TariffsPage';

/** Màn "Cấu hình" của quản trị: kỳ thu và biểu giá (địa bàn, công ty bổ sung ở task sau). */
export function ConfigPage() {
  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Cấu hình
      </Typography.Title>
      <Tabs
        items={[
          { key: 'periods', label: 'Kỳ thu', children: <PeriodsPage /> },
          { key: 'tariffs', label: 'Biểu giá', children: <TariffsPage /> },
        ]}
      />
    </>
  );
}
