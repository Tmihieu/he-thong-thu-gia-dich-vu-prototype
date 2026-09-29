import { Tabs, Typography } from 'antd';

import { CompaniesPage } from './CompaniesPage/CompaniesPage';
import { PeriodsPage } from './PeriodsPage/PeriodsPage';
import { TariffsPage } from './TariffsPage/TariffsPage';

/** Màn "Cấu hình" của quản trị: kỳ thu, biểu giá, công ty & địa bàn công ty phụ trách. */
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
          { key: 'companies', label: 'Công ty & địa bàn', children: <CompaniesPage admin /> },
        ]}
      />
    </>
  );
}
